#!/usr/bin/env python3
"""CargoChain Phase 1 — Comprehensive Preflight Demo Verification Script.

Performs a read-only health and readiness audit across all architectural layers:
  1. Ganache EVM RPC connection & Chain ID 1337
  2. Smart contract deployments bytecode verification
  3. Backend FastAPI /health probe
  4. PostgreSQL database readiness
  5. Kubo IPFS gateway/API (WARN only)
  6. Restricted Oracle account registration & Role.Oracle verification
  7. Active InTransit demo shipments presence
  8. Scikit-learn ML model artifacts readiness
  9. Synthetic logistics network topology validation (backend/data/demo_network.json)

Security Notice:
Read-only script. Never prints private keys, secrets, or wallet credentials.
Exits with code 0 on complete readiness, or non-zero on any hard failure.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Tuple

# Add repository root and backend to Python path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "backend"))

import httpx
from web3 import Web3


class TerminalColor:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def print_banner():
    print(f"\n{TerminalColor.BOLD}{TerminalColor.BLUE}================================================================================{TerminalColor.RESET}")
    print(f"{TerminalColor.BOLD}CargoChain — Phase 1 Demonstration Preflight Verification{TerminalColor.RESET}")
    print("Project: Smart Supply Chain Resilience Platform (Solo: Rudransh Dubey)")
    print(f"{TerminalColor.BOLD}{TerminalColor.BLUE}================================================================================{TerminalColor.RESET}\n")


def check_ganache(rpc_url: str = "http://127.0.0.1:8545") -> Tuple[bool, str, str]:
    """Verify local Ganache EVM connection and Chain ID 1337."""
    try:
        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 2.0}))
        if not w3.is_connected():
            return False, "Unable to establish HTTP connection to Ganache RPC at http://127.0.0.1:8545", "npx ganache --chain.chainId 1337 --server.port 8545"
        chain_id = w3.eth.chain_id
        if chain_id != 1337:
            return False, f"Connected to RPC but Chain ID is {chain_id} (expected canonical 1337)", "Restart Ganache with --chain.chainId 1337"
        block = w3.eth.block_number
        return True, f"Reachable at {rpc_url} (Chain ID 1337, latest block #{block})", ""
    except Exception as e:
        return False, f"Ganache connection error: {str(e)}", "npx ganache --chain.chainId 1337 --server.port 8545"


def check_contracts(rpc_url: str = "http://127.0.0.1:8545") -> Tuple[bool, str, str]:
    """Verify that all addresses in deployments/local.json contain deployed bytecode."""
    deployments_path = REPO_ROOT / "deployments" / "local.json"
    if not deployments_path.exists():
        return False, f"Deployments file missing at {deployments_path}", "cd contracts && npx hardhat run scripts/deploy.js --network ganache"

    try:
        with open(deployments_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        contracts = data.get("contracts", {})
        expected_contracts = [
            "ParticipantRegistry",
            "ShipmentRegistry",
            "TrackingManager",
            "DocumentRegistry",
            "EscrowManager",
            "DisputeManager",
        ]

        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 2.0}))
        if not w3.is_connected():
            return False, "Cannot verify contracts because Ganache is offline", "Start Ganache first"

        missing_code = []
        for name in expected_contracts:
            addr = contracts.get(name)
            if not addr:
                missing_code.append(f"{name} (missing address in local.json)")
                continue
            code = w3.eth.get_code(Web3.to_checksum_address(addr))
            if not code or code.hex() in ("0x", "0x0"):
                missing_code.append(f"{name} at {addr} (empty bytecode)")

        if missing_code:
            return False, f"Contracts missing on-chain bytecode: {', '.join(missing_code)}", "cd contracts && npx hardhat run scripts/deploy.js --network ganache"

        return True, f"All 6 contracts deployed with verified bytecode ({len(contracts)} contracts registered)", ""
    except Exception as e:
        return False, f"Contract verification error: {str(e)}", "cd contracts && npx hardhat run scripts/deploy.js --network ganache"


def check_backend_health(url: str = "http://localhost:8000/api/v1/health") -> Tuple[bool, str, str]:
    """Probe FastAPI backend health endpoint."""
    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                status_str = data.get("status", "unknown")
                comp = data.get("components", {})
                return True, f"HTTP 200 (status: {status_str}, db: {comp.get('database')}, chain: {comp.get('chain', {}).get('status')})", ""
            else:
                return False, f"Backend returned HTTP {resp.status_code}: {resp.text}", "cd backend && uvicorn main:app --reload --port 8000"
    except Exception as e:
        return False, f"Cannot connect to backend: {str(e)}", "cd backend && uvicorn main:app --reload --port 8000"


def check_postgres() -> Tuple[bool, str, str]:
    """Verify PostgreSQL connectivity via database config."""
    try:
        from app.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, f"PostgreSQL database connection confirmed ({engine.url.render_as_string(hide_password=True)})", ""
    except Exception as e:
        return False, f"PostgreSQL connection failed: {str(e)}", "docker compose up -d postgres"


def check_ipfs(api_url: str = "http://127.0.0.1:5001/api/v0/version") -> Tuple[bool, str, str, bool]:
    """Probe Kubo IPFS API (WARN only if down)."""
    try:
        with httpx.Client(timeout=2.0) as client:
            resp = client.post(api_url)
            if resp.status_code == 200:
                version = resp.json().get("Version", "ok")
                return True, f"Kubo IPFS API online (v{version})", "", False
    except Exception:
        pass
    return False, "IPFS daemon is offline; fallback to local disk cache active (acceptable for offline demo)", "docker compose up -d ipfs", True


def check_oracle_role(rpc_url: str = "http://127.0.0.1:8545") -> Tuple[bool, str, str]:
    """Verify that designated Oracle service account holds Role.Oracle in ParticipantRegistry."""
    try:
        from oracle.service import ORACLE_DEFAULT_ADDRESS, get_deployment_info, get_contract_abi
        meta = get_deployment_info()
        registry_addr = meta.get("contracts", {}).get("ParticipantRegistry")
        abi = get_contract_abi("ParticipantRegistry")
        if not registry_addr or not abi:
            return False, "ParticipantRegistry contract not found in local deployment info", "cd contracts && npx hardhat run scripts/deploy.js --network ganache"

        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 2.0}))
        if not w3.is_connected():
            return False, "Ganache is unreachable", "Start Ganache"

        contract = w3.eth.contract(address=Web3.to_checksum_address(registry_addr), abi=abi)
        role = contract.functions.roleOf(Web3.to_checksum_address(ORACLE_DEFAULT_ADDRESS)).call()
        is_active = contract.functions.isActive(Web3.to_checksum_address(ORACLE_DEFAULT_ADDRESS)).call()

        if role == 7 and is_active:
            return True, f"Oracle account {ORACLE_DEFAULT_ADDRESS[:10]}... holds Role.Oracle (Role 7, Active)", ""
        else:
            return False, f"Account {ORACLE_DEFAULT_ADDRESS} has role {role} (expected 7=Oracle, active={is_active})", "cd contracts && npx hardhat run scripts/seed_participants.js --network ganache"
    except Exception as e:
        return False, f"Oracle check error: {str(e)}", "cd contracts && npx hardhat run scripts/seed_participants.js --network ganache"


def check_demo_shipments() -> Tuple[bool, str, str]:
    """Verify that demo shipments exist in database and at least one is InTransit (status=2)."""
    try:
        from app.database import SessionLocal
        from app.models.entities import Shipment
        db = SessionLocal()
        try:
            in_transit_count = db.query(Shipment).filter(Shipment.status == 2).count()
            total_count = db.query(Shipment).count()
            if in_transit_count > 0:
                return True, f"Found {in_transit_count} InTransit shipment(s) ({total_count} total shipments indexed in read model)", ""
            elif total_count > 0:
                return False, f"Found {total_count} shipments in DB, but 0 are InTransit (status=2)", "cd contracts && npx hardhat run scripts/seed_demo_shipments.js --network ganache"
            else:
                return False, "No shipments found in read-model database", "cd contracts && npx hardhat run scripts/seed_demo_shipments.js --network ganache"
        finally:
            db.close()
    except Exception as e:
        return False, f"Failed to query shipments: {str(e)}", "Ensure PostgreSQL is running and migrations are applied"


def check_ml_artifacts() -> Tuple[bool, str, str]:
    """Verify that scikit-learn ML regressor, classifier, and metadata load cleanly."""
    try:
        from ml.predict import load_artifacts, get_model_info
        reg, cls, meta = load_artifacts()
        if reg is None or cls is None or meta is None:
            return False, "Failed to load ML artifacts", "python -m ml.train"
        model_name = meta.get("model_name", "CargoChain ML")
        version = meta.get("model_version", "1.0.0")
        return True, f"Artifacts loaded successfully: {model_name} (v{version})", ""
    except Exception as e:
        return False, f"ML loading error: {str(e)}", "python -m ml.train"


def check_demo_network() -> Tuple[bool, str, str]:
    """Validate backend/data/demo_network.json structure and node coverage."""
    network_path = REPO_ROOT / "backend" / "data" / "demo_network.json"
    if not network_path.exists():
        return False, f"demo_network.json missing at {network_path}", "Check backend/data/demo_network.json"

    try:
        with open(network_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        if len(nodes) < 10 or len(edges) < 15:
            return False, f"Network data incomplete: only {len(nodes)} nodes, {len(edges)} edges", "Restore demo_network.json"
        return True, f"Valid topology: {len(nodes)} hubs, {len(edges)} directed corridors ({data.get('data_provenance')})", ""
    except Exception as e:
        return False, f"JSON parse error: {str(e)}", "Check backend/data/demo_network.json syntax"


def main():
    print_banner()

    checks = [
        ("Ganache EVM (Chain ID 1337)", check_ganache),
        ("Smart Contract Deployments", check_contracts),
        ("PostgreSQL Database", check_postgres),
        ("Kubo IPFS Gateway/API", check_ipfs),
        ("Oracle Account Registration", check_oracle_role),
        ("Demo Corridors & Shipments", check_demo_shipments),
        ("ML Decision-Support Engine", check_ml_artifacts),
        ("Demo Network Topology", check_demo_network),
        ("Backend FastAPI /health", check_backend_health),
    ]

    has_hard_failure = False
    failed_fixes = []

    for label, fn in checks:
        result = fn()
        if len(result) == 4:
            passed, msg, fix, is_warn = result
        else:
            passed, msg, fix = result
            is_warn = False

        if passed:
            tag = f"{TerminalColor.GREEN}[ PASS ]{TerminalColor.RESET}"
            print(f"{tag} {TerminalColor.BOLD}{label}{TerminalColor.RESET}")
            print(f"         {msg}\n")
        elif is_warn:
            tag = f"{TerminalColor.YELLOW}[ WARN ]{TerminalColor.RESET}"
            print(f"{tag} {TerminalColor.BOLD}{label}{TerminalColor.RESET}")
            print(f"         {msg}")
            if fix:
                print(f"         {TerminalColor.YELLOW}Suggested Fix:{TerminalColor.RESET} {fix}\n")
        else:
            has_hard_failure = True
            tag = f"{TerminalColor.RED}[ FAIL ]{TerminalColor.RESET}"
            print(f"{tag} {TerminalColor.BOLD}{label}{TerminalColor.RESET}")
            print(f"         {TerminalColor.RED}{msg}{TerminalColor.RESET}")
            if fix:
                print(f"         {TerminalColor.BOLD}Exact Fix Command:{TerminalColor.RESET} {fix}")
                failed_fixes.append((label, fix))
            print("")

    print(f"{TerminalColor.BOLD}{TerminalColor.BLUE}================================================================================{TerminalColor.RESET}")
    if has_hard_failure:
        print(f"{TerminalColor.BOLD}{TerminalColor.RED}PREFLIGHT STATUS: FAILED ({len(failed_fixes)} issues require resolution){TerminalColor.RESET}")
        print("\nRequired fix commands in execution order:")
        for idx, (lbl, cmd) in enumerate(failed_fixes, 1):
            print(f"  {idx}. [{lbl}] -> {TerminalColor.BOLD}{cmd}{TerminalColor.RESET}")
        print("")
        sys.exit(1)
    else:
        print(f"{TerminalColor.BOLD}{TerminalColor.GREEN}PREFLIGHT STATUS: ALL CHECKS PASSED. SYSTEM READY FOR DEMONSTRATION.{TerminalColor.RESET}\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
