from pathlib import Path
import sys
from typing import List, Dict, Optional
import hashlib
import os
import uuid
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from datetime import datetime

# ensure project root is on path so we can import ml_system package
project_root = Path(__file__).resolve().parents[2]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from pydantic import BaseModel, Field

from ml_system.models.aquasense_models import ModelLoader

app = FastAPI(title="AquaSense Inference Service")

# Load model on startup (singleton)
MODEL_DIR = Path(__file__).resolve().parents[1] / 'models'
# ModelLoader will find artifacts relative to its module; use default
loader = None

@app.on_event("startup")
def startup_event():
    global loader
    loader = ModelLoader()
    # load optional imputer if available to ensure end-to-end preprocessing
    try:
        _ = loader.model_dir / 'imputer.joblib'
    except Exception:
        pass


class Reading(BaseModel):
    timestamp: str
    temperature_C: Optional[float] = None
    dissolved_o2: Optional[float] = None
    salinity_psu: Optional[float] = None
    sea_level_m: Optional[float] = None
    # allow extra features
    extra: Optional[Dict[str, float]] = None


class PredictRequest(BaseModel):
    mode: str = Field("inline", description="inline or fetch")
    series: Optional[List[Reading]] = None
    metadata: Optional[Dict[str, str]] = None


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


def file_checksum(path: Path) -> str:
    if not path.exists():
        return ""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()[:12]


# Simple rate limiter (per-IP) for MVP
RATE_LIMIT = int(os.environ.get("INFERENCE_RATE_LIMIT_PER_MIN", "60"))
RATE_STORE: Dict[str, Dict[str, int]] = {}


def _rate_limit(request: Request):
    """Simple fixed-window rate limiter per client IP."""
    client = request.client.host if request.client else "unknown"
    window_key = datetime.utcnow().strftime("%Y%m%d%H%M")  # minute precision
    store = RATE_STORE.setdefault(client, {})
    count = store.get(window_key, 0)
    if count >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="rate_limit_exceeded")
    store[window_key] = count + 1


@app.post("/predict")
def predict(req: PredictRequest, request: Request):
    # validate service key if configured
    _validate_service_key(request)
    # rate limit
    _rate_limit(request)

    # Support fetch mode as well as inline
    if req.mode == "fetch":
        metadata = req.metadata or {}
        sensor_id = metadata.get("sensor_id")
        start = metadata.get("start")
        end = metadata.get("end")
        resolution = metadata.get("resolution", "1h")
        if not sensor_id or not start or not end:
            raise HTTPException(status_code=400, detail="fetch mode requires metadata: sensor_id, start, end")
        # fetch data from DB (may raise 501 if not configured)
        rows = None
        try:
            rows = __import__('asyncio').get_event_loop().run_until_complete(fetch_sensor_data(sensor_id, start, end, resolution))
        except Exception as e:
            # propagate HTTPException
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=500, detail=str(e))

        # process rows same as inline
        predictions = []
        anomaly_count = 0
        for r in rows:
            missing = [f for f in ["temperature_C", "dissolved_o2", "salinity_psu", "sea_level_m"] if r.get(f) is None]
            # allow missing values — imputer should have filled them; if still missing, return nulls
            reading = {
                "temperature_C": r.get("temperature_C"),
                "dissolved_o2": r.get("dissolved_o2"),
                "salinity_psu": r.get("salinity_psu"),
                "sea_level_m": r.get("sea_level_m"),
            }
            try:
                is_anomaly = loader.detect_anomaly(reading)
                score = loader.get_anomaly_score(reading)
            except Exception as e:
                is_anomaly = False
                score = 0.0
            if is_anomaly:
                anomaly_count += 1
            predictions.append({
                "timestamp": r.get("timestamp"),
                "is_anomaly": bool(is_anomaly),
                "score": float(score),
                "features": reading,
            })

        try:
            iso_file = loader.model_dir / 'isolation_forest.pkl'
            model_version = file_checksum(iso_file)
        except Exception:
            model_version = "local"

        return {"model_version": model_version, "predictions": predictions, "summary": {"n_points": len(predictions), "anomaly_count": anomaly_count}}

    # inline mode (existing)
    if req.mode != "inline":
        raise HTTPException(status_code=400, detail="Unsupported mode")
    if not req.series:
        raise HTTPException(status_code=400, detail="No series provided")

    predictions = []
    anomaly_count = 0
    for r in req.series:
        # check required features
        missing = []
        for f in ["temperature_C", "dissolved_o2", "salinity_psu", "sea_level_m"]:
            if getattr(r, f) is None:
                missing.append(f)
        if missing:
            raise HTTPException(status_code=400, detail={"error": "missing_features", "missing": missing, "timestamp": r.timestamp})

        reading = {
            "temperature_C": r.temperature_C,
            "dissolved_o2": r.dissolved_o2,
            "salinity_psu": r.salinity_psu,
            "sea_level_m": r.sea_level_m,
        }

        is_anomaly = loader.detect_anomaly(reading)
        score = loader.get_anomaly_score(reading)
        if is_anomaly:
            anomaly_count += 1

        predictions.append({
            "timestamp": r.timestamp,
            "is_anomaly": bool(is_anomaly),
            "score": float(score),
            "features": reading,
        })

    # try to compute a model version from artifact checksum
    try:
        iso_file = loader.model_dir / 'isolation_forest.pkl'
        model_version = file_checksum(iso_file)
    except Exception:
        model_version = "local"

    return {
        "model_version": model_version,
        "predictions": predictions,
        "summary": {
            "n_points": len(predictions),
            "anomaly_count": anomaly_count,
        },
    }

# Simple in-memory job store (MVP only)
JOBS: Dict[str, Dict] = {}

# helper: check inbound service key if configured
def _validate_service_key(request: Request):
    expected = os.environ.get("INFERENCE_SERVICE_KEY")
    if expected:
        provided = request.headers.get("x-service-key")
        if provided != expected:
            raise HTTPException(status_code=401, detail="Invalid service key")


async def fetch_sensor_data(sensor_id: str, start: str, end: str, resolution: str, table: str = None):
    """Fetch sensor data from Supabase REST or Postgres and return a list of readings.

    This implementation performs lazy imports so the FastAPI server can start even if
    optional DB clients (requests/psycopg/pandas) are not installed. If the optional
    libraries are missing, the endpoint will raise an instructive HTTPException.
    """
    # Lazy imports to avoid ModuleNotFoundError when running inline-only tests
    try:
        import requests
    except Exception:
        raise HTTPException(status_code=501, detail={
            "error": "missing_dependency",
            "message": "The 'requests' library is required for fetch mode. Install it with: pip install requests"
        })
    try:
        import pandas as pd
    except Exception:
        raise HTTPException(status_code=501, detail={
            "error": "missing_dependency",
            "message": "The 'pandas' library is required for fetch mode. Install it with: pip install pandas"
        })
    try:
        import joblib
    except Exception:
        raise HTTPException(status_code=501, detail={
            "error": "missing_dependency",
            "message": "The 'joblib' library is required for fetch mode. Install it with: pip install joblib"
        })

    # Optional Postgres client
    try:
        import psycopg
    except Exception:
        psycopg = None

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    postgres_url = os.environ.get("POSTGRES_URL")
    table = table or os.environ.get("SENSOR_TABLE", "readings")

    rows = None
    if supabase_url and supabase_key:
        endpoint = f"{supabase_url.rstrip('/')}/rest/v1/{table}"
        q = f"?sensor_id=eq.{sensor_id}&timestamp=gte.{start}&timestamp=lte.{end}&select=timestamp,temperature_C,dissolved_o2,salinity_psu,sea_level_m&order=timestamp.asc"
        url = endpoint + q
        headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}
        resp = requests.get(url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail={"error": "supabase_error", "status_code": resp.status_code, "body": resp.text})
        rows = resp.json()
    elif postgres_url:
        if psycopg is None:
            raise HTTPException(status_code=501, detail={
                "error": "missing_dependency",
                "message": "The 'psycopg' library is required to query Postgres. Install it with: pip install psycopg"
            })
        try:
            with psycopg.connect(postgres_url) as conn:
                with conn.cursor() as cur:
                    sql = f"SELECT timestamp, temperature_C, dissolved_o2, salinity_psu, sea_level_m FROM {table} WHERE sensor_id = %s AND timestamp >= %s AND timestamp <= %s ORDER BY timestamp ASC"
                    cur.execute(sql, (sensor_id, start, end))
                    fetched = cur.fetchall()
                    rows = [
                        {
                            "timestamp": r[0].isoformat() if hasattr(r[0], 'isoformat') else str(r[0]),
                            "temperature_C": r[1],
                            "dissolved_o2": r[2],
                            "salinity_psu": r[3],
                            "sea_level_m": r[4],
                        }
                        for r in fetched
                    ]
        except Exception as e:
            raise HTTPException(status_code=502, detail={"error": "postgres_error", "message": str(e)})
    else:
        raise HTTPException(status_code=501, detail={
            "error": "db_not_configured",
            "message": "Provide SUPABASE_URL/SUPABASE_SERVICE_KEY or POSTGRES_URL to enable fetch mode."
        })

    # Convert rows to DataFrame
    df = pd.DataFrame(rows)
    if df.empty:
        return []

    df["timestamp"] = pd.to_datetime(df["timestamp"])  # parse
    if df["timestamp"].dt.tz is None:
        df["timestamp"] = df["timestamp"].dt.tz_localize("UTC")
    else:
        df["timestamp"] = df["timestamp"].dt.tz_convert("UTC")

    df = df.set_index("timestamp").sort_index()

    # Resample according to resolution
    # Map common resolution inputs
    res_map = {"15m": "15T", "1h": "1H", "1d": "1D"}
    rule = res_map.get(resolution, resolution)
    try:
        df_resampled = df.resample(rule).mean()
    except Exception:
        df_resampled = df

    try:
        start_ts = pd.to_datetime(start)
        if start_ts.tzinfo is None:
            start_ts = start_ts.tz_localize("UTC")
        end_ts = pd.to_datetime(end)
        if end_ts.tzinfo is None:
            end_ts = end_ts.tz_localize("UTC")
        full_idx = pd.date_range(start=start_ts, end=end_ts, freq=rule, tz="UTC")
        df_resampled = df_resampled.reindex(full_idx)
    except Exception:
        pass

    imputer_path = loader.model_dir / 'imputer.joblib'
    if imputer_path.exists():
        try:
            imputer = joblib.load(imputer_path)
            values = df_resampled[loader.features].values
            imputed = imputer.transform(values)
            df_resampled[loader.features] = imputed
        except Exception:
            pass

    result = []
    for idx, row in df_resampled.iterrows():
        result.append({
            "timestamp": idx.isoformat().replace("+00:00", "Z"),
            "temperature_C": None if pd.isna(row.get("temperature_C")) else float(row.get("temperature_C")),
            "dissolved_o2": None if pd.isna(row.get("dissolved_o2")) else float(row.get("dissolved_o2")),
            "salinity_psu": None if pd.isna(row.get("salinity_psu")) else float(row.get("salinity_psu")),
            "sea_level_m": None if pd.isna(row.get("sea_level_m")) else float(row.get("sea_level_m")),
        })

    return result


# Replace fetch_sensor_data_stub usage with fetch_sensor_data
@app.post("/predict/jobs")
async def predict_jobs(req: PredictRequest, background_tasks: BackgroundTasks, request: Request):
    """Enqueue a prediction job. Processes in background for MVP and returns job_id."""
    _validate_service_key(request)
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "id": job_id,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "result": None,
        "error": None,
    }

    # Schedule background processing
    background_tasks.add_task(_process_job, job_id, req)

    return {"job_id": job_id, "status": "queued"}


async def _process_job(job_id: str, req: PredictRequest):
    JOBS[job_id]["status"] = "running"
    try:
        # For inline mode, reuse predict logic
        if req.mode == "inline":
            # simple synchronous reuse: build same result structure
            preds = []
            anomaly_count = 0
            for r in req.series or []:
                reading = {
                    "temperature_C": r.temperature_C,
                    "dissolved_o2": r.dissolved_o2,
                    "salinity_psu": r.salinity_psu,
                    "sea_level_m": r.sea_level_m,
                }
                is_anomaly = loader.detect_anomaly(reading)
                score = loader.get_anomaly_score(reading)
                if is_anomaly:
                    anomaly_count += 1
                preds.append({"timestamp": r.timestamp, "is_anomaly": bool(is_anomaly), "score": float(score), "features": reading})

            JOBS[job_id]["result"] = {"predictions": preds, "summary": {"n_points": len(preds), "anomaly_count": anomaly_count}}
            JOBS[job_id]["status"] = "completed"
        elif req.mode == "fetch":
            # attempt to fetch sensor data
            metadata = req.metadata or {}
            sensor_id = metadata.get("sensor_id")
            start = metadata.get("start")
            end = metadata.get("end")
            resolution = metadata.get("resolution", "1h")
            data = await fetch_sensor_data(sensor_id, start, end, resolution)
            # data should be list of readings; mimic inline processing
            # (Not implemented in MVP)
            JOBS[job_id]["status"] = "failed"
            JOBS[job_id]["error"] = {"error": "not_implemented", "message": "fetch mode processing not implemented"}
        else:
            JOBS[job_id]["status"] = "failed"
            JOBS[job_id]["error"] = {"error": "invalid_mode", "message": f"Unknown mode: {req.mode}"}
    except Exception as e:
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["error"] = {"error": "processing_error", "message": str(e)}


@app.get("/predict/jobs/{job_id}")
async def get_job(job_id: str, request: Request):
    _validate_service_key(request)
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    return job


@app.get("/models")
async def get_models(request: Request):
    _validate_service_key(request)
    models = loader.available_models()
    # try to load model_metadata.json if present
    meta_file = loader.model_dir / 'model_metadata.json'
    metadata = {}
    if meta_file.exists():
        try:
            import json

            with open(meta_file, 'r') as f:
                metadata = json.load(f)
        except Exception:
            metadata = {}

    return {"models": models, "metadata": metadata}
