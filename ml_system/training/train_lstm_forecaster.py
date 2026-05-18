from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import MinMaxScaler
from tensorflow import keras

np.random.seed(42)
tf.keras.utils.set_random_seed(42)
tf.get_logger().setLevel("ERROR")


FEATURE_COLUMNS = [
    "sea_level_m",
    "temperature_C",
    "dissolved_o2",
    "salinity_psu",
    "current_speed_m_s",
    "ph",
    "turbidity_kd",
]
LOOKBACK = 30
TRAIN_SPLIT = 0.70
VAL_SPLIT = 0.85
EPOCHS = 60
BATCH_SIZE = 16


def find_repo_root(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        data_file = candidate / "docs" / "data" / "processed" / "burgas_final.csv"
        if data_file.exists():
            return candidate
    raise FileNotFoundError("Could not locate the repository root from the current working directory.")


def build_sequences(values: np.ndarray, lookback: int):
    inputs = []
    targets = []
    for index in range(lookback, len(values)):
        inputs.append(values[index - lookback:index])
        targets.append(values[index])
    return np.asarray(inputs, dtype=np.float32), np.asarray(targets, dtype=np.float32)


def forecast_steps(model: keras.Model, scaler: MinMaxScaler, recent_window: np.ndarray, steps: int) -> np.ndarray:
    window = np.asarray(recent_window, dtype=np.float32).copy()
    predictions = []
    for _ in range(steps):
        next_step = model.predict(window[None, ...], verbose=0)[0]
        predictions.append(next_step)
        window = np.vstack([window[1:], next_step])
    return scaler.inverse_transform(np.asarray(predictions, dtype=np.float32))


def main() -> None:
    repo_root = find_repo_root(Path.cwd())
    data_path = repo_root / "docs" / "data" / "processed" / "burgas_final.csv"
    artifact_dir = repo_root / "ml_system" / "models" / "artifacts" / "lstm_forecaster"
    outputs_dir = repo_root / "ml_system" / "training" / "outputs"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    outputs_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(data_path, parse_dates=["time"]).sort_values("time").set_index("time")
    if "current_speed_m_s" not in df.columns and {"current_u", "current_v"}.issubset(df.columns):
        df["current_speed_m_s"] = np.sqrt(df["current_u"] ** 2 + df["current_v"] ** 2)

    missing_columns = [column for column in FEATURE_COLUMNS if column not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns in burgas_final.csv: {missing_columns}")

    df = df[FEATURE_COLUMNS].copy()
    df = df.interpolate(method="time").ffill().bfill()

    train_end = int(len(df) * TRAIN_SPLIT)
    val_end = int(len(df) * VAL_SPLIT)

    train_df = df.iloc[:train_end]
    val_df = df.iloc[train_end - LOOKBACK:val_end]
    test_df = df.iloc[val_end - LOOKBACK:]

    scaler = MinMaxScaler()
    train_scaled = scaler.fit_transform(train_df)
    val_scaled = scaler.transform(val_df)
    test_scaled = scaler.transform(test_df)

    X_train, y_train = build_sequences(train_scaled, LOOKBACK)
    X_val, y_val = build_sequences(np.vstack([train_scaled[-LOOKBACK:], val_scaled]), LOOKBACK)
    X_test, y_test = build_sequences(np.vstack([val_scaled[-LOOKBACK:], test_scaled]), LOOKBACK)

    model = keras.Sequential([
        keras.layers.Input(shape=(LOOKBACK, len(FEATURE_COLUMNS))),
        keras.layers.LSTM(64, return_sequences=True),
        keras.layers.Dropout(0.2),
        keras.layers.LSTM(32),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(64, activation="relu"),
        keras.layers.Dense(len(FEATURE_COLUMNS)),
    ])

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3),
        loss="mse",
        metrics=["mae"],
    )

    callbacks = [
        keras.callbacks.EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True),
        keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6, verbose=1),
        keras.callbacks.ModelCheckpoint(
            filepath=artifact_dir / "best_model.keras",
            monitor="val_loss",
            save_best_only=True,
            verbose=0,
        ),
    ]

    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1,
    )

    test_loss, test_mae = model.evaluate(X_test, y_test, verbose=0)
    y_pred = model.predict(X_test, verbose=0)

    y_test_actual = scaler.inverse_transform(y_test)
    y_pred_actual = scaler.inverse_transform(y_pred)
    rmse_by_feature = np.sqrt(mean_squared_error(y_test_actual, y_pred_actual, multioutput="raw_values"))
    mae_by_feature = mean_absolute_error(y_test_actual, y_pred_actual, multioutput="raw_values")

    evaluation = pd.DataFrame(
        {
            "feature": FEATURE_COLUMNS,
            "mae": mae_by_feature,
            "rmse": rmse_by_feature,
        }
    )

    model_path = artifact_dir / "lstm_forecaster.keras"
    scaler_path = artifact_dir / "lstm_forecaster_scaler.joblib"
    features_path = artifact_dir / "lstm_forecaster_features.json"
    config_path = artifact_dir / "lstm_forecaster_config.json"
    summary_path = artifact_dir / "lstm_forecaster_summary.txt"
    forecast_path = artifact_dir / "lstm_forecaster_forecast.json"

    model.save(model_path)
    joblib.dump(scaler, scaler_path)
    features_path.write_text(json.dumps(FEATURE_COLUMNS, indent=2), encoding="utf-8")

    summary_lines = []
    model.summary(print_fn=summary_lines.append)
    summary_text = "\n".join(summary_lines)
    summary_path.write_text(summary_text, encoding="utf-8")

    config = {
        "model_name": "lstm_forecaster",
        "lookback": LOOKBACK,
        "feature_columns": FEATURE_COLUMNS,
        "target_columns": FEATURE_COLUMNS,
        "forecast_frequency": "1D",
        "train_rows": int(len(train_df)),
        "validation_rows": int(len(val_df)),
        "test_rows": int(len(test_df)),
        "test_loss": float(test_loss),
        "test_mae": float(test_mae),
        "feature_metrics": [
            {
                "feature": feature,
                "mae": float(mae),
                "rmse": float(rmse),
            }
            for feature, mae, rmse in zip(FEATURE_COLUMNS, mae_by_feature, rmse_by_feature)
        ],
        "date_range": {
            "start": df.index.min().isoformat(),
            "end": df.index.max().isoformat(),
        },
        "history": {
            "loss": [float(value) for value in history.history.get("loss", [])],
            "val_loss": [float(value) for value in history.history.get("val_loss", [])],
            "mae": [float(value) for value in history.history.get("mae", [])],
            "val_mae": [float(value) for value in history.history.get("val_mae", [])],
        },
    }
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    outputs_dir.joinpath("lstm_forecaster_metrics.csv").write_text(evaluation.to_csv(index=False), encoding="utf-8")
    outputs_dir.joinpath("lstm_forecaster_config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
    outputs_dir.joinpath("lstm_forecaster_summary.txt").write_text(summary_text, encoding="utf-8")

    forecast_steps_count = 365
    forecast_values = forecast_steps(model, scaler, X_test[-1], steps=forecast_steps_count)
    forecast_rows = []
    last_timestamp = df.index.max()
    for day_index, values in enumerate(forecast_values, start=1):
        forecast_rows.append(
            {
                "timestamp": (last_timestamp + pd.Timedelta(days=day_index)).isoformat(),
                "features": {
                    feature: float(value)
                    for feature, value in zip(FEATURE_COLUMNS, values)
                },
            }
        )

    forecast_payload = {
        "model_name": "lstm_forecaster",
        "lookback": LOOKBACK,
        "forecast_frequency": "1D",
        "generated_at": pd.Timestamp.now(tz="UTC").isoformat(),
        "feature_columns": FEATURE_COLUMNS,
        "predictions": forecast_rows,
    }
    forecast_path.write_text(json.dumps(forecast_payload, indent=2), encoding="utf-8")
    pd.DataFrame(
        [{"timestamp": row["timestamp"], **row["features"]} for row in forecast_rows]
    ).to_csv(outputs_dir / "lstm_forecaster_example_forecast.csv", index=False)

    print(f"Saved model: {model_path}")
    print(f"Saved scaler: {scaler_path}")
    print(f"Saved metadata: {config_path}")
    print(f"Saved summary: {summary_path}")
    print(f"Saved forecast: {forecast_path}")
    print(evaluation.to_string(index=False))


if __name__ == "__main__":
    main()
