// pes01 (uid102) — serves v16 (replaced the live-overfit v12-XGB). v16 = DECORRELATED
// two-architecture blend: 0.4*(base+repetition-invariant-feats tree-ensemble) + 0.6*
// (Deep-Sets+Relation torch net). trees & deepsets only rho=0.32 correlated -> blend lifts
// LODO per-date AP to 0.9198 (best non-overfit). rp_ feats are generator-agnostic (live-
// transfer bet); FPR-safe topk 0.15; ~4.9ms/chunk. Portfolio: pes01=v16 / pes02=v5(stack
// control) / pes03=v10(ens control) / pes04=v14(rp-trees).
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
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model_v16.joblib",
    BT_NO_PARSE_CLI_ARGS: "0",
    POKER44_TOPK_FRAC: "0.15",
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
