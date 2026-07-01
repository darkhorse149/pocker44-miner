// Third miner on hotkey pes03 (uid 104) — serves v10 (replaced v6, which was
// confirmed worse live: cx_ features overfit the benchmark). v10 = diverse AVERAGED
// ensemble (3 LightGBM variants + ExtraTrees + RandomForest) over 293 no-cx_ feats,
// no meta-learner, conservative topk frac 0.15. Best cross-date AP (0.8988) +
// variance reduction for live transfer. Live A/B: pes02=v5 (stack) vs pes03=v10
// (ensemble) vs pes04=v9 (lean). Axon port 8094.
//   pm2 delete poker44_bump_miner_pes03 && pm2 start ecosystem.pes03.config.js
module.exports = { apps: [{
  name: "poker44_bump_miner_pes03",
  script: "neurons/miner.py",
  interpreter: __dirname + "/.venv/bin/python",
  cwd: __dirname,
  args: "--netuid 126 --wallet.name pes --wallet.hotkey pes03 " +
        "--subtensor.network finney --axon.port 8094 " +
        "--blacklist.force_validator_permit --logging.info",
  env: {
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model_v10.joblib",
    BT_NO_PARSE_CLI_ARGS: "0",
    POKER44_TOPK_FRAC: "0.15",
    POKER44_CAPTURE: "1",
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
