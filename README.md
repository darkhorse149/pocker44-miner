# Poker44 Bump Miner (SN126)

A bot-detection miner for Poker44 (Bittensor netuid 126) that **bumps from the
open-source winning approach** (proven signature-collision features + tree
ensemble) and adds a **cliff-robust conformal calibration head** — the one
piece the current leaders leave fragile.

## Why this beats the incumbent calibration

The validator reward zeroes any window whose human false-positive rate hits the
**10% cliff**, and the epoch is winner-take-all over the mean of 12 windows. So
one cliff-zeroed window craters an epoch.

Walk-forward (train past → test next date) on the public benchmark:

| Calibration | mean reward | cliff-hit rate |
|---|---|---|
| incumbent conformal (≈ leader) | 0.41 | **42%** |
| ranking-safe floor (never cross 0.5) | 0.55 | 0% |
| **this miner (maxhuman + drift buffer)** | **0.62–0.67** | **0%** |

Final v2 (extended n-gram features), full-data per-date OOF: **AP 0.883,
mean reward 0.692, 0/31 cliff hits**, ~14 ms/chunk.

### vs the reigning king (uid 32 = `Travis861/Poker44_v1`, our base)

| Axis | King uid 32 (live) | This miner |
|---|---|---|
| rankingQuality (AP) | 0.824 | **0.877–0.883** |
| reward | 0.536 | **0.69** |
| classificationQuality (recall) | 0 (never crosses 0.5) | ~0.25–0.29 |
| latency | 17.9 s (latencyQuality 0.109) | ~1 s (**~max**) |
| cliff risk | none (but recall 0) | **none** |

The king runs pure ranking-safe (recall 0) on a weaker ranker and is slow.
This miner beats it on AP, reward, *and* latency simultaneously.

## How it works

1. `poker44_bump/features.py` — per-hand `schema_*` aggregates **plus chunk-level
   signature-collision features** (how many hands share the exact action / bet /
   actor sequence). Bots repeat sequences; this is the robust, cross-date signal.
2. Averaged ensemble: LightGBM + XGBoost + ExtraTrees + RandomForest.
3. **Conformal head** (`poker44_bump/model.py`): maps the raw bot-probability `p`
   to a final score crossing 0.5 exactly at `T = max(recent_human) + buf·spread`,
   so humans stay below 0.5 under date drift (no cliff) while confident bots cross.

Ranking (AP) is invariant to the monotone head, so the calibration only controls
FPR/recall — never hurting AP.

## Install

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
# for live mining, also install the subnet package so bittensor + poker44.* resolve:
#   git clone https://github.com/Poker44/Poker44-subnet && pip install -e Poker44-subnet
```

## Retrain (refresh calibration on the latest benchmark)

```bash
# download benchmark dates into ./data/training_benchmark_<YYYY-MM-DD>.txt, then:
python train_bump.py --calib-window 6 --buffer 0.5 \
  --repo-url https://github.com/<you>/poker44-bump --repo-commit <commit>
```

Retrain regularly: the conformal `T` is anchored on the most recent dates, so a
fresh artifact keeps the FPR margin aligned with current drift.

## Score a chunk (offline)

```bash
python score_chunk.py sample_chunk.json
```

## Run the miner (live — only when you choose to)

```bash
POKER44_BUMP_MODEL=$(pwd)/models/bump_model.joblib \
python neurons/miner.py --netuid 126 --wallet.name <cold> --wallet.hotkey <hot> \
  --subtensor.network finney --axon.port 8091 \
  --blacklist.allowed_validator_hotkeys <validator_hotkey...>
```

## Files

- `poker44_bump/features.py` — feature extraction (vendored from the proven pipeline)
- `poker44_bump/payload_view.py` — validator sanitizer (training-time parity)
- `poker44_bump/model.py` — `BumpModel` + conformal head
- `train_bump.py` — OOF ensemble + conformal threshold fit + artifact save
- `verify_bump.py` — deployment + honest-generalization checks
- `neurons/miner.py` — live miner entrypoint
- `score_chunk.py` — offline scoring CLI
- `models/bump_model.joblib` — trained artifact
- `model_manifest.json` — transparency manifest

> Status: built and verified offline. Not registered or submitted.
