// pm2 start ecosystem.config.js   (edit env first)
module.exports = { apps: [{
  name: "poker44_bump_miner",
  script: "neurons/miner.py",
  interpreter: __dirname + "/.venv/bin/python",
  cwd: __dirname,
  args: "--netuid 126 --wallet.name pes --wallet.hotkey pes01 " +
        "--subtensor.network finney --axon.port 8091 " +
        "--blacklist.force_validator_permit --logging.info",
  env: {
    POKER44_BUMP_MODEL: __dirname + "/models/bump_model.joblib",
    // bittensor 10.x ignores CLI args unless this is explicitly disabled (defaults to "true").
    BT_NO_PARSE_CLI_ARGS: "0",
  },
  autorestart: true, max_restarts: 50, restart_delay: 5000,
}]};
