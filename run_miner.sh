#!/usr/bin/env bash
# Poker44 bump miner launcher. Set WALLET_NAME/HOTKEY (and optionally AXON_PORT).
set -euo pipefail
cd "$(dirname "$0")"
WALLET_NAME="${WALLET_NAME:?set WALLET_NAME}"
HOTKEY="${HOTKEY:?set HOTKEY}"
AXON_PORT="${AXON_PORT:-8091}"
NETUID="${NETUID:-126}"
NETWORK="${NETWORK:-finney}"
export POKER44_BUMP_MODEL="${POKER44_BUMP_MODEL:-$(pwd)/models/bump_model.joblib}"

# Accept any metagraph validator with permit (auto-adapts). To restrict instead,
# replace --blacklist.force_validator_permit with:
#   --blacklist.allowed_validator_hotkeys $POKER44_VALIDATORS
exec python neurons/miner.py \
  --netuid "$NETUID" \
  --wallet.name "$WALLET_NAME" \
  --wallet.hotkey "$HOTKEY" \
  --subtensor.network "$NETWORK" \
  --axon.port "$AXON_PORT" \
  --blacklist.force_validator_permit \
  --logging.info
