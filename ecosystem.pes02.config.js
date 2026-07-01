// Second miner on hotkey pes02 (uid 107) — parallel live A/B of an AGGRESSIVE
// topk fraction (0.25) vs pes01's conservative 0.15. Same code + artifact;
// only POKER44_TOPK_FRAC and the wallet/port differ.
//   pm2 start ecosystem.pes02.config.js
module.exports = { apps: [{
  name: "poker44_bump_miner_pes02",
  script: "neurons/miner.py",
  interpreter: __dirname + "/.venv/bin/python",
  cwd: __dirname,
  args: "--netuid 126 --wallet.name pes --wallet.hotkey pes02 " +
        "--subtensor.network finney --axon.port 8093 " +
        "--blacklist.force_validator_permit --logging.info",
  // pes02 now runs v5 (full stacked tree pipeline + topk) at frac=0.15 — a clean
  // live A/B vs pes01 (v4 trees + topk frac=0.15): same head, different model.
  env: {
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model_v5.joblib",
    BT_NO_PARSE_CLI_ARGS: "0",
    POKER44_TOPK_FRAC: "0.15",
    POKER44_CAPTURE: "1",
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
