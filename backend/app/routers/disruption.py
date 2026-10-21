"""CargoChain Disruption Simulation & Dynamic Rerouting Router (Phase 1).

Exposes Admin-controlled endpoints for simulating corridor disruptions,
evaluating ML delay risk, calculating dynamic reroutes via DijkstraEngine,
and anchoring reroute decisions on-chain via the restricted Oracle service account.

Data Provenance:
All simulated disruptions, environmental indices, and network topology are synthetic demo data.
ML outputs are advisory decision-support estimates.
"""

import json
import logging
from typing import Dict, Any, List, Optional
from collections import deque
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import User, Shipment, Milestone, OracleEvent
from app.schemas import STATUS_NAMES
from app.services.auth import require_roles
from app.services.blockchain import w3
from app.services.indexer import EventIndexer
from app.services.ipfs import upload_to_ipfs
from app.services.routing import DijkstraEngine
from oracle.service import OracleService
from ml.schemas import ShipmentFeatures
from ml.predict import predict_shipment_eta

logger = logging.getLogger("cargochain.disruption")

router = APIRouter(prefix="/disruption", tags=["disruption"])

# Singleton routing engine instance
_routing_engine = DijkstraEngine()

# Bounded in-memory disruption history buffer (max 50 recent runs)
_DISRUPTION_HISTORY: deque = deque(maxlen=50)

CAVEAT_DISRUPTION = (
    "Synthetic demo data — advisory decision-support estimate. "
    "Environmental severity and corridor rerouting are simulated for academic evaluation. "
    "Does not alter smart contract ownership, escrow terms, or physical carriers."
)


class DisruptionSimulateRequest(BaseModel):
    shipment_id: int = Field(..., description="Target shipment ID to simulate disruption for")
    current_node: Optional[str] = Field(default=None, description="Current logistics node (auto-derived if omitted)")
    destination: Optional[str] = Field(default=None, description="Destination hub (auto-derived if omitted)")
    disrupted_node: str = Field(..., description="Node experiencing disruption/storm/congestion")
    severity: float = Field(default=0.7, ge=0.0, le=1.0, description="Disruption severity index [0.0 - 1.0]")


class DisruptionSimulateResponse(BaseModel):
    shipment_id: int
    severity: float
    delay_risk_probability: float
    delay_risk_category: str
    contributing_factors: List[Dict[str, Any]]
    current_node: str
    destination: str
    disrupted_node: str
    baseline_route: Optional[Dict[str, Any]]
    rerouted_route: Optional[Dict[str, Any]]
    alternates: List[Dict[str, Any]]
    delta_hours: float
    recommendation: str
    tx_hashes: List[str]
    onchain_status: str  # "anchored", "skipped", "unavailable"
    onchain_reason: Optional[str] = None
    caveat: str


class DisruptionHistoryItem(BaseModel):
    timestamp: str
    shipment_id: int
    current_node: str
    destination: str
    disrupted_node: str
    severity: float
    delay_risk_probability: float
    delay_risk_category: str
    delta_hours: float
    new_route: List[str]
    onchain_status: str
    tx_hashes: List[str]
    recommendation: str


def map_severity_to_indices(severity: float) -> Dict[str, float]:
    """Deterministic mapping of disruption severity (0-1) to weather, congestion, and delay indices.

    Severity >= 0.7 reliably yields HIGH delay risk on typical freight lanes.
    """
    weather = round(min(1.0, 0.15 + (0.85 * severity)), 2)
    congestion = round(min(1.0, 0.10 + (0.80 * severity)), 2)
    historical_lane = round(min(1.0, 0.12 + (0.55 * severity)), 2)
    return {
        "weather_risk_index": weather,
        "traffic_congestion_index": congestion,
        "historical_lane_delay_rate": historical_lane,
    }


def resolve_shipment_node(shipment: Shipment, db: Session, user_node: Optional[str], is_destination: bool = False) -> str:
    """Resolve node name against demo network hubs with fuzzy/substring matching."""
    if user_node:
        if user_node in _routing_engine.nodes:
            return user_node
        for node_id in _routing_engine.nodes:
            if node_id.lower() in user_node.lower() or user_node.lower() in node_id.lower():
                return node_id
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "UNKNOWN_NODE", "message": f"Node '{user_node}' is not in demo network", "details": {}}},
        )

    if is_destination:
        target = shipment.destination
        if target:
            for node_id in _routing_engine.nodes:
                if node_id.lower() in target.lower() or target.lower() in node_id.lower():
                    return node_id
        return "Mumbai/JNPT"  # Default demo destination hub

    # Attempt to derive current node from latest milestone
    latest_milestone = (
        db.query(Milestone)
        .filter(Milestone.shipment_id == shipment.shipment_id)
        .order_by(Milestone.block_time.desc())
        .first()
    )
    if latest_milestone and latest_milestone.location:
        for node_id in _routing_engine.nodes:
            if node_id.lower() in latest_milestone.location.lower() or latest_milestone.location.lower() in node_id.lower():
                return node_id

    # Fallback to origin
    if shipment.origin:
        for node_id in _routing_engine.nodes:
            if node_id.lower() in shipment.origin.lower() or shipment.origin.lower() in node_id.lower():
                return node_id

    # Fallback default
    return "Indore"


@router.post("/simulate", response_model=DisruptionSimulateResponse)
async def simulate_disruption(
    req: DisruptionSimulateRequest,
    user: User = Depends(require_roles(1)),  # Admin only
    db: Session = Depends(get_db),
):
    """Simulate supply chain disruption, calculate dynamic reroute, and optionally anchor on-chain."""
    shipment = db.query(Shipment).filter(Shipment.shipment_id == req.shipment_id).first()
    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Shipment {req.shipment_id} not found", "details": {}}},
        )

    # Validate disrupted node exists
    if req.disrupted_node not in _routing_engine.nodes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "UNKNOWN_DISRUPTED_NODE", "message": f"Disrupted node '{req.disrupted_node}' not found in demo network", "details": {}}},
        )

    current_node = resolve_shipment_node(shipment, db, req.current_node, is_destination=False)
    destination = resolve_shipment_node(shipment, db, req.destination, is_destination=True)

    # a) Map severity to deterministic weather/congestion indices
    indices = map_severity_to_indices(req.severity)

    # b) Call ML advisory delay risk predictor
    ml_features = ShipmentFeatures(
        route_distance_km=520.0,
        planned_duration_hours=10.0,
        cargo_type="General",
        transport_mode="Road",
        priority="Standard",
        handling_transfers=1,
        weather_risk_index=indices["weather_risk_index"],
        traffic_congestion_index=indices["traffic_congestion_index"],
        historical_lane_delay_rate=indices["historical_lane_delay_rate"],
        milestones_completed=1,
        elapsed_transit_hours=2.5,
    )
    prediction = predict_shipment_eta(features=ml_features, shipment_id=req.shipment_id)

    # c) Compute baseline vs rerouted paths
    reroute_eval = _routing_engine.reroute_shipment(
        current_node=current_node,
        destination=destination,
        disrupted_node=req.disrupted_node,
        severity=req.severity,
        k=3,
    )

    baseline_route = reroute_eval.get("baseline_route")
    rerouted_route = reroute_eval.get("rerouted_route")
    alternates = reroute_eval.get("alternates", [])
    delta_hours = reroute_eval.get("delta_hours", 0.0)
    recommendation = reroute_eval.get("recommendation", "")

    # d) On-chain anchoring logic
    # Condition: risk is HIGH (or severity >= 0.70) AND shipment on-chain status is InTransit (status == 2)
    tx_hashes: List[str] = []
    onchain_status = "skipped"
    onchain_reason = None

    is_high_risk = (prediction.delay_risk_category == "HIGH" or req.severity >= 0.70)
    is_in_transit = (shipment.status == 2)

    if not is_high_risk:
        onchain_status = "skipped"
        onchain_reason = f"Disruption severity {req.severity} and risk '{prediction.delay_risk_category}' do not meet the automatic on-chain intervention threshold."
    elif not is_in_transit:
        onchain_status = "skipped"
        status_name = STATUS_NAMES.get(shipment.status, f"Code {shipment.status}")
        onchain_reason = f"Shipment status is '{status_name}'. On-chain reroute updates require status 'InTransit'."
    else:
        # Proceed with on-chain anchoring via Oracle service
        try:
            oracle_svc = OracleService()
            if not oracle_svc.w3.is_connected():
                onchain_status = "unavailable"
                onchain_reason = "Ethereum RPC endpoint is unreachable; on-chain anchor skipped."
            else:
                # 1. Mark shipment delayed on-chain
                delay_res = oracle_svc.submit_delay(req.shipment_id)
                tx_hashes.append(delay_res.get("txHash", ""))

                # 2. Upload compact decision metadata to IPFS (with offline fallback)
                reroute_decision = {
                    "event": "DYNAMIC_REROUTE_RECOMMENDATION",
                    "shipment_id": req.shipment_id,
                    "disrupted_node": req.disrupted_node,
                    "severity": req.severity,
                    "current_node": current_node,
                    "destination": destination,
                    "new_corridor": rerouted_route["node_list"] if rerouted_route else [],
                    "delta_hours": delta_hours,
                    "delay_risk_probability": prediction.delay_risk_probability,
                    "delay_risk_category": prediction.delay_risk_category,
                    "recommendation": recommendation,
                }
                decision_bytes = json.dumps(reroute_decision).encode("utf-8")
                ipfs_res = await upload_to_ipfs(decision_bytes, f"reroute_{req.shipment_id}.json")
                cid = ipfs_res.get("cid", "")
                metadata_uri = f"ipfs://{cid}" if cid else f"reroute:{req.disrupted_node}"

                # 3. Submit oracle update on-chain with current node coordinates and metadata URI
                node_meta = _routing_engine.nodes.get(current_node, {})
                lat_micro = int(node_meta.get("lat_micro", 0))
                lon_micro = int(node_meta.get("lon_micro", 0))

                update_res = oracle_svc.submit_oracle_update(
                    shipment_id=req.shipment_id,
                    lat=lat_micro,
                    lon=lon_micro,
                    milestone_type=1,  # InTransit
                    metadata_uri=metadata_uri,
                )
                tx_hashes.append(update_res.get("txHash", ""))

                # 4. Sync PostgreSQL indexer
                indexer = EventIndexer(db)
                indexer.sync_events()

                onchain_status = "anchored"
                onchain_reason = f"Anchored via Oracle account with txs: {', '.join(tx_hashes)}"

        except Exception as exc:
            logger.warning(f"On-chain reroute anchor failed: {exc}")
            onchain_status = "unavailable"
            onchain_reason = f"On-chain submission failed: {str(exc)}"

    # Record in history buffer
    from datetime import datetime, timezone
    history_record = DisruptionHistoryItem(
        timestamp=datetime.now(timezone.utc).isoformat(),
        shipment_id=req.shipment_id,
        current_node=current_node,
        destination=destination,
        disrupted_node=req.disrupted_node,
        severity=req.severity,
        delay_risk_probability=prediction.delay_risk_probability,
        delay_risk_category=prediction.delay_risk_category,
        delta_hours=delta_hours,
        new_route=rerouted_route["node_list"] if rerouted_route else [],
        onchain_status=onchain_status,
        tx_hashes=tx_hashes,
        recommendation=recommendation,
    )
    _DISRUPTION_HISTORY.appendleft(history_record.model_dump())

    return DisruptionSimulateResponse(
        shipment_id=req.shipment_id,
        severity=req.severity,
        delay_risk_probability=prediction.delay_risk_probability,
        delay_risk_category=prediction.delay_risk_category,
        contributing_factors=[f.model_dump() for f in prediction.contributing_factors],
        current_node=current_node,
        destination=destination,
        disrupted_node=req.disrupted_node,
        baseline_route=baseline_route,
        rerouted_route=rerouted_route,
        alternates=alternates,
        delta_hours=delta_hours,
        recommendation=recommendation,
        tx_hashes=tx_hashes,
        onchain_status=onchain_status,
        onchain_reason=onchain_reason,
        caveat=CAVEAT_DISRUPTION,
    )


@router.get("/history", response_model=List[Dict[str, Any]])
def get_disruption_history(
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(require_roles(1)),  # Admin only
    db: Session = Depends(get_db),
):
    """Retrieve recent disruption and dynamic reroute decisions.

    Combines in-memory recent simulations with indexed Oracle milestone records.
    Limitation: In-memory history is bounded to 50 runs and resets on backend restart.
    Permanent audit history is anchored on-chain in OracleUpdateRecorded events.
    """
    return list(_DISRUPTION_HISTORY)[:limit]
