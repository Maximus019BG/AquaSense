# Digital Twin of a Water Body - Implementation Plan

This document now includes a focused implementation plan for providing model predictions via the existing Next.js frontend. It describes recommended architecture, API design, concrete file locations, timelines, testing, deployment, and security.

---

## Summary (short)
- Goal: provide an endpoint so users can request anomaly predictions and scores for arbitrary time ranges/resolutions from the AquaSense model.
- Constraint: the project frontend is Next.js; we should integrate with that while reusing the existing Python model artifacts (joblib) with minimal rework.
- Recommended approach: run a small Python inference service (FastAPI) that reuses `ml_system/models/aquasense_models.py`, and expose a Next.js server route that proxies/forwards requests to it. Optionally, for serverless-only deployment, convert the model to ONNX and run in Node with `onnxruntime-node` inside Next.js serverless route.

---

## Architecture (recommended)

- Next.js app (web/) — user-facing UI, request forms, charts and history; contains a server route that proxies to the inference service or enqueues jobs.
- Python inference microservice (ml_system/serving/) — FastAPI app that loads joblib artifacts via the existing `ModelLoader` and exposes REST endpoints for predictions and batch jobs.
- Persistence (optional) — Supabase (existing lib), or a simple Postgres table to store prediction job results and metadata.
- Orchestration — Docker Compose for local development; containers: web (Next.js), inference (FastAPI), optionally db (Postgres) and redis (for queues).

Diagram:

Next.js (web/) <-- HTTP (proxy/auth) --> FastAPI inference (ml_system/serving/) --> uses (ml_system/models/artifacts)

---

## Why this approach
- Reuse existing Python code and artifacts (joblib, imputer, scaler) with no re-training or porting overhead.
- FastAPI is lightweight and production-ready; model loads once at startup (singleton) to avoid cold loads.
- Next.js remains the frontend and can be kept server-centric (server routes) while delegating heavy inference logic to Python.
- Option to export to ONNX later if serverless Node-only deployment is required.

---

## API design (finalized)

1) POST /predict (FastAPI)
- Modes:
  - mode=fetch: provide sensor_id, start, end, resolution. Service fetches sensor data (Supabase or DB) and returns predictions.
  - mode=inline: provide array of timestamped readings and metadata; service returns predictions for those points.
- Request JSON (mode=inline example):
  {
    "mode": "inline",
    "series": [{ "timestamp":"2026-05-01T00:00:00Z", "temperature_C":22.1, "dissolved_o2":6.2, "salinity_psu":18.5, "sea_level_m":0.12 }, ...],
    "metadata": { "sensor_id": "s-123" }
  }
- Response JSON:
  {
    "model_version":"20260512_f3a1",
    "predictions": [ { "timestamp":"...","is_anomaly":true,"score":-0.85,"features":{...} }, ... ],
    "summary": { "start":"...","end":"...","n_points":100, "anomaly_count":5 }
  }

2) POST /predict/jobs (FastAPI)
- For long-range windows: enqueue a job, return job_id; client polls GET /predict/jobs/{job_id}.

3) GET /models (FastAPI)
- Returns available models, version/hash, created_at and features list.

4) Next.js server route: `web/src/app/api/predict/route.ts`
- Validates incoming requests from the browser, attaches user auth/session, and forwards to FastAPI. It also enforces request size limits and rate-limits per API key.

---

## Data handling & preprocessing rules
- Always use `feature_names.json` to build feature vectors in the correct order.
- Impute with `imputer.joblib` before scaling: imputer -> scaler -> model.predict/score_samples.
- Timestamps: clients send ISO8601 strings; server normalizes to UTC. Responses are UTC.
- Resolution: support resampling rules (mean aggregation). Provide parameter `resolution` (e.g., `15m`, `1h`, `1d`) — server will aggregate raw sensor values into that resolution before predictions.
- Input validation: enforce numeric ranges and fill missing optional features using the imputer.

---

## File-level implementation (concrete tasks)

Add the following files and implement accordingly:

- ml_system/serving/fastapi_app.py
  - FastAPI app with endpoints above.
  - Import `ml_system.models.aquasense_models.ModelLoader` to load artifacts.
  - Use Pydantic models for request/response validation.
  - Vectorize inference: collect feature matrix (N x F), impute, scale, predict score_samples and predict.
  - Health check `/healthz` and metrics `/metrics` (Prometheus friendly).

- ml_system/serving/requirements.txt
  - fastapi, uvicorn[standard], joblib, scikit-learn, pydantic, numpy, pandas, python-dateutil, prometheus-client

- ml_system/serving/Dockerfile
  - Minimal Python image that copies artifacts, installs requirements, and runs Uvicorn.

- web/src/app/api/predict/route.ts
  - Next.js server route that accepts client requests, validates, and forwards to FastAPI. Adds authentication (supabase jwt) and basic rate-limiting.

- web/src/lib/apiClient.ts
  - Helper to call Next.js server route and handle retries/pagination.

- web/src/components/prediction/PredictionForm.tsx
  - UI for selecting sensor, start/end, resolution, and submitting a prediction request.

- web/src/components/prediction/PredictionResults.tsx
  - Visualization of returned predictions, anomaly markers on charts, and downloadable CSV.

- web/server/db/predictions.ts
  - Optional: functions to store prediction job results into Supabase/Postgres.

- docker-compose.yml (root)
  - Services: web, inference, db (optional), redis (optional). Use local networks to connect.

- scripts/convert_to_onnx.sh (optional)
  - If later converting, use skl2onnx to export the IsolationForest/scaler pipeline.

---

## Implementation checklist (prioritized)

MVP (1–3 days):
- [ ] Create `ml_system/serving/fastapi_app.py` with `POST /predict` (mode=inline) that uses `ModelLoader` and returns predictions.
- [ ] Add `requirements.txt` and `Dockerfile` for the inference service.
- [ ] Implement `web/src/app/api/predict/route.ts` to proxy to FastAPI and return responses to the frontend.
- [ ] Add basic UI components: `PredictionForm` + `PredictionResults` that call the API and show a chart (use existing chart components).
- [ ] Local test with sample `ml_system/models/artifacts` and a few series.

Phase 2 (3–7 days):
- [ ] Add mode=fetch to FastAPI to retrieve sensor data from Supabase/Postgres.
- [ ] Add job queue for long-range requests (BullMQ in Node or RQ/Celery in Python); implement `POST /predict/jobs` and job status endpoint.
- [ ] Add authentication & rate-limiting in Next.js API route.
- [ ] Persist prediction results and add retrieval endpoints.

Phase 3 (optional 1–2 weeks):
- [ ] Convert model to ONNX and implement Node inference (for serverless deployments).
- [ ] Add unit and integration tests covering model loader, endpoints, and Next.js proxy.
- [ ] Add observability: Prometheus metrics, logs, and anomaly-rate alerting.

---

## Deployment & ops
- For staging/prod: containerize both `web` and `inference` services and deploy using one of: Docker Compose (small), Kubernetes (production), or Cloud Run + Cloud SQL. Keep the inference service behind HTTPS and protected by auth.
- Health checks for both services, auto-restart on crash.
- For Vercel (Next.js): keep frontend on Vercel and host inference service separately (e.g. Cloud Run, Heroku, Fly.io). Use environment variables in `web` to point to the inference service base URL.

---

## Security & quotas
- Require authentication (Supabase JWT or API key) for prediction endpoints.
- Enforce request size limits and maximum allowed points per request (e.g., 10000 points).
- Log requests with sampling and do not store PII. Rate-limit by API key.

---

## Testing strategy
- Unit tests for `ModelLoader` using synthetic readings (place tests under `ml_system/tests/test_model_loader.py`).
- Integration tests for FastAPI endpoints using `TestClient` from `fastapi.testclient`.
- End-to-end tests: Next.js server route + FastAPI using Docker Compose in CI to run both services and run Selenium or Playwright tests to exercise the UI.

---

## Observability
- Expose Prometheus metrics from FastAPI (requests_total, latency_seconds, anomalies_returned_total, model_load_time_seconds).
- Log prediction job duration and sample counts.
- Create dashboard (Grafana) for latency and anomaly-rate alerts.

---

## Model lifecycle & versioning
- Add `model_metadata.json` to `ml_system/models/artifacts` with fields: model_version, created_at, training_commit, checksum.
- Include model_version in every prediction response.
- When updating model artifacts, publish new artifact set and update metadata; keep old artifact sets for audit.

---

## Export to ONNX (optional path)
- If you must run inference inside Next.js serverless functions (Vercel), export your scikit-learn pipeline (imputer+scaler+isolation_forest) to ONNX.
- Tools: `skl2onnx` and `onnxruntime-node`.
- Steps:
  1. Build a pipeline object in Python: Pipeline(steps=[('imputer', imputer), ('scaler', scaler), ('clf', isolation_forest)])
  2. Use `skl2onnx.convert_sklearn` to export to ONNX.
  3. Add `onnxruntime-node` to `web/package.json` and load the ONNX model in `web/src/app/api/predict/route.ts`.

Notes: IsolationForest support in ONNX can be limited; evaluate output parity vs joblib model.

---

## Example request/response (concise)

Request (inline mode):

{
  "mode":"inline",
  "series":[ {"timestamp":"2026-05-01T00:00:00Z","temperature_C":22.1,"dissolved_o2":6.2,"salinity_psu":18.5,"sea_level_m":0.12 } ]
}

Response:

{
  "model_version":"20260512_f3a1",
  "predictions":[ {"timestamp":"2026-05-01T00:00:00Z","is_anomaly":false,"score":-0.12,"features":{...}} ],
  "summary": {"n_points":1,"anomaly_count":0}
}

---

## Timeline (conservative)
- MVP (PoC): 2–4 days — inline predictions, Next.js proxy, simple UI.
- Integration: 1 week — DB fetch mode, job queue, storage, authentication.
- Production hardening: 1–2 weeks — monitoring, load testing, deployment automation.

---

## Next immediate actions (what I will implement if you want)
- Scaffold `ml_system/serving/fastapi_app.py` (with Pydantic models, single-file MVP) and `requirements.txt`.
- Add `web/src/app/api/predict/route.ts` proxy route and a minimal `PredictionForm` + `PredictionResults` UI in `web/src/components/prediction/`.
- Add a `docker-compose.yml` for `web` + `inference` for local development.

Tell me if you want me to scaffold those files now (FastAPI app + Next.js route + docker-compose).