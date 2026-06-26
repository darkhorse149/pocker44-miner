"""Self-contained trainer for the Poker44 'bump' miner.

Pipeline:
  1. Load all released benchmark dates (training_benchmark_<date>.txt).
  2. Build features = chunk_features(prepare_hand_for_miner(hand)) per chunk
     (matches the reference build_dataset miner_visible convention).
  3. 5-fold stratified OOF predictions with an averaged tree ensemble
     (LightGBM + XGBoost + ExtraTrees + RandomForest).
  4. Fit the CLIFF-ROBUST conformal threshold T on the most-recent W dates'
     OOF human scores: T = max(human) + BUF * (max(human) - q90(human)).
  5. Refit the ensemble on ALL data and save {models, feature_names, T, meta}.

Reports OOF AP and the simulated validator reward / per-date FPR at T.
"""
from __future__ import annotations
import argparse, glob, json, os, sys, time
from pathlib import Path
import numpy as np
import joblib

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from poker44_bump.features import chunk_features
from poker44_bump.features_ext import chunk_features_ext
from poker44_bump.payload_view import prepare_hand_for_miner
from poker44_bump.model import BumpModel, conformal_map

from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import average_precision_score
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from lightgbm import LGBMClassifier
from xgboost import XGBClassifier


def load_examples(data_dir: str, feature_set: str = "ext"):
    extractor = chunk_features_ext if feature_set == "ext" else chunk_features
    rows, labels, dates = [], [], []
    files = sorted(glob.glob(os.path.join(data_dir, "training_benchmark_*.txt")))
    if not files:
        raise FileNotFoundError(f"no benchmark files in {data_dir}")
    for fp in files:
        payload = json.load(open(fp))
        data = payload.get("data", payload)
        src_date = str(data.get("sourceDate") or Path(fp).stem.split("_")[-1])
        for rec in data.get("chunks", []):
            groups = rec.get("chunks") or []
            gts = rec.get("groundTruth") or rec.get("groundTruthLabels") or []
            rec_date = str(rec.get("sourceDate") or src_date)
            for hands, label in zip(groups, gts):
                if not isinstance(hands, list):
                    continue
                visible = [prepare_hand_for_miner(h) for h in hands if isinstance(h, dict)]
                if not visible:
                    continue
                feats = extractor(visible)
                feats["hand_count"] = float(len(visible))
                rows.append(feats); labels.append(int(label)); dates.append(rec_date)
    return rows, np.array(labels), np.array(dates)


def make_ensemble(seed=42):
    return [
        LGBMClassifier(n_estimators=400, learning_rate=0.03, num_leaves=31, subsample=0.8,
                       colsample_bytree=0.8, min_child_samples=8, verbose=-1, random_state=seed),
        XGBClassifier(n_estimators=400, learning_rate=0.03, max_depth=4, subsample=0.8,
                      colsample_bytree=0.8, eval_metric="logloss", verbosity=0, random_state=seed),
        ExtraTreesClassifier(n_estimators=500, max_features="sqrt", min_samples_leaf=2,
                             n_jobs=-1, random_state=seed),
        RandomForestClassifier(n_estimators=500, max_features="sqrt", min_samples_leaf=2,
                               n_jobs=-1, random_state=seed),
    ]


def avg_proba(models, X):
    return np.mean([np.asarray(m.predict_proba(X))[:, 1] for m in models], axis=0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=str(HERE / "data"))
    ap.add_argument("--output", default=str(HERE / "models" / "bump_model.joblib"))
    ap.add_argument("--calib-window", type=int, default=6, help="recent dates for threshold fit")
    ap.add_argument("--buffer", type=float, default=-1.0,
                    help="drift buffer coef; <0 = auto-select smallest 0-cliff buffer (max reward)")
    ap.add_argument("--folds", type=int, default=5)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--repo-url", default="")
    ap.add_argument("--repo-commit", default="")
    ap.add_argument("--feature-set", choices=["base", "ext"], default="ext")
    args = ap.parse_args()

    rows, y, dates = load_examples(args.data_dir, feature_set=args.feature_set)
    feat_names = sorted({k for r in rows for k in r})
    X = np.array([[float(r.get(n, 0.0)) for n in feat_names] for r in rows], dtype=np.float64)
    uniq = sorted(set(dates.tolist()))
    print(f"examples={len(y)} feats={len(feat_names)} dates={len(uniq)} ({uniq[0]}..{uniq[-1]}) "
          f"bot={int(y.sum())} human={int((1-y).sum())}")

    # ---- OOF predictions ----
    oof = np.zeros(len(y), dtype=np.float64)
    skf = StratifiedKFold(n_splits=args.folds, shuffle=True, random_state=args.seed)
    for tr, va in skf.split(X, y):
        models = make_ensemble(args.seed)
        for m in models:
            m.fit(X[tr], y[tr])
        oof[va] = avg_proba(models, X[va])
    oof_ap = average_precision_score(y, oof)
    print(f"OOF AP (ranking quality) = {oof_ap:.4f}")

    # ---- conformal threshold: AUTO-SELECT buffer for 0 OOF cliffs, max reward ----
    recent = set(uniq[-args.calib_window:])
    hmask = (y == 0) & np.isin(dates, list(recent))
    human_recent = oof[hmask]
    hmax = float(human_recent.max()); hq90 = float(np.quantile(human_recent, 0.90))

    def reward_at(scores, labels, T):
        preds = (scores >= T).astype(int); yt = labels.astype(int)
        tp=((preds==1)&(yt==1)).sum();fp=((preds==1)&(yt==0)).sum()
        tn=((preds==0)&(yt==0)).sum();fn=((preds==0)&(yt==1)).sum()
        fpr=fp/max(tn+fp,1);rec=tp/max(tp+fn,1)
        a=average_precision_score(yt,scores) if (yt.max()==1 and yt.min()==0) else 0.0
        saf=0.0 if fpr>=0.10 else (1-fpr)**2
        return (0.65*a+0.35*rec)*saf, fpr, rec

    def eval_T(T):
        R=[];cliff=0;F=[]
        for d in uniq:
            m = dates==d
            r,fpr,_ = reward_at(oof[m], y[m], T); R.append(r); F.append(fpr); cliff+=int(fpr>=0.10)
        return float(np.mean(R)), cliff, float(np.max(F))

    if args.buffer >= 0:                       # fixed buffer (back-compat)
        buffers = [args.buffer]
    else:                                      # auto-tune: smallest safe buffer, max reward
        buffers = [round(0.3 + 0.1*k, 2) for k in range(0, 23)]  # 0.3 .. 2.5
    best = None
    for buf in buffers:
        T = float(min(max(hmax + buf*(hmax - hq90), 0.05), 0.999))
        mr, cliff, mfpr = eval_T(T)
        # prefer 0 cliffs, then max reward; fall back to fewest cliffs
        key = (cliff, -mr)
        if best is None or key < best[0]:
            best = (key, buf, T, mr, cliff, mfpr)
    _, buffer_used, T, mr, cliff, mfpr = best
    args.buffer = buffer_used
    print(f"conformal T={T:.4f} buffer={buffer_used} (auto) recent human max={hmax:.4f} q90={hq90:.4f} window={args.calib_window}d")
    print(f"per-date OOF @T: mean_reward={mr:.3f} cliff_hits={cliff}/{len(uniq)} max_fpr={mfpr:.3f}")

    # ---- refit on ALL data, save ----
    final_models = make_ensemble(args.seed)
    for m in final_models:
        m.fit(X, y)
    meta = {
        "model_name": "poker44-bump-robust",
        "model_version": "bump-conformal-v3-ext11" if args.feature_set == "ext" else "bump-conformal-v1",
        "framework": "tree-ensemble+conformal",
        "feature_set": args.feature_set,
        "ensemble_combiner": "mean(lgbm,xgb,extratrees,rf)",
        "conformal_threshold": T, "calib_window_days": args.calib_window, "buffer_coef": args.buffer,
        "oof_ap": round(float(oof_ap), 5), "benchmark_rows": int(len(y)),
        "train_source_dates": uniq, "feature_count": len(feat_names),
        "repo_url": args.repo_url, "repo_commit": args.repo_commit,
        "built_unix": int(time.time()),
    }
    model = BumpModel(final_models, feat_names, T, metadata=meta)
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, args.output)
    print(f"saved -> {args.output}  ({Path(args.output).stat().st_size//1024} KB)")


if __name__ == "__main__":
    main()
