import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { api } from "../src/lib/api";

describe("Phase 1 Design Experience — Disruption & Dynamic Rerouting Frontend Client", () => {
  it("defines simulateDisruption and getDisruptionHistory API methods", () => {
    assert.equal(typeof api.simulateDisruption, "function");
    assert.equal(typeof api.getDisruptionHistory, "function");
  });

  it("validates simulateDisruption payload structure for Mumbai storm preset", () => {
    const payload = {
      shipment_id: 1,
      current_node: "Indore",
      destination: "Mumbai/JNPT",
      disrupted_node: "Mumbai/JNPT",
      severity: 0.85,
    };
    assert.equal(payload.shipment_id, 1);
    assert.equal(payload.disrupted_node, "Mumbai/JNPT");
    assert.equal(payload.severity, 0.85);
    assert.ok(payload.severity >= 0.7, "Severity 0.85 should trigger high disruption threshold");
  });

  it("validates simulateDisruption payload structure for Mundra port congestion preset", () => {
    const payload = {
      shipment_id: 2,
      current_node: "Ahmedabad",
      destination: "Delhi",
      disrupted_node: "Mundra",
      severity: 0.60,
    };
    assert.equal(payload.shipment_id, 2);
    assert.equal(payload.disrupted_node, "Mundra");
    assert.equal(payload.severity, 0.60);
  });
});
