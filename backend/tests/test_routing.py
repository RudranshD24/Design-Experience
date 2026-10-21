"""Tests for RoutingEngine and DijkstraEngine with Yen's K-shortest simple paths."""

import os
import pytest
from app.services.routing import DijkstraEngine, RouteResult


@pytest.fixture
def routing_engine():
    return DijkstraEngine()


def test_routing_engine_initialization(routing_engine):
    assert len(routing_engine.nodes) == 12
    assert "Indore" in routing_engine.nodes
    assert "Mumbai/JNPT" in routing_engine.nodes
    assert "Mundra" in routing_engine.nodes
    assert "Delhi" in routing_engine.nodes


def test_shortest_path_baseline(routing_engine):
    route = routing_engine.find_shortest_path("Indore", "Mumbai/JNPT")
    assert route is not None
    assert route.node_list == ["Indore", "Mumbai/JNPT"]
    assert route.total_hours == 10.5
    assert route.total_km == 580.0


def test_origin_equals_destination(routing_engine):
    route = routing_engine.find_shortest_path("Indore", "Indore")
    assert route is not None
    assert route.node_list == ["Indore"]
    assert route.total_hours == 0.0
    assert route.total_km == 0.0


def test_yen_k_shortest_paths(routing_engine):
    k_paths = routing_engine.find_k_shortest_paths("Indore", "Mumbai/JNPT", k=3)
    assert len(k_paths) >= 2
    # First is direct
    assert k_paths[0].node_list == ["Indore", "Mumbai/JNPT"]
    # Path lengths should be non-decreasing
    for i in range(len(k_paths) - 1):
        assert k_paths[i].risk_adjusted_cost <= k_paths[i + 1].risk_adjusted_cost + 1e-5


def test_disrupted_node_avoidance(routing_engine):
    # Route from Indore to Pune, but block Mumbai/JNPT
    # Nominal direct connection Indore -> Pune exists (11h), or via Mumbai (10.5 + 3 = 13.5h)
    # Let's route from Ahmedabad to Pune with Mumbai/JNPT blocked
    # Ahmedabad -> Mumbai -> Pune is 9 + 3 = 12h
    # If Mumbai is blocked, it must go through Indore -> Pune (7 + 11 = 18h)
    baseline = routing_engine.find_shortest_path("Ahmedabad", "Pune")
    assert "Mumbai/JNPT" in baseline.node_list

    rerouted = routing_engine.find_shortest_path("Ahmedabad", "Pune", disrupted_nodes={"Mumbai/JNPT"})
    assert rerouted is not None
    assert "Mumbai/JNPT" not in rerouted.node_list
    assert "Indore" in rerouted.node_list
    assert rerouted.total_hours > baseline.total_hours


def test_destination_disrupted_recommendation(routing_engine):
    res = routing_engine.reroute_shipment(
        current_node="Indore",
        destination="Mumbai/JNPT",
        disrupted_node="Mumbai/JNPT",
        severity=0.85,
    )
    assert res["status"] == "destination_disrupted"
    assert res["nearest_alternative_hub"] is not None
    assert res["nearest_alternative_hub"] != "Mumbai/JNPT"
    assert "destination hub 'mumbai/jnpt' is severely disrupted" in res["recommendation"].lower()


def test_current_node_equals_disrupted_node(routing_engine):
    # Current node is Mumbai/JNPT and it is also the disrupted node
    # Should not fail with no_path; it routes out with penalties applied
    res = routing_engine.reroute_shipment(
        current_node="Mumbai/JNPT",
        destination="Delhi",
        disrupted_node="Mumbai/JNPT",
        severity=0.8,
    )
    assert res["status"] == "success"
    assert res["rerouted_route"] is not None
    assert res["rerouted_route"]["node_list"][0] == "Mumbai/JNPT"
    assert "evacuation" in res["recommendation"].lower()


def test_routing_determinism(routing_engine):
    res1 = routing_engine.reroute_shipment("Indore", "Chennai", disrupted_node="Mumbai/JNPT", severity=0.7)
    res2 = routing_engine.reroute_shipment("Indore", "Chennai", disrupted_node="Mumbai/JNPT", severity=0.7)
    assert res1["rerouted_route"]["node_list"] == res2["rerouted_route"]["node_list"]
    assert res1["delta_hours"] == res2["delta_hours"]


def test_brute_force_comparison_on_subgraph(routing_engine):
    """Verify Dijkstra against all-paths brute force enumeration on a 5-node subgraph."""
    subgraph_nodes = {"Indore", "Ahmedabad", "Mundra", "Jaipur", "Delhi"}
    
    # Brute force DFS to find all simple paths from Mundra to Delhi
    def all_simple_paths(curr, dest, visited):
        if curr == dest:
            return [[dest]]
        paths = []
        for edge in routing_engine.adjacency.get(curr, []):
            nxt = edge["to"]
            if nxt in subgraph_nodes and nxt not in visited:
                for p in all_simple_paths(nxt, dest, visited | {curr}):
                    paths.append([curr] + p)
        return paths

    all_paths = all_simple_paths("Mundra", "Delhi", set())
    assert len(all_paths) > 0

    # Calculate base hours for each simple path
    path_costs = []
    for p in all_paths:
        hours = 0.0
        for i in range(len(p) - 1):
            for edge in routing_engine.adjacency[p[i]]:
                if edge["to"] == p[i + 1]:
                    hours += edge["base_hours"]
                    break
        path_costs.append((hours, p))
    path_costs.sort(key=lambda x: x[0])

    # Dijkstra shortest path
    shortest = routing_engine.find_shortest_path("Mundra", "Delhi")
    assert shortest is not None
    # The shortest base hours should match brute-force optimum
    assert shortest.node_list == path_costs[0][1]


def test_timing_benchmark_helper(routing_engine):
    timing = routing_engine.get_benchmark_timing(iterations=5)
    assert "avg_query_latency_ms" in timing
    assert timing["network_nodes"] == 12
    assert timing["iterations"] == 20
    assert "illustrative timing" in timing["note"].lower()
