// pes01 (uid102) — serves v12 (replaced the slow/cx_-overfit v4). v12 = single tuned
// XGBoost (depth 6), the max-effort greedy-ensemble search's pick: best cross-date
// per-date AP (0.9214) of 26 candidates, fastest model (2.2ms/chunk), no cx_.
// 4-way live A/B: pes01=v12(xgb) / pes02=v5(stack) / pes03=v10(ensemble) / pes04=v9(lean).
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
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model_v12.joblib",
    BT_NO_PARSE_CLI_ARGS: "0",
    POKER44_TOPK_FRAC: "0.15",
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
