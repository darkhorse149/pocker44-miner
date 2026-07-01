// pes04 (uid 109) — A/B 2026-06-30: serves v22 (SEQUENCE TRANSFORMER, replaces v20). v22 = per-hand
// action-ORDER transformer + cross-hand set-pool + repetition relation (the phasberg-seq vs d0-noseq
// hypothesis). MOST un-degenerate on live (raw-std 0.081 > v19 0.066) but LOWEST benchmark AP (0.62)
// = a gamble (its live spread may be transferable signal OR noise; only live A/B resolves it).
// BENCHMARK-ONLY = honest. A/B fleet: pes01=v19(saninv-trees) pes04=v22(seq-transformer) vs controls
// pes03=v10 pes02=v5. Capture stays on passively. topk 0.15.
//   pm2 delete poker44_bump_miner_pes04 && pm2 start ecosystem.pes04.config.js
module.exports = { apps: [{
  name: "poker44_bump_miner_pes04",
  script: "neurons/miner.py",
  interpreter: __dirname + "/.venv/bin/python",
  cwd: __dirname,
  args: "--netuid 126 --wallet.name pes --wallet.hotkey pes04 " +
        "--subtensor.network finney --axon.port 8095 " +
        "--blacklist.force_validator_permit --logging.info",
  env: {
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model_v22.joblib",
    BT_NO_PARSE_CLI_ARGS: "0",
    POKER44_TOPK_FRAC: "0.15",
    POKER44_CAPTURE: "1",
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
