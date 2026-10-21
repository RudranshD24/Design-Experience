// CargoChain — Demo Shipment Seeding Script (Design Experience Phase 1)
// Usage: npx hardhat run scripts/seed_demo_shipments.js --network ganache
//
// Creates 3 realistic Indian freight shipments matching the Disruption Console presets:
//   1. Indore -> Mumbai/JNPT (Solar Inverters)
//   2. Ahmedabad -> Delhi (Automotive Spares via Mundra corridor)
//   3. Indore -> Chennai (Pharmaceutical Cold Chain)
// Deposits test-ETH escrow, accepts shipment, and dispatches to InTransit status.
//
// NOTE: Reads existing deployed contracts from deployments/local.json.
// Does NOT redeploy, does NOT modify contracts, and NEVER logs private keys.

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentsPath = path.resolve(__dirname, "../../deployments/local.json");
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`Deployments file not found at ${deploymentsPath}. Please deploy contracts first.`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const {
    ParticipantRegistry: participantRegistryAddr,
    ShipmentRegistry: shipmentRegistryAddr,
    TrackingManager: trackingManagerAddr,
    EscrowManager: escrowManagerAddr,
  } = deployments.contracts;

  if (!shipmentRegistryAddr || !trackingManagerAddr || !escrowManagerAddr) {
    throw new Error("Missing required contract addresses in deployments/local.json");
  }

  const signers = await ethers.getSigners();
  if (signers.length < 6) {
    throw new Error(`Expected at least 6 signers from provider, found ${signers.length}`);
  }

  const admin = signers[0];
  const shipper = signers[1];
  const transporter = signers[2];
  const warehouse = signers[3];
  const inspector = signers[4];
  const receiver = signers[5];

  console.log("================================================================================");
  console.log("CargoChain — Seed Demo Shipments (Design Experience Phase 1)");
  console.log(`ShipmentRegistry: ${shipmentRegistryAddr}`);
  console.log(`TrackingManager:  ${trackingManagerAddr}`);
  console.log(`EscrowManager:    ${escrowManagerAddr}`);
  console.log(`Shipper:          ${shipper.address}`);
  console.log(`Transporter:      ${transporter.address}`);
  console.log(`Receiver:         ${receiver.address}`);
  console.log("================================================================================\n");

  const ShipmentRegistry = await ethers.getContractFactory("ShipmentRegistry");
  const TrackingManager = await ethers.getContractFactory("TrackingManager");
  const EscrowManager = await ethers.getContractFactory("EscrowManager");

  const shipmentRegistry = ShipmentRegistry.attach(shipmentRegistryAddr);
  const trackingManager = TrackingManager.attach(trackingManagerAddr);
  const escrowManager = EscrowManager.attach(escrowManagerAddr);

  const demoShipments = [
    {
      label: "Preset 1: Western Export Corridor (Indore -> Mumbai/JNPT)",
      externalRefStr: `CC-DEMO-MUM-${Date.now().toString().slice(-6)}`,
      productDescription: "Solar Photovoltaic Inverters & Storage Modules",
      quantity: 120,
      origin: "Indore",
      destination: "Mumbai/JNPT",
      destLat: 18950000,
      destLon: 72950000,
      geofenceRadiusM: 1500,
      paymentAmount: ethers.parseEther("0.25"),
      dispatchLocation: "Indore Central Freight Hub",
      dispatchNote: "Loaded and dispatched via Western Corridor NH-52",
    },
    {
      label: "Preset 2: Northern Maritime Corridor (Ahmedabad -> Delhi)",
      externalRefStr: `CC-DEMO-DEL-${Date.now().toString().slice(-6)}`,
      productDescription: "High-Precision Automotive Transmission Gears",
      quantity: 450,
      origin: "Ahmedabad",
      destination: "Delhi",
      destLat: 28613900,
      destLon: 77209000,
      geofenceRadiusM: 2000,
      paymentAmount: ethers.parseEther("0.50"),
      dispatchLocation: "Ahmedabad Multimodal Terminal",
      dispatchNote: "Cleared container terminal, en route to Delhi NCR",
    },
    {
      label: "Cross-Regional Southern Corridor (Indore -> Chennai)",
      externalRefStr: `CC-DEMO-CHE-${Date.now().toString().slice(-6)}`,
      productDescription: "Temperature-Controlled Pharmaceutical Vaccines",
      quantity: 80,
      origin: "Indore",
      destination: "Chennai",
      destLat: 13082700,
      destLon: 80270700,
      geofenceRadiusM: 1200,
      paymentAmount: ethers.parseEther("0.40"),
      dispatchLocation: "Indore Cold Chain Hub",
      dispatchNote: "Temp-logger verified (+4C), dispatched via Pune-Bengaluru bypass",
    },
  ];

  const createdSummary = [];

  for (let i = 0; i < demoShipments.length; i++) {
    const demo = demoShipments[i];
    console.log(`[${i + 1}/${demoShipments.length}] Seeding "${demo.label}"...`);

    const externalRefBytes32 = ethers.keccak256(ethers.toUtf8Bytes(demo.externalRefStr));
    const expectedDelivery = Math.floor(Date.now() / 1000) + 7 * 86400; // 7 days from now

    const input = {
      externalRef: externalRefBytes32,
      productDescription: demo.productDescription,
      quantity: demo.quantity,
      origin: demo.origin,
      destination: demo.destination,
      destLat: demo.destLat,
      destLon: demo.destLon,
      geofenceRadiusM: demo.geofenceRadiusM,
      transporter: transporter.address,
      receiver: receiver.address,
      warehouse: warehouse.address,
      inspector: inspector.address,
      expectedDelivery: expectedDelivery,
      paymentAmount: demo.paymentAmount,
    };

    // 1. Create Shipment (Shipper)
    const createTx = await shipmentRegistry.connect(shipper).createShipment(input);
    const receipt = await createTx.wait();

    // Parse ShipmentCreated event to obtain shipmentId
    let shipmentId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = shipmentRegistry.interface.parseLog(log);
        if (parsed && parsed.name === "ShipmentCreated") {
          shipmentId = parsed.args.shipmentId;
          break;
        }
      } catch (e) {
        // Log is from another contract, ignore
      }
    }

    if (!shipmentId) {
      throw new Error(`Failed to retrieve shipmentId from receipt logs for ${demo.label}`);
    }

    console.log(`  -> Created on-chain: ID #${shipmentId.toString()} (tx: ${receipt.hash.slice(0, 18)}...)`);

    // 2. Fund Escrow (Shipper)
    if (demo.paymentAmount > 0n) {
      const depositTx = await escrowManager.connect(shipper).deposit(shipmentId, {
        value: demo.paymentAmount,
      });
      await depositTx.wait();
      console.log(`  -> Escrow deposited: ${ethers.formatEther(demo.paymentAmount)} test-ETH`);
    }

    // 3. Accept Shipment (Transporter)
    const acceptTx = await shipmentRegistry.connect(transporter).acceptShipment(shipmentId);
    await acceptTx.wait();
    console.log(`  -> Accepted by Transporter (${transporter.address})`);

    // 4. Start Transit (Transporter -> InTransit)
    const transitTx = await trackingManager
      .connect(transporter)
      .startTransit(shipmentId, demo.dispatchLocation, demo.dispatchNote);
    await transitTx.wait();
    console.log(`  -> Transit started: Status transitioned to InTransit (Code 2)`);

    createdSummary.push({
      ID: shipmentId.toString(),
      Corridor: `${demo.origin} -> ${demo.destination}`,
      Cargo: demo.productDescription.slice(0, 32) + "...",
      Status: "InTransit (2)",
      Escrow: `${ethers.formatEther(demo.paymentAmount)} ETH`,
      Ref: demo.externalRefStr,
    });

    console.log("");
  }

  console.log("================================================================================");
  console.log("SUCCESS: 3 Demo Shipments Seeded & Advanced to InTransit");
  console.table(createdSummary);
  console.log("Next steps: Run `python -m app.services.indexer` or sync via UI to index events.");
  console.log("================================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed script failed:", err);
    process.exit(1);
  });
