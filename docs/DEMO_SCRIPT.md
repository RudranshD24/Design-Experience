# DEMO_SCRIPT

Use only after the MVP gate is passed. Replace example identifiers with actual seeded shipment IDs and attach screenshots only from a real run.

## Preparation

- Start Docker dependencies, local chain, API and frontend using `WORKFLOW.md`.
- Confirm chain ID 1337, deployment addresses, API health and IPFS health.
- Connect a dedicated MetaMask local test account for each role.
- Seed the demo dataset and record actual shipment IDs and transaction hashes.
- Keep a copy of the test account roles and demo sequence; never expose private keys.

## Act 1 — Identity and roles (MVP)

1. Connect as Admin and show the local network indicator.
2. Register Shipper, Transporter, Inspector and Receiver test addresses.
3. Show that an unauthorized account cannot register a participant.
4. Revoke a disposable test participant and demonstrate denied access.

**Evidence:** role registry state, transaction receipt and negative-test output.

## Act 2 — Shipment lifecycle (MVP)

1. Sign in as Shipper and create a shipment with unique external reference, route, parties, expected delivery and test-ETH amount.
2. Switch to assigned Transporter and accept the shipment.
3. Dispatch and record one or more manual milestones.
4. Transfer custody where the seeded flow requires it.
5. Show timeline provenance and transaction hashes.

**Evidence:** shipment detail, event history and contract test output.

## Act 3 — Documents and escrow (MVP)

1. Upload a sample non-confidential document to local IPFS.
2. Show returned SHA-256 and CID.
3. Anchor metadata through a MetaMask-signed transaction.
4. Verify the original file, then verify a modified copy and show mismatch.
5. Demonstrate exact test-ETH deposit and the permitted release/refund path.

**Evidence:** IPFS response, on-chain event, hash comparison and escrow balances/receipt. State clearly that funds are local test ETH.

## Act 4 — Audit and read-model recovery (MVP)

1. Open the audit view and locate events from the prior acts.
2. Show shipment list/detail sourced from the indexed read model.
3. Run reindex in the approved local demo and compare rebuilt projection to chain state.
4. Show the relevant tests and actual output.

## Act 5 — Advanced features (only if implemented)

Demonstrate oracle scenarios and label them as reports; disputes and controlled security cases; consensus simulator with identical seed/workload; advanced analytics; optional ML with synthetic-data caveat. Do not present unimplemented screens or mock metrics as live functionality.

## Act 6 — Disruption detection and dynamic rerouting (advanced, synthetic)

Demonstrate Phase 1 of the Smart Supply Chain Resilience Platform.

1. Connect as Admin (`0x90F79bf6EB2c4f870365E785982E1f101E93b906`) and navigate to the **Disruption** console (`/disruption`).
2. Select an active `InTransit` shipment (e.g. Shipment #1 Indore -> Mumbai or Shipment #2 Ahmedabad -> Delhi from `seed_demo_shipments.js`).
3. Click the preset **"Storm at Mumbai/JNPT (severity 0.85)"**. Notice the inputs auto-populate: Disrupted Node = `Mumbai/JNPT`, Severity = `0.85`.
4. Click **"Simulate & Evaluate Disruption"**.
5. Inspect the advisory evaluation:
   - **ML Delay Risk:** Category `HIGH` (~74.6% delay risk probability) with contributing factors (`weather_risk_index`, `traffic_congestion_index`).
   - **Corridor Rerouting:** Baseline route (`Indore -> Mumbai/JNPT`, 585 km, 11.7h) vs Rerouted route avoiding Mumbai (`Indore -> Pune -> Mumbai/JNPT`, 795 km, 15.9h, delta +4.2h) with K=3 simple path alternatives.
   - **On-Chain Audit Trail:** Because risk is `HIGH` and shipment is `InTransit`, `OracleService.submit_delay` marks the shipment `Delayed` on-chain, followed by `OracleService.submit_oracle_update` recording the reroute decision hash/metadataURI.
6. Click the displayed transaction hashes and the link to `/shipments/1` to view the newly anchored oracle milestone and delayed status in the timeline.
7. Click the preset **"Port congestion at Mundra (severity 0.60)"** to demonstrate moderate disruption and fallback handling (`onchain: skipped` when below threshold, or `onchain: unavailable` if chain/oracle is offline).
8. Highlight the visible warning badge: *"Synthetic demo network & features — advisory only"*.

## Close

Summarize implemented versus simulated versus future work, known limitations, and the course concepts demonstrated. Do not claim real-world deployment, real GPS validation, confidential storage or real payments.

