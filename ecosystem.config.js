// pes01 (uid102) — A/B 2026-06-30: serves v19 (SANITIZATION-INVARIANT, replaces v16). v19 =
// v10 avg-ensemble retrained on benchmark feats with hero/button + raw *_bb amount cols DROPPED
// (d0 features_v2 diagnosis: those collapse/OOD on the sanitized live feed -> our v10 degenerated,
// raw-std 0.02). v19 un-degenerates live (raw-std 0.066 = 3.2x), benchmark LODO AP 0.870. BENCHMARK-
// ONLY = honest "no validator-private data". A/B fleet: pes01=v19(saninv) pes04=v20(saninv+bucket)
// vs controls pes03=v10 pes02=v5. topk 0.15.
//   pm2 delete poker44_bump_miner && pm2 start ecosystem.config.js
module.exports = { apps: [{
  name: "poker44_bump_miner",
  script: "neurons/miner.py",
  interpreter: __dirname + "/.venv/bin/python",
  cwd: __dirname,
  args: "--netuid 126 --wallet.name pes --wallet.hotkey pes01 " +
        "--subtensor.network finney --axon.port 8091 " +
        "--blacklist.force_validator_permit --logging.info",
  env: {
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model_v19.joblib",
    BT_NO_PARSE_CLI_ARGS: "0",
    POKER44_TOPK_FRAC: "0.15",
    POKER44_CAPTURE: "1",
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
