// Fourth miner on hotkey pes04 (uid 109) — serves v8: v6 stacked pipeline + the
// v2.0-optimized STATIC FPR-TARGETING THRESHOLD head (validated to dominate the
// fixed-fraction head across all bot rates and never cliff). Live A/B vs pes03 (v6
// fixed-frac). The threshold t is live-calibrated: start conservative (under-mark,
// safe), lower POKER44_THRESHOLD while watching live FPR until it approaches ~0.06.
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
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model_v8.joblib",
    BT_NO_PARSE_CLI_ARGS: "0",
    POKER44_THRESHOLD: "0.68",          // conservative start; live-tune down toward FPR~0.06
    POKER44_THRESHOLD_CAP: "0.22",      // backstop max positive fraction
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
