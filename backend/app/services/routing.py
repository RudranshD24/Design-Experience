"""Routing Engine service for CargoChain Phase 1 Dynamic Rerouting.

Pluggable Architecture Note:
This module defines the RoutingEngine abstract interface and provides a reference
DijkstraEngine implementation using Python's standard library (heapq).
The engine is intentionally modular and pluggable so that alternative single-source
shortest path (SSSP) algorithms, contraction hierarchies, or advanced graph solvers
can seamlessly replace or extend it in future research phases.

Data Provenance:
Evaluated on synthetic demo logistics network (backend/data/demo_network.json).
All network topologies, transit latencies, and environmental indices are synthetic.
"""

import os
import json
import heapq
import time
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Set, Tuple, Optional, Any

logger = logging.getLogger("cargochain.routing")

# Coefficients for dynamic risk-adjusted edge weighting
ALPHA_WEATHER = 0.8
BETA_CONGESTION = 0.6
GAMMA_HISTORICAL = 0.4


class RouteResult:
    """Represents a computed route and its evaluation metrics."""

    def __init__(
        self,
        node_list: List[str],
        total_hours: float,
        total_km: float,
        risk_adjusted_cost: float,
        recommendation: str,
    ):
        self.node_list = node_list
        self.total_hours = round(total_hours, 2)
        self.total_km = round(total_km, 2)
        self.risk_adjusted_cost = round(risk_adjusted_cost, 2)
        self.recommendation = recommendation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_list": self.node_list,
            "total_hours": self.total_hours,
            "total_km": self.total_km,
            "risk_adjusted_cost": self.risk_adjusted_cost,
            "recommendation": self.recommendation,
        }


class RoutingEngine(ABC):
    """Abstract interface for freight route planning engines."""

    @abstractmethod
    def find_shortest_path(
        self,
        origin: str,
        destination: str,
        disrupted_nodes: Optional[Set[str]] = None,
        edge_modifiers: Optional[Dict[Tuple[str, str], Dict[str, float]]] = None,
        current_node_penalized: Optional[str] = None,
    ) -> Optional[RouteResult]:
        """Compute the optimal single-source shortest simple path."""
        pass

    @abstractmethod
    def find_k_shortest_paths(
        self,
        origin: str,
        destination: str,
        k: int = 3,
        disrupted_nodes: Optional[Set[str]] = None,
        edge_modifiers: Optional[Dict[Tuple[str, str], Dict[str, float]]] = None,
        current_node_penalized: Optional[str] = None,
    ) -> List[RouteResult]:
        """Compute top-K loopless shortest paths using Yen's algorithm."""
        pass


class DijkstraEngine(RoutingEngine):
    """Dijkstra and Yen's K-shortest simple path implementation using stdlib heapq."""

    def __init__(self, network_data_path: Optional[str] = None):
        if network_data_path is None:
            network_data_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "data",
                "demo_network.json",
            )
        self.network_data_path = network_data_path
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.adjacency: Dict[str, List[Dict[str, Any]]] = {}
        self._load_network()

    def _load_network(self) -> None:
        if not os.path.exists(self.network_data_path):
            raise FileNotFoundError(f"Network topology file not found at {self.network_data_path}")
        with open(self.network_data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.nodes = {n["id"]: n for n in data.get("nodes", [])}
        self.adjacency = {node_id: [] for node_id in self.nodes}

        for edge in data.get("edges", []):
            u = edge["from"]
            v = edge["to"]
            if u in self.adjacency and v in self.nodes:
                self.adjacency[u].append({
                    "to": v,
                    "distance_km": float(edge.get("distance_km", 0.0)),
                    "base_hours": float(edge.get("base_hours", 0.0)),
                    "mode": edge.get("mode", "Road"),
                    "historical_delay": float(edge.get("historical_delay", 0.1)),
                })

    def calculate_edge_weight(
        self,
        u: str,
        v: str,
        base_hours: float,
        historical_delay: float,
        modifiers: Optional[Dict[Tuple[str, str], Dict[str, float]]] = None,
        current_node_penalized: Optional[str] = None,
    ) -> float:
        """Edge weight = base_hours * (1 + alpha*weather + beta*congestion + gamma*historical_delay)."""
        weather = 0.0
        congestion = 0.0

        if modifiers and (u, v) in modifiers:
            mod = modifiers[(u, v)]
            weather = float(mod.get("weather_risk", 0.0))
            congestion = float(mod.get("traffic_congestion", 0.0))

        # If current node is the disrupted node, apply an evacuation penalty rather than blocking
        penalty_factor = 1.0
        if current_node_penalized and u == current_node_penalized:
            penalty_factor = 3.5

        weight = (
            base_hours
            * (1.0 + (ALPHA_WEATHER * weather) + (BETA_CONGESTION * congestion) + (GAMMA_HISTORICAL * historical_delay))
            * penalty_factor
        )
        return max(0.01, weight)

    def _dijkstra_core(
        self,
        origin: str,
        destination: str,
        blocked_nodes: Set[str],
        blocked_edges: Set[Tuple[str, str]],
        edge_modifiers: Optional[Dict[Tuple[str, str], Dict[str, float]]] = None,
        current_node_penalized: Optional[str] = None,
    ) -> Optional[Tuple[List[str], float, float, float]]:
        """Core Dijkstra search returning (node_path, total_hours, total_km, total_cost)."""
        if origin not in self.nodes or destination not in self.nodes:
            return None
        if origin == destination:
            return ([origin], 0.0, 0.0, 0.0)

        # Priority queue stores tuples: (cumulative_cost, current_node, path, total_hours, total_km)
        pq: List[Tuple[float, str, List[str], float, float]] = []
        heapq.heappush(pq, (0.0, origin, [origin], 0.0, 0.0))
        visited_costs: Dict[str, float] = {}

        while pq:
            cost, u, path, hours, km = heapq.heappop(pq)

            if u in visited_costs and visited_costs[u] <= cost:
                continue
            visited_costs[u] = cost

            if u == destination:
                return (path, hours, km, cost)

            for edge in self.adjacency.get(u, []):
                v = edge["to"]
                if v in blocked_nodes:
                    continue
                if (u, v) in blocked_edges:
                    continue
                if v in path:  # Simple loopless paths only
                    continue

                w = self.calculate_edge_weight(
                    u,
                    v,
                    base_hours=edge["base_hours"],
                    historical_delay=edge["historical_delay"],
                    modifiers=edge_modifiers,
                    current_node_penalized=current_node_penalized,
                )

                new_cost = cost + w
                new_hours = hours + edge["base_hours"]
                new_km = km + edge["distance_km"]

                if v not in visited_costs or new_cost < visited_costs[v]:
                    heapq.heappush(pq, (new_cost, v, path + [v], new_hours, new_km))

        return None

    def find_shortest_path(
        self,
        origin: str,
        destination: str,
        disrupted_nodes: Optional[Set[str]] = None,
        edge_modifiers: Optional[Dict[Tuple[str, str], Dict[str, float]]] = None,
        current_node_penalized: Optional[str] = None,
    ) -> Optional[RouteResult]:
        """Compute the optimal route between origin and destination."""
        if origin == destination:
            return RouteResult(
                node_list=[origin],
                total_hours=0.0,
                total_km=0.0,
                risk_adjusted_cost=0.0,
                recommendation=f"Origin and destination are identical ({origin}).",
            )

        blocked = set(disrupted_nodes or set())
        # If origin itself is in disrupted_nodes and current_node_penalized is set, do not block origin
        if current_node_penalized and origin in blocked:
            blocked.remove(origin)

        res = self._dijkstra_core(
            origin,
            destination,
            blocked_nodes=blocked,
            blocked_edges=set(),
            edge_modifiers=edge_modifiers,
            current_node_penalized=current_node_penalized,
        )
        if not res:
            return None

        path, hours, km, cost = res
        recom = f"Direct route via {len(path)} hubs: {' -> '.join(path)}"
        if disrupted_nodes:
            avoided = ", ".join(disrupted_nodes)
            recom = f"Optimal corridor avoiding disrupted hub(s) [{avoided}]; total {round(hours, 1)}h ({round(km, 0)}km)"

        return RouteResult(
            node_list=path,
            total_hours=hours,
            total_km=km,
            risk_adjusted_cost=cost,
            recommendation=recom,
        )

    def find_k_shortest_paths(
        self,
        origin: str,
        destination: str,
        k: int = 3,
        disrupted_nodes: Optional[Set[str]] = None,
        edge_modifiers: Optional[Dict[Tuple[str, str], Dict[str, float]]] = None,
        current_node_penalized: Optional[str] = None,
    ) -> List[RouteResult]:
        """Compute top-K loopless shortest simple paths using Yen's algorithm."""
        if origin not in self.nodes or destination not in self.nodes:
            return []

        if origin == destination:
            return [
                RouteResult(
                    node_list=[origin],
                    total_hours=0.0,
                    total_km=0.0,
                    risk_adjusted_cost=0.0,
                    recommendation="Origin and destination are identical.",
                )
            ]

        blocked_nodes_init = set(disrupted_nodes or set())
        # If current_node is disrupted, route out from it with penalties rather than failing
        if current_node_penalized and origin in blocked_nodes_init:
            blocked_nodes_init.remove(origin)

        # Baseline shortest path A[0]
        first_route = self._dijkstra_core(
            origin,
            destination,
            blocked_nodes=blocked_nodes_init,
            blocked_edges=set(),
            edge_modifiers=edge_modifiers,
            current_node_penalized=current_node_penalized,
        )
        if not first_route:
            return []

        # A holds the determined shortest paths: list of (path, hours, km, cost)
        A: List[Tuple[List[str], float, float, float]] = [first_route]
        # B is a priority queue of candidate paths: (cost, path, hours, km)
        B: List[Tuple[float, List[str], float, float]] = []
        seen_candidate_paths: Set[Tuple[str, ...]] = {tuple(first_route[0])}

        for path_k in range(1, k):
            prev_path, _, _, _ = A[path_k - 1]

            # The spur node ranges from the first node up to the penultimate node
            for i in range(len(prev_path) - 1):
                spur_node = prev_path[i]
                root_path = prev_path[: i + 1]

                # Remove links that are part of the previous shortest paths which share the same root path
                removed_edges: Set[Tuple[str, str]] = set()
                for p in A:
                    if len(p[0]) > i and p[0][: i + 1] == root_path:
                        removed_edges.add((p[0][i], p[0][i + 1]))

                # Nodes in root_path (except spur_node) are blocked so the path remains simple
                spur_blocked_nodes = blocked_nodes_init.union(set(root_path[:-1]))

                spur_route = self._dijkstra_core(
                    spur_node,
                    destination,
                    blocked_nodes=spur_blocked_nodes,
                    blocked_edges=removed_edges,
                    edge_modifiers=edge_modifiers,
                    current_node_penalized=current_node_penalized if spur_node == current_node_penalized else None,
                )

                if spur_route:
                    spur_path, spur_hours, spur_km, spur_cost = spur_route
                    total_candidate_path = root_path[:-1] + spur_path
                    cand_tuple = tuple(total_candidate_path)

                    if cand_tuple not in seen_candidate_paths:
                        seen_candidate_paths.add(cand_tuple)

                        # Calculate complete metrics for root_path + spur_path
                        calc_res = self._evaluate_explicit_path(
                            total_candidate_path,
                            edge_modifiers=edge_modifiers,
                            current_node_penalized=current_node_penalized,
                        )
                        if calc_res:
                            h, d, c = calc_res
                            heapq.heappush(B, (c, total_candidate_path, h, d))

            if not B:
                break

            cost_b, path_b, hours_b, km_b = heapq.heappop(B)
            A.append((path_b, hours_b, km_b, cost_b))

        # Format results
        results: List[RouteResult] = []
        baseline_hours = A[0][1] if A else 0.0

        for idx, (path, hours, km, cost) in enumerate(A):
            delta = round(hours - baseline_hours, 1)
            delta_str = f"+{delta}h" if delta > 0 else "baseline"
            if idx == 0:
                recom = f"Primary recommendation: {' -> '.join(path)} ({round(hours, 1)}h, {delta_str})"
            else:
                recom = f"Alternate option #{idx}: {' -> '.join(path)} ({round(hours, 1)}h, {delta_str} vs primary)"

            results.append(
                RouteResult(
                    node_list=path,
                    total_hours=hours,
                    total_km=km,
                    risk_adjusted_cost=cost,
                    recommendation=recom,
                )
            )

        return results

    def _evaluate_explicit_path(
        self,
        node_path: List[str],
        edge_modifiers: Optional[Dict[Tuple[str, str], Dict[str, float]]] = None,
        current_node_penalized: Optional[str] = None,
    ) -> Optional[Tuple[float, float, float]]:
        """Calculates (total_hours, total_km, total_cost) along an explicit sequence of nodes."""
        total_hours = 0.0
        total_km = 0.0
        total_cost = 0.0

        for i in range(len(node_path) - 1):
            u, v = node_path[i], node_path[i + 1]
            found = False
            for edge in self.adjacency.get(u, []):
                if edge["to"] == v:
                    found = True
                    w = self.calculate_edge_weight(
                        u,
                        v,
                        base_hours=edge["base_hours"],
                        historical_delay=edge["historical_delay"],
                        modifiers=edge_modifiers,
                        current_node_penalized=current_node_penalized,
                    )
                    total_hours += edge["base_hours"]
                    total_km += edge["distance_km"]
                    total_cost += w
                    break
            if not found:
                return None

        return (total_hours, total_km, total_cost)

    def find_nearest_alternative_hub(
        self,
        disrupted_dest: str,
        current_node: str,
        disrupted_nodes: Set[str],
    ) -> Optional[str]:
        """Finds the closest reachable operational major hub when destination is disrupted."""
        candidates = [n for n in self.nodes if n != disrupted_dest and n not in disrupted_nodes]
        best_hub = None
        min_hours = float("inf")

        for cand in candidates:
            route = self.find_shortest_path(
                origin=current_node,
                destination=cand,
                disrupted_nodes=disrupted_nodes,
            )
            if route and route.total_hours < min_hours:
                min_hours = route.total_hours
                best_hub = cand

        return best_hub

    def reroute_shipment(
        self,
        current_node: str,
        destination: str,
        disrupted_node: Optional[str] = None,
        severity: float = 0.0,
        k: int = 3,
    ) -> Dict[str, Any]:
        """Main entry point to evaluate baseline vs rerouted paths under disruption.

        Handles:
        1. origin == destination
        2. disrupted_node == destination
        3. current_node == disrupted_node (evacuation penalty)
        4. No path available
        """
        # Validate node existence
        if current_node not in self.nodes:
            raise ValueError(f"Current node '{current_node}' is not in the logistics network.")
        if destination not in self.nodes:
            raise ValueError(f"Destination node '{destination}' is not in the logistics network.")

        disrupted_set: Set[str] = set()
        if disrupted_node and disrupted_node in self.nodes:
            disrupted_set.add(disrupted_node)

        # Baseline route (no disruptions, nominal network conditions)
        baseline_k = self.find_k_shortest_paths(
            origin=current_node,
            destination=destination,
            k=1,
            disrupted_nodes=set(),
        )
        baseline_route = baseline_k[0] if baseline_k else None

        # Edge case: Destination is disrupted
        if disrupted_node and disrupted_node == destination:
            alt_hub = self.find_nearest_alternative_hub(
                disrupted_dest=destination,
                current_node=current_node,
                disrupted_nodes=disrupted_set,
            )
            alt_routes = []
            if alt_hub:
                alt_routes = self.find_k_shortest_paths(
                    origin=current_node,
                    destination=alt_hub,
                    k=k,
                    disrupted_nodes=disrupted_set,
                )

            return {
                "status": "destination_disrupted",
                "current_node": current_node,
                "requested_destination": destination,
                "disrupted_node": disrupted_node,
                "nearest_alternative_hub": alt_hub,
                "baseline_route": baseline_route.to_dict() if baseline_route else None,
                "rerouted_route": alt_routes[0].to_dict() if alt_routes else None,
                "alternates": [r.to_dict() for r in alt_routes[1:]],
                "delta_hours": round((alt_routes[0].total_hours - baseline_route.total_hours), 1) if (alt_routes and baseline_route) else 0.0,
                "recommendation": (
                    f"Destination hub '{destination}' is severely disrupted. "
                    f"Recommended reroute to nearest operational regional gateway '{alt_hub}'."
                ),
            }

        # Build dynamic edge modifiers for edges connected to the disrupted node
        edge_modifiers: Dict[Tuple[str, str], Dict[str, float]] = {}
        if disrupted_node:
            weather_risk = min(1.0, severity * 1.1)
            traffic_congestion = min(1.0, severity * 1.0)
            for u in self.adjacency:
                for edge in self.adjacency[u]:
                    v = edge["to"]
                    if u == disrupted_node or v == disrupted_node:
                        edge_modifiers[(u, v)] = {
                            "weather_risk": weather_risk,
                            "traffic_congestion": traffic_congestion,
                        }

        # Check if current_node == disrupted_node
        current_node_penalized = current_node if (disrupted_node == current_node) else None

        # Calculate rerouted K-shortest paths avoiding or exiting the disrupted node
        rerouted_k = self.find_k_shortest_paths(
            origin=current_node,
            destination=destination,
            k=k,
            disrupted_nodes=disrupted_set if not current_node_penalized else set(),
            edge_modifiers=edge_modifiers,
            current_node_penalized=current_node_penalized,
        )

        if not rerouted_k:
            return {
                "status": "no_path_found",
                "current_node": current_node,
                "destination": destination,
                "disrupted_node": disrupted_node,
                "baseline_route": baseline_route.to_dict() if baseline_route else None,
                "rerouted_route": None,
                "alternates": [],
                "delta_hours": 0.0,
                "recommendation": f"No feasible route available from '{current_node}' to '{destination}' avoiding '{disrupted_node}'.",
            }

        new_primary = rerouted_k[0]
        base_h = baseline_route.total_hours if baseline_route else new_primary.total_hours
        delta_hours = round(new_primary.total_hours - base_h, 1)

        recommendation_text = (
            f"Reroute selected avoiding '{disrupted_node}' ({new_primary.total_hours}h, "
            f"+{delta_hours}h vs baseline corridor). Corridor: {' -> '.join(new_primary.node_list)}."
        )
        if current_node_penalized:
            recommendation_text = (
                f"Emergency evacuation route out of disrupted origin '{current_node}' with heavy edge penalties. "
                f"Corridor: {' -> '.join(new_primary.node_list)}."
            )

        return {
            "status": "success",
            "current_node": current_node,
            "destination": destination,
            "disrupted_node": disrupted_node,
            "baseline_route": baseline_route.to_dict() if baseline_route else None,
            "rerouted_route": new_primary.to_dict(),
            "alternates": [r.to_dict() for r in rerouted_k[1:]],
            "delta_hours": delta_hours,
            "recommendation": recommendation_text,
        }

    def get_benchmark_timing(self, iterations: int = 20) -> Dict[str, Any]:
        """Honest timing logger on the synthetic demo graph.

        NOTE: Measures execution latency of this reference DijkstraEngine on the
        local 12-node demo logistics graph. Does NOT benchmark or claim implementation
        of any other algorithm or larger production graph.
        """
        pairs = [
            ("Indore", "Mumbai/JNPT"),
            ("Mundra", "Delhi"),
            ("Indore", "Chennai"),
            ("Ahmedabad", "Kolkata"),
        ]
        start_t = time.perf_counter()
        total_runs = 0
        for _ in range(iterations):
            for orig, dest in pairs:
                self.find_k_shortest_paths(orig, dest, k=3, disrupted_nodes={"Mumbai/JNPT"})
                total_runs += 1
        elapsed_sec = time.perf_counter() - start_t
        avg_ms = round((elapsed_sec / total_runs) * 1000.0, 3)

        return {
            "algorithm": "DijkstraEngine (heapq Yen's K-Shortest Paths)",
            "network_nodes": len(self.nodes),
            "iterations": total_runs,
            "total_elapsed_sec": round(elapsed_sec, 4),
            "avg_query_latency_ms": avg_ms,
            "note": "Evaluated on local synthetic demo graph only. Illustrative timing for Phase 1.",
        }
