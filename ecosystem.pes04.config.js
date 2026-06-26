// Fourth miner on hotkey pes04 (uid 109) — serves v6 (our best PROVEN model:
// stacked pipeline + cx_ collision feats + topk head, 304 feats, cross-date AP ~0.90).
// Same model as pes03; a second v6 key for the v2.0 cycle (deeper 5 daily rounds).
//   pm2 start ecosystem.pes04.config.js
module.exports = { apps: [{
  name: "poker44_bump_miner_pes04",
  script: "neurons/miner.py",
  interpreter: __dirname + "/.venv/bin/python",
  cwd: __dirname,
  args: "--netuid 126 --wallet.name pes --wallet.hotkey pes04 " +
        "--subtensor.network finney --axon.port 8095 " +
        "--blacklist.force_validator_permit --logging.info",
  env: {
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model_v6.joblib",
    BT_NO_PARSE_CLI_ARGS: "0",
    POKER44_TOPK_FRAC: "0.15",
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
