"""ML Sanity and Monotonicity Tests (Step 3).

Asserts that delay_risk_probability is non-decreasing as weather_risk_index
and traffic_congestion_index increase (with small numerical tolerance allowed for tree splits),
and verifies that severity >= 0.7 reliably yields HIGH delay risk category on demo shipments.
"""

import pytest
from ml.predict import predict_shipment_eta
from ml.schemas import ShipmentFeatures
from app.routers.disruption import map_severity_to_indices


def test_weather_risk_monotonicity_trend():
    """Verify delay risk probability is non-decreasing with weather risk index within small tolerance."""
    probs = []
    weather_levels = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]

    for w in weather_levels:
        feat = ShipmentFeatures(
            route_distance_km=580.0,
            planned_duration_hours=10.5,
            elapsed_transit_hours=2.0,
            weather_risk_index=w,
            traffic_congestion_index=0.25,
            historical_lane_delay_rate=0.12,
        )
        res = predict_shipment_eta(feat)
        probs.append(res.delay_risk_probability)

    # Global trend: maximum risk should be greater than or equal to minimum risk
    assert probs[-1] >= probs[0]

    # Stepwise monotonicity with small tolerance (0.085) for empirical tree partition variance
    tolerance = 0.085
    for i in range(1, len(probs)):
        assert probs[i] >= (probs[i - 1] - tolerance), (
            f"Weather monotonicity violated: w={weather_levels[i]} prob={probs[i]} vs "
            f"w={weather_levels[i-1]} prob={probs[i-1]}"
        )


def test_traffic_congestion_monotonicity_trend():
    """Verify delay risk probability is non-decreasing with traffic congestion index within small tolerance."""
    probs = []
    traffic_levels = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]

    for t in traffic_levels:
        feat = ShipmentFeatures(
            route_distance_km=580.0,
            planned_duration_hours=10.5,
            elapsed_transit_hours=2.0,
            weather_risk_index=0.20,
            traffic_congestion_index=t,
            historical_lane_delay_rate=0.12,
        )
        res = predict_shipment_eta(feat)
        probs.append(res.delay_risk_probability)

    # Global trend: high congestion yields higher risk than zero congestion
    assert probs[-1] >= probs[0]

    # Stepwise check with small numerical tolerance
    tolerance = 0.085
    for i in range(1, len(probs)):
        assert probs[i] >= (probs[i - 1] - tolerance), (
            f"Traffic monotonicity violated: t={traffic_levels[i]} prob={probs[i]} vs "
            f"t={traffic_levels[i-1]} prob={probs[i-1]}"
        )


def test_severity_mapping_high_risk_threshold():
    """Verify that disruption severity >= 0.7 reliably yields HIGH delay risk category."""
    test_severities = [0.70, 0.75, 0.80, 0.85, 0.90, 1.00]

    for sev in test_severities:
        indices = map_severity_to_indices(sev)
        feat = ShipmentFeatures(
            route_distance_km=580.0,
            planned_duration_hours=10.5,
            elapsed_transit_hours=2.0,
            weather_risk_index=indices["weather_risk_index"],
            traffic_congestion_index=indices["traffic_congestion_index"],
            historical_lane_delay_rate=indices["historical_lane_delay_rate"],
        )
        res = predict_shipment_eta(feat)

        assert res.delay_risk_category == "HIGH", (
            f"Severity {sev} mapped to w={indices['weather_risk_index']}, "
            f"t={indices['traffic_congestion_index']} yielded category '{res.delay_risk_category}' "
            f"with probability {res.delay_risk_probability}, expected HIGH"
        )
        assert res.delay_risk_probability >= 0.65


def test_disruption_preset_1_mumbai_storm():
    """Verify Mumbai storm preset (severity 0.85) yields HIGH risk and delay probability >= 0.75."""
    indices = map_severity_to_indices(0.85)
    feat = ShipmentFeatures(
        route_distance_km=580.0,
        planned_duration_hours=10.5,
        elapsed_transit_hours=3.0,
        weather_risk_index=indices["weather_risk_index"],
        traffic_congestion_index=indices["traffic_congestion_index"],
        historical_lane_delay_rate=indices["historical_lane_delay_rate"],
    )
    res = predict_shipment_eta(feat)
    assert res.delay_risk_category == "HIGH"
    assert res.delay_risk_probability >= 0.75


def test_disruption_preset_2_mundra_congestion():
    """Verify Mundra port congestion preset (severity 0.60) yields moderate-to-high risk."""
    indices = map_severity_to_indices(0.60)
    feat = ShipmentFeatures(
        route_distance_km=850.0,
        planned_duration_hours=14.0,
        elapsed_transit_hours=4.0,
        weather_risk_index=indices["weather_risk_index"],
        traffic_congestion_index=indices["traffic_congestion_index"],
        historical_lane_delay_rate=indices["historical_lane_delay_rate"],
    )
    res = predict_shipment_eta(feat)
    assert res.delay_risk_category in ("MODERATE", "HIGH")
    assert res.delay_risk_probability >= 0.60
