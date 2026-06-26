# Poker44 Bump Miner — Go-Live Runbook (SN126)

Status: **built, pre-flight passed, NOT yet registered/submitted.**
Local commit: `2b9a60f` (artifact committed → fully reproducible).

## What it scores (verified offline)
- OOF AP 0.86–0.88 (≈ leader uid136 live 0.887); FPR 0.000, **0 cliffs** (auto-buffer self-calibrated).
- Local validator (real scorer, unseen windows): epoch-mean reward ~0.67 → projected composite ~0.60.
- Beats king uid32 (composite 0.583); ~parity with provisional leader uid136 (0.599).

## Prerequisites (you provide)
1. **A wallet hotkey** (coldkey + hotkey) funded with a little TAO.
   - Registration cost (recycled): ~**τ0.0019** (trivial) + keep a little for fees/existential.
2. **A server with the axon port open** to the internet (validators must reach it).
   - Default port 8091; ensure firewall/security-group allows inbound TCP.
3. **A public GitHub repo** to host this code (so the manifest `repo_url`/`repo_commit`
   resolve; required to avoid the "repo ≠ observed performance → zeroed" review).

## Step 1 — publish the code (transparency requirement)
```bash
cd poker44-miner-bump
git remote add origin https://github.com/<you>/poker44-bump.git
git push -u origin main
```
The miner self-derives `repo_url`/`repo_commit` from this checkout at runtime, so the
published manifest will automatically match the served code + committed artifact.

## Step 2 — wallet (skip create if you already have one)
```bash
btcli wallet new_coldkey --wallet.name p44
btcli wallet new_hotkey  --wallet.name p44 --wallet.hotkey bump1
# fund the coldkey with a small amount of TAO, then:
btcli wallet balance --wallet.name p44 --subtensor.network finney
```

## Step 3 — register on netuid 126  (THIS spends TAO / goes on-chain)
```bash
btcli subnet register --netuid 126 --wallet.name p44 --wallet.hotkey bump1 \
  --subtensor.network finney
```

## Step 4 — run the miner
```bash
pip install -r requirements.txt
pip install -e /path/to/Poker44-subnet --no-deps   # provides bittensor + poker44.*
WALLET_NAME=p44 HOTKEY=bump1 AXON_PORT=8091 ./run_miner.sh
# or supervised:
pm2 start ecosystem.config.js   # after editing wallet name/hotkey in the file
pm2 logs poker44_bump_miner
```

## Step 5 — read the live result (the whole point)
- First per-window composite appears after ~1 eval window (~10h; needs ≥40 scored chunks).
- Watch our row on the public board:
  `curl -s https://api.poker44.net/api/v1/competition/leaderboard | jq '.data.rows[] | select(.uid==<OUR_UID>)'`
  Key fields: `compositeScore`, `reward`, `rankingQuality`, `humanSafetyPenalty` (want 1.0),
  `latencyMeanSeconds`, `windowCompositeScores`.
- Decision gate: if live reward ≥ ~0.68 (composite ≥ ~0.60) and FPR safe (humanSafetyPenalty=1),
  keep running into the next epoch to contest #1. If below, pull back and iterate.

## Timing
- Current epoch ends **2026-06-27 20:00 UTC**; next epoch starts then (120h winner-take-all).
- **For a measurement read: register anytime — even now.** You get a live composite within ~10–20h.
- **To contest a win: be registered + running before 2026-06-27 20:00 UTC** so you score all 12 windows.

## Active validator hotkeys (permit, stake≥17k — the scorers)
Using `--blacklist.force_validator_permit` accepts all of these automatically. To pin an
explicit allowlist instead, pass `--blacklist.allowed_validator_hotkeys` with:
```
5E2LP6EnZ54m3wS8s1yPvD5c3xo71kQroBw7aUVK32TKeZ5u
5FxQcdsCXcNjWowQ63Y2oeMhN3JRQksejV3aHRr4XmtknM2k
5FZD47WhA1UaVicYAr7pGnWb2YQLMD7uViipDYN2r1AJ5ggD
5HWe7T96SrY4vRvaLmSoriUJ2CGvhRc559U1vZ1pNPuyz2VA
5G9hfkx9wGB1CLMT9WXkpHSAiYzjZb5o1Boyq4KAdDhjwrc5
5CsvRJXuR955WojnGMdok1hbhffZyB4N5ocrv82f3p5A2zVp
5HmkWGB5PVzKCNLB4QxWWHFVEHPAbKKxGyoXW7Evs38gs126
```

## Maintenance
- Retrain when new benchmark dates release (the conformal buffer auto-recalibrates):
  `python train_bump.py --feature-set ext --calib-window 10 --repo-url <url> --repo-commit <c>`
  then commit + push the new artifact.
