// Fourth miner on hotkey pes04 (uid 109) — serves v9: lean/robustness-first model
// (74 cross-date-robust base feats, NO cx_, heavily-regularized single LightGBM) +
// conservative topk (frac 0.15). Tests the live-generalization hypothesis (simpler
// transfers better live) against pes02 (v5) and pes03 (v6). Fastest model: 2.5ms/chunk.
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
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model_v9.joblib",
    BT_NO_PARSE_CLI_ARGS: "0",
    POKER44_TOPK_FRAC: "0.15",
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
