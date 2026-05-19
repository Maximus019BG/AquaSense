"""Train Isolation Forest on current processed data and save artifacts.

Usage:
    python train_isolation_forest.py --contamination 0.01
"""
from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import MinMaxScaler


FEATURE_COLUMNS = ["temperature_C", "dissolved_o2", "salinity_psu", "sea_level_m"]


def find_data_file(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        data_file = candidate / "docs" / "data" / "processed" / "burgas_final.csv"
        if data_file.exists():
            return data_file
    raise FileNotFoundError("Could not locate burgas_final.csv from current directory")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--contamination", type=float, default=0.01)
    parser.add_argument("--output-dir", type=str, default=None)
    args = parser.parse_args()

    repo_root = Path.cwd()
    data_path = find_data_file(repo_root)

    df = pd.read_csv(data_path, parse_dates=["time"]).sort_values("time").set_index("time")
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in data: {missing}")

    X = df[FEATURE_COLUMNS].copy()
    X = X.interpolate(method="time").ffill().bfill()

    # imputer + scaler
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)

    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    iso = IsolationForest(contamination=float(args.contamination), random_state=42)
    iso.fit(X_scaled)

    # derive anomaly threshold from training scores (lower = more anomalous)
    scores = iso.score_samples(X_scaled)
    # contamination is proportion of expected anomalies -> threshold is quantile
    q = float(args.contamination)
    threshold = float(np.quantile(scores, q)) if q > 0 else float(np.min(scores))

    # Save artifacts
    artifacts_dir = Path(args.output_dir) if args.output_dir else repo_root / "ml_system" / "models" / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(iso, artifacts_dir / "isolation_forest.pkl")
    joblib.dump(scaler, artifacts_dir / "scaler.pkl")
    joblib.dump(imputer, artifacts_dir / "imputer.joblib")
    # save threshold for use at inference time
    (artifacts_dir / "anomaly_threshold.json").write_text(json.dumps({"threshold": threshold}), encoding="utf-8")

    print("Saved isolation_forest.pkl, scaler.pkl, imputer.joblib, anomaly_threshold.json to", artifacts_dir)


if __name__ == "__main__":
    main()
