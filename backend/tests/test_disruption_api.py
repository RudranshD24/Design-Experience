"""Tests for Disruption & Dynamic Rerouting API (FR-RER-03)."""

from unittest.mock import MagicMock, patch
import pytest
from app.models.entities import Shipment, User
from tests.conftest import auth_header_for


@pytest.fixture
def test_shipment_in_transit(db_session, wallets):
    shipper_addr = wallets["shipper"].address.lower()
    transporter_addr = wallets["transporter"].address.lower()
    receiver_addr = wallets["receiver"].address.lower()

    s = Shipment(
        shipment_id=101,
        external_ref="0x" + "a" * 64,
        status=2,  # InTransit
        product_description="Solar Panels",
        quantity=500,
        origin="Indore",
        destination="Mumbai/JNPT",
        dest_lat=18950000,
        dest_lon=72950000,
        geofence_radius_m=1000,
        shipper=shipper_addr,
        transporter=transporter_addr,
        receiver=receiver_addr,
        current_custodian=transporter_addr,
        expected_delivery=1800000000,
        payment_amount=1000000000000000000,
        created_block=10,
        created_tx_hash="0x" + "aa" * 32,
    )
    db_session.add(s)
    db_session.commit()
    return s


@pytest.fixture
def test_shipment_accepted(db_session, wallets):
    shipper_addr = wallets["shipper"].address.lower()
    transporter_addr = wallets["transporter"].address.lower()
    receiver_addr = wallets["receiver"].address.lower()

    s = Shipment(
        shipment_id=102,
        external_ref="0x" + "b" * 64,
        status=1,  # Accepted (not yet InTransit)
        product_description="Automotive Spares",
        quantity=200,
        origin="Indore",
        destination="Pune",
        dest_lat=18520400,
        dest_lon=73856700,
        geofence_radius_m=1000,
        shipper=shipper_addr,
        transporter=transporter_addr,
        receiver=receiver_addr,
        current_custodian=transporter_addr,
        expected_delivery=1800000000,
        payment_amount=500000000000000000,
        created_block=11,
        created_tx_hash="0x" + "bb" * 32,
    )
    db_session.add(s)
    db_session.commit()
    return s


def test_simulate_unauthenticated(client):
    resp = client.post("/api/v1/disruption/simulate", json={"shipment_id": 101, "disrupted_node": "Mumbai/JNPT"})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHENTICATED"


def test_simulate_forbidden_non_admin(client, db_session, wallets):
    headers = auth_header_for(client, db_session, wallets["shipper"], role=2)
    resp = client.post(
        "/api/v1/disruption/simulate",
        json={"shipment_id": 101, "disrupted_node": "Mumbai/JNPT"},
        headers=headers,
    )
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


def test_simulate_unknown_shipment(client, db_session, wallets):
    headers = auth_header_for(client, db_session, wallets["admin"], role=1)
    resp = client.post(
        "/api/v1/disruption/simulate",
        json={"shipment_id": 999999, "disrupted_node": "Mumbai/JNPT"},
        headers=headers,
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


def test_simulate_unknown_disrupted_node(client, db_session, wallets, test_shipment_in_transit):
    headers = auth_header_for(client, db_session, wallets["admin"], role=1)
    resp = client.post(
        "/api/v1/disruption/simulate",
        json={"shipment_id": 101, "disrupted_node": "NonExistentCityHub"},
        headers=headers,
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "UNKNOWN_DISRUPTED_NODE"


@patch("app.routers.disruption.OracleService")
def test_simulate_success_onchain_anchored(mock_oracle_cls, client, db_session, wallets, test_shipment_in_transit):
    # Setup mock oracle service
    mock_oracle = MagicMock()
    mock_oracle.w3.is_connected.return_value = True
    mock_oracle.submit_delay.return_value = {"txHash": "0x1111111111111111", "status": 1}
    mock_oracle.submit_oracle_update.return_value = {"txHash": "0x2222222222222222", "status": 1}
    mock_oracle_cls.return_value = mock_oracle

    headers = auth_header_for(client, db_session, wallets["admin"], role=1)
    payload = {
        "shipment_id": 101,
        "disrupted_node": "Mumbai/JNPT",
        "severity": 0.85,
    }
    resp = client.post("/api/v1/disruption/simulate", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["shipment_id"] == 101
    assert data["disrupted_node"] == "Mumbai/JNPT"
    assert data["severity"] == 0.85
    assert data["delay_risk_category"] == "HIGH"
    assert data["onchain_status"] == "anchored"
    assert len(data["tx_hashes"]) == 2
    assert "0x1111111111111111" in data["tx_hashes"]
    assert "0x2222222222222222" in data["tx_hashes"]
    assert "synthetic demo data" in data["caveat"].lower()
    assert mock_oracle.submit_delay.called
    assert mock_oracle.submit_oracle_update.called


def test_simulate_onchain_skipped_not_intransit(client, db_session, wallets, test_shipment_accepted):
    headers = auth_header_for(client, db_session, wallets["admin"], role=1)
    payload = {
        "shipment_id": 102,
        "disrupted_node": "Mumbai/JNPT",
        "severity": 0.85,
    }
    resp = client.post("/api/v1/disruption/simulate", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["shipment_id"] == 102
    assert data["onchain_status"] == "skipped"
    assert "intransit" in data["onchain_reason"].lower()
    assert len(data["tx_hashes"]) == 0
    assert data["rerouted_route"] is not None


@patch("app.routers.disruption.OracleService")
def test_simulate_onchain_failure_graceful(mock_oracle_cls, client, db_session, wallets, test_shipment_in_transit):
    # Mock OracleService throwing on-chain RPC error
    mock_oracle = MagicMock()
    mock_oracle.w3.is_connected.return_value = True
    mock_oracle.submit_delay.side_effect = RuntimeError("Ganache RPC connection lost: timeout")
    mock_oracle_cls.return_value = mock_oracle

    headers = auth_header_for(client, db_session, wallets["admin"], role=1)
    payload = {
        "shipment_id": 101,
        "disrupted_node": "Mumbai/JNPT",
        "severity": 0.85,
    }
    resp = client.post("/api/v1/disruption/simulate", json=payload, headers=headers)
    # The API must NEVER crash; it should return 200 with onchain_status="unavailable"
    assert resp.status_code == 200
    data = resp.json()
    assert data["onchain_status"] == "unavailable"
    assert "ganache rpc connection lost" in data["onchain_reason"].lower()
    assert data["rerouted_route"] is not None


def test_disruption_history(client, db_session, wallets, test_shipment_in_transit):
    headers = auth_header_for(client, db_session, wallets["admin"], role=1)
    # Trigger a simulate
    client.post(
        "/api/v1/disruption/simulate",
        json={"shipment_id": 101, "disrupted_node": "Mumbai/JNPT", "severity": 0.5},
        headers=headers,
    )

    # Fetch history
    resp = client.get("/api/v1/disruption/history", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["shipment_id"] == 101
    assert data[0]["disrupted_node"] == "Mumbai/JNPT"
