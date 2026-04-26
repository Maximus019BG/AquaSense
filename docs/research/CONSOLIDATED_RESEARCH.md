# Digital Twin of a Water Body - Consolidated Research & Workflow Guide

This document consolidates all research, planning, and implementation details for the Digital Twin Water Body hackathon project.

---

## 1. Project Overview

### What Is This Project?

A **digital twin** is a dynamic, virtual replica of a physical system. Our project creates a digital twin of a water body (lagoon or shoreline near Saint Anastasia Island) that:

- **Shows real-time state** — Live data from 5 water quality parameters
- **Predicts future state** — AI forecasts what the water will look like in 24 hours
- **Detects anomalies automatically** — AI spots pollution events invisible to the human eye
- **Visualizes data immersively** — 3D water scene that changes color based on water quality

### The "Wow Factor"

Standing at Saint Anastasia Island, visitors see:
- **Real water** in front of them
- **3D digital replica** on a screen showing invisible data
- **Glowing zones** where pollution might spread
- **Interactive controls** — touch to see what happens in 24 hours
- **AI alerts** — warning pulses when problems are detected

---

## 2. Why This Wins

| Typical Hackathon Project | Our Digital Twin |
|---------------------------|------------------|
| Shows current sensor reading on a graph | Shows a living, breathing 3D water body |
| Only tells you what's happening NOW | Predicts what will happen in 24 HOURS |
| Static dashboard with numbers | Immersive 3D visualization you can walk around |
| Detects problems manually | AI automatically detects invisible anomalies |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SYSTEM LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Layer 1   │    │   Layer 2   │    │   Layer 3   │        │
│  │ Simulation  │───▶│  AI Models  │───▶│   Backend   │        │
│  │   Engine    │    │             │    │   (FastAPI) │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│        │                   │                   │               │
│        │                   │                   │               │
│  Generates          Detects          Serves REST +            │
│  water data         anomalies +      WebSocket                │
│  with anomalies    predicts 24h      endpoints                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐                          │
│  │   Layer 4   │    │   Layer 5   │                          │
│  │   3D View    │    │  Dashboard  │                          │
│  │  (Three.js)  │    │ (Chart.js)  │                          │
│  └─────────────┘    └─────────────┘                          │
│        │                   │                                  │
│        │                   │                                  │
│  Real-time visual    Charts + alerts                         │
│  of water state      + forecast                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. The 5 Parameters We Monitor

| Parameter | Normal Range | Why It Matters | Anomaly Indicator |
|-----------|--------------|----------------|-------------------|
| **Temperature** | 15-30°C | Affects all chemical/biological processes | Thermal stratification = layer shift |
| **pH** | 6.5-8.5 | Indicates health of aquatic ecosystem | pH crash = pollution spike |
| **Turbidity** | 0-100 NTU | Water clarity, sediment/algae | High turbidity = runoff/algae bloom |
| **Dissolved Oxygen** | 5-10 mg/L | Life-sustaining for fish | Low DO = dead zone / fish kill risk |
| **Water Level** | Tidal pattern | Flooding, storm surge | Rapid rise = storm approaching |

---

## 5. Team Structure & Responsibilities

### Team of 5 People

| Person | Role | Responsibilities |
|--------|------|------------------|
| **Person 1** | Simulation Engine | Pure Python + NumPy. Generates realistic time-series for all 5 parameters. **Critically**: Injects synthetic anomaly events (pH drop = pollution, temperature stratification = thermal shift). |
| **Person 2** | AI Models | Trains Isolation Forest on clean data to detect anomalies. Trains LSTM (Keras/TensorFlow) for 24-hour forecast. Scores the AI bonus criterion. |
| **Person 3** | Backend | FastAPI app. Subscribes to MQTT stream from Person 1. Runs models from Person 2. Exposes REST endpoints: `/live`, `/forecast`, `/alerts`. |
| **Person 4** | 3D Water Scene | Three.js. Rendered sea/river surface whose color and choppiness change based on parameters. pH drops → water turns red. Low O₂ → warning pulse. Showstopper visual. |
| **Person 5** | Dashboard + Presentation | Assembles frontend: Chart.js live graphs, alert timeline, 24h forecast, 3D scene. Owns demo narrative and slide deck. |

---

## 6. Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Simulation | Python, NumPy, SciPy | Generate realistic water data with anomaly events |
| Messaging | MQTT (paho-mqtt) | Real-time pub/sub for data streaming |
| AI/ML | TensorFlow/Keras, scikit-learn | LSTM forecast + Isolation Forest anomaly detection |
| Backend | FastAPI + WebSocket | Async API + real-time streaming to frontend |
| 3D Water | Three.js (ocean shader) | Realistic water visualization (jbouny/ocean) |
| Charts | Chart.js | Live graphs and forecast visualization |
| Container | Docker | Easy deployment |

---

## 7. MQTT Topics

```
water/parameters     # Live sensor data (1 msg/sec)
water/alerts         # Anomaly notifications  
water/forecast       # 24h predicted values
```

---

## 8. REST API Endpoints

| Endpoint | Returns | Update Frequency |
|----------|---------|-------------------|
| `/live` | Current values for all 5 parameters | Real-time (1/sec) |
| `/forecast` | 24-hour predicted values | Every 5 minutes |
| `/alerts` | Active anomaly alerts | On detection |
| `/ws` | WebSocket for real-time push | Continuous stream |

---

## 9. 3D Visual Mappings

| Parameter Condition | Visual Effect |
|---------------------|---------------|
| pH < 6.5 | Water turns slightly red/green (pollution warning) |
| Dissolved O₂ < 4 mg/L | Blue pulsing glow (hypoxia alert) |
| Turbidity > 60 NTU | Water becomes murky, less transparent |
| Temperature rising | Subtle warm color shift |
| Water level rising | Waves get taller |

---

## 10. 2-Week Implementation Timeline

### Week 1: Core Infrastructure & AI

| Day | Person 1 (Sim) | Person 2 (AI) | Person 3 (Backend) | Person 4 (3D) | Person 5 (Dashboard) |
|-----|----------------|---------------|--------------------|---------------|----------------------|
| **Mon** | Setup NumPy project, define 5 water params, generate base sine-wave + noise | Research Isolation Forest params for water quality | Setup FastAPI project, define data models | Research Three.js ocean shaders, setup scene | Research Chart.js real-time patterns |
| **Tue** | Implement diurnal cycles + seasonal drift. Random walk behavior | Train Isolation Forest on clean data, test detection | Connect FastAPI to MQTT, create /live endpoint | Map parameters to visuals (pH→color, DO→pulse) | Create HTML layout, embed 3D canvas |
| **Wed** | **Inject anomaly events** (pH crash, thermal stratification). MQTT publisher | Train LSTM on generated data, test 24h forecast | Add /forecast + /alerts. WebSocket for real-time | Refine shader: color gradients, wave intensity | Add Chart.js graphs, connect WebSocket |
| **Thu** | Debug edge cases. Document parameter ranges | Fine-tune thresholds, document accuracy | CORS, error handling, API docs | Add alert visualizations (glow, pulse) | Build alert timeline panel |
| **Fri** | **INTEGRATION TEST** - Sim→MQTT→Backend→Frontend | Validate model metrics | Deploy to Docker, test full pipeline | Verify 3D matches parameter values | Connect forecast chart, test all |

### Week 2: Polish & Demo

| Day | Focus |
|-----|-------|
| **Mon** | Bug fixes from integration. Optimize LSTM inference. Data normalization |
| **Tue** | UI/UX polish. "Rewind/fast-forward" time controls. Color scheme consistency |
| **Wed** | System stress test. Mock sensor failover. Performance optimization |
| **Thu** | **Rehearsal 1** - Full demo run with timer. Fix flow issues. Prepare backup |
| **Fri** | **Rehearsal 2** + demo day - Final tweaks, backup laptop, all cables/adapters |

---

## 11. Daily Sync Meetings

**5 minutes every day** to ensure integration works:

1. Share what you completed yesterday
2. Confirm data format matches (JSON schema)
3. Test your piece connects to the whole system
4. Flag blockers early

---

## 12. Hardware Requirements

### For Hackathon (Simulation-Based)

**No sensors needed** — run everything on your laptop with simulated data!

| Item | Purpose | Cost (BGN) |
|------|---------|------------|
| Your laptop | Runs everything | 0 |
| Portable Monitor | Display 3D at demo site | 150-300 |
| HDMI Cable (5m+) | Connect to monitor | 10-20 |
| Power Bank | Backup power | 40-80 |
| **Total** | | **200-400** |

### For Real Deployment (Post-Hackathon)

| Component | Price (BGN) | Purpose |
|-----------|-------------|---------|
| ESP32 Dev Board | 15-25 | Sensor connectivity |
| DS18B20 Waterproof | 7-12 | Temperature |
| pH Sensor Kit | 40-70 | Acidity |
| Turbidity Sensor | 15-30 | Clarity |
| Dissolved O₂ Sensor | 150-250 | Oxygen levels |
| Raspberry Pi 4 | 110-130 | Edge computing |

---

## 13. Integration Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Person 1   │      │  Person 2   │      │  Person 3   │      │ Frontend    │
│ Simulation  │      │    AI       │      │  Backend    │      │ (P4 + P5)   │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ NumPy       │      │ Isolation   │      │ FastAPI     │      │ Three.js    │
│ generates   │───▶  │ Forest       │───▶  │ receives    │───▶  │ receives    │
│ parameters  │      │ detects      │      │ data +      │      │ data via    │
│ + anomalies │      │ anomalies   │      │ predictions │      │ WebSocket   │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │                    │
       ▼                    │                    ▼                    ▼
┌─────────────┐            │              ┌─────────────┐      ┌─────────────┐
│ MQTT        │            │              │ REST + WS   │      │ 3D scene    │
│ publishes   │────────────┘              │ serves JSON │      │ updates     │
│ real-time   │                           └──────┬──────┘      └──────┬──────┘
└─────────────┘                                  │                    │
                                                 ▼                    ▼
                                          ┌─────────────┐      ┌─────────────┐
                                          │  /live       │      │ Live color  │
                                          │  /forecast   │      │ changes +   │
                                          │  /alerts     │      │ charts      │
                                          └─────────────┘      └─────────────┘
```

---

## 14. What Each Team Member Produces

### Person 1: Simulation Engine
**File:** `simulation.py`
- Class `WaterQualitySimulator` with methods:
  - `generate_reading(timestamp)` → returns dict of 5 params
  - `inject_anomaly(anomaly_type)` → manually trigger events
  - `start_mqtt_publisher(broker, topic)` → stream data

### Person 2: AI Models
**Files:** `anomaly_detector.py`, `forecaster.py`
- `IsolationForestModel`: trains on clean data, `.predict(reading)` returns alert
- `LSTMForecaster`: trains on history, `.predict(24)` returns 24h forecast

### Person 3: Backend
**File:** `main.py`
- FastAPI app with:
  - MQTT subscriber (background task)
  - WebSocket endpoint `/ws`
  - REST endpoints `/live`, `/forecast`, `/alerts`
  - Model integration (calls Person 2's models)

### Person 4: 3D Visualization
**File:** `water_scene.html`
- Three.js scene with ocean shader
- WebSocket client connecting to backend
- Visual mappings: pH→color, DO→pulse, turbidity→opacity

### Person 5: Dashboard
**File:** `index.html`
- Chart.js live graphs for each parameter
- Alert timeline panel
- 24h forecast chart
- 3D scene embed
- Slide deck for presentation

---

## 15. Testing & Integration

### Day-by-Day Tests

| Day | Test |
|-----|------|
| **Tue** | Sim generates valid params in range |
| **Wed** | Sim→MQTT→Backend stream works |
| **Thu** | AI models return predictions |
| **Fri** | Full pipeline: Sim→MQTT→Backend→Frontend |
| **Mon** | All features work together |
| **Thu** | Full demo run with timing |

### What Could Go Wrong & Fixes

| Problem | Solution |
|---------|----------|
| MQTT drops packets | Add heartbeat, buffer last known state |
| LSTM too slow | Pre-compute forecast every 5 min, serve cached |
| Three.js lag | Simplify shader or use Plotly 3D fallback |
| Integration fails | Daily sync meetings, shared test data |

---

## 16. Demo Day Checklist

### Before You Leave
- [ ] Laptop with all code ready
- [ ] Portable monitor tested
- [ ] HDMI cable + adapters
- [ ] Power bank charged
- [ ] Backup of code on USB
- [ ] All cables for laptop charging

### At Demo Site
- [ ] Set up near actual water
- [ ] Connect laptop → monitor
- [ ] Start MQTT broker
- [ ] Run simulation
- [ ] Verify 3D scene shows data
- [ ] Test interactive features
- [ ] Have backup ready (USB with code)

### Presentation
- [ ] 2-3 minute demo walkthrough
- [ ] Show real water vs digital twin side-by-side
- [ ] Demonstrate 24h forecast
- [ ] Trigger an anomaly to show AI detection
- [ ] Explain the "wow factor"

---

## 17. Bonus Criteria Positioning

Our project hits these bonus criteria:

- ✅ **AI Implementation** — LSTM for 24h forecasting + Isolation Forest for anomaly detection
- ✅ **Innovation** — Predictive digital twin, not just sensors reading
- ✅ **Visual Impact** — 3D water with real-time reactive visuals
- ✅ **Originality** — No other team will have this
- ✅ **Demo Factor** — Standing next to actual water at Saint Anastasia Island

---

## 18. Key Files to Create

```
project/
├── simulation/
│   ├── __init__.py
│   └── simulator.py          # Person 1
├── ai/
│   ├── __init__.py
│   ├── anomaly_detector.py  # Person 2
│   └── forecaster.py        # Person 2
├── backend/
│   ├── __init__.py
│   └── main.py              # Person 3
├── frontend/
│   ├── index.html           # Person 5
│   ├── water_scene.html    # Person 4
│   └── style.css
├── tests/
│   └── integration_test.py
└── docker-compose.yml
```

---

## 19. First Step: Day 1 Morning

1. **Create GitHub repo** with folder structure
2. **Person 1**: Start `simulator.py` — basic sine wave for 1 param (temperature)
3. **Person 3**: Start `main.py` — FastAPI skeleton
4. **Person 4**: Start `water_scene.html` — Three.js basic water plane
5. **Person 5**: Create `index.html` — basic layout
6. **All 5**: Agree on JSON data format

**End of Day 1**: Should have a working pipeline with simulated temp data showing in frontend.

---

## 20. Success Metrics

| Metric | Target |
|--------|--------|
| Data flows Sim→Backend→Frontend | By end of Day 2 |
| All 5 parameters working | By end of Day 3 |
| AI anomaly detection triggers | By end of Day 4 |
| 24h forecast displays | By end of Day 4 |
| Full integration test passes | By end of Day 5 |
| UI/UX polish complete | By end of Day 9 |
| Demo rehearsal successful | By end of Day 10 |

---

## Summary

This is a complete, achievable plan for a 5-person team to build a standout hackathon project in 2 weeks:

1. **Simulation** generates realistic water data with anomaly events
2. **AI** detects problems and predicts the future
3. **Backend** connects everything with REST + WebSocket
4. **3D Visualization** creates the "wow factor" with reactive water
5. **Dashboard** presents everything in a user-friendly way

The result: A predictive digital twin that shows the future of a water body, not just its present — turning invisible environmental data into an immersive, visual experience that will be remembered at Saint Anastasia Island.