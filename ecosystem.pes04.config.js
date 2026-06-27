// Fourth miner on hotkey pes04 (uid 109) — serves v14: v10 avg-ensemble (3 LGBM+ET+RF) over
// base293 + 8 REPETITION-INVARIANT rp_ feats (generator-agnostic self-similarity: Vendi, set
// log-det, gzip compression ratio, entropy-rate, exact-dup fractions), NO cx_ (known live-loser),
// topk frac 0.15, full-chunk. LODO per-date AP 0.9116. Isolates the live value of rp_ features
// vs pes03=v10 (same ensemble, no rp_). ~4ms/chunk.
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
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model_v14.joblib",
    BT_NO_PARSE_CLI_ARGS: "0",
    POKER44_TOPK_FRAC: "0.15",
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
