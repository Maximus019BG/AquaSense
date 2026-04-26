# Digital Twin of a Water Body - Implementation Plan

Based on your files, here's a comprehensive research-backed plan to execute this project in **2 weeks with 5 team members**.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: Simulation Engine (Person 1)                         │
│   → NumPy time-series generation + anomaly injection          │
│   → MQTT pub/sub for real-time stream                         │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: AI Models (Person 2)                                  │
│   → Isolation Forest (anomaly detection)                     │
│   → LSTM (24-hour forecast)                                   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Backend (Person 3)                                    │
│   → FastAPI + MQTT subscriber                                 │
│   → REST: /live, /forecast, /alerts, /ws (WebSocket)         │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: 3D Visualization (Person 4)                           │
│   → Three.js water shader (jbouny/ocean or WebGPU water)     │
│   → Real-time parameter-to-visual mapping                     │
├─────────────────────────────────────────────────────────────────┤
│ Layer 5: Dashboard (Person 5)                                  │
│   → Chart.js live graphs                                     │
│   → Alert timeline + 24h forecast                             │
│   → Demo presentation                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Recommendations

| Layer | Technology | Why |
|-------|------------|-----|
| Simulation | NumPy, SciPy | Fast vectorized operations for time-series |
| Messaging | MQTT (paho-mqtt) | Lightweight real-time pub/sub |
| AI/ML | TensorFlow/Keras, scikit-learn | LSTM + Isolation Forest (proven for water quality) |
| Backend | FastAPI + WebSocket | Async + real-time streaming to frontend |
| 3D Water | Three.js (ocean shader) | 777+ stars, realistic water rendering |
| Charts | Chart.js | Simple, responsive, live updates |
| Container | Docker | Easy deployment at demo site |

---

## Detailed 2-Week Timeline

### **Week 1: Core Infrastructure & AI**

| Day | Person 1 (Sim) | Person 2 (AI) | Person 3 (Backend) | Person 4 (3D) | Person 5 (Dashboard) |
|-----|----------------|---------------|--------------------|---------------|----------------------|
| **Mon** | Setup NumPy project, define 5 water params (temp, pH, turbidity, DO, level). Generate base sine-wave + noise time-series | Research Isolation Forest params for water quality | Setup FastAPI project, define data models | Research Three.js ocean shaders, setup Three.js scene with basic water plane | Research Chart.js real-time patterns |
| **Tue** | Implement diurnal cycles + seasonal drift. Add random walk behavior | Train Isolation Forest on clean data, test anomaly detection | Connect FastAPI to MQTT broker, create /live endpoint | Map parameters to water visuals (pH→color, DO→warning pulse) | Create basic HTML layout, embed 3D canvas |
| **Wed** | **Inject anomaly events** (pH crash, thermal stratification). Add MQTT publisher | Train LSTM on generated data, test 24h forecast | Add /forecast and /alerts endpoints. Add WebSocket for real-time push | Refine water shader: color gradients for pH, wave intensity for turbulence | Add Chart.js live graphs, connect to WebSocket |
| **Thu** | Debug simulation edge cases. Document expected parameter ranges | Fine-tune model thresholds, document prediction accuracy | Add CORS, error handling. Write API documentation | Add alert visualizations (glow, pulse effects) | Build alert timeline panel |
| **Fri** | **INTEGRATION TEST** - Sim → MQTT → Backend → Frontend | Validate AI model performance metrics | Deploy to local Docker, test full pipeline | Verify 3D visuals match actual parameter values | Connect forecast chart, test all endpoints |

### **Week 2: Polish & Demo**

| Day | Focus |
|-----|-------|
| **Mon** | Bug fixes from integration. Optimize LSTM inference speed. Add data normalization |
| **Tue** | UI/UX polish. Add "rewind/fast-forward" time controls to 3D scene. Color scheme consistency |
| **Wed** | Full system stress test. Mock sensor data failover scenarios. Performance optimization |
| **Thu** | **Rehearsal 1** - Full demo run with timer. Fix flow issues. Prepare backup |
| **Fri** | **Rehearsal 2** + demo day - Final tweaks, backup laptop, bring all cables/adapters |

---

## Key Technical Details

### 1. Simulation Engine (Person 1)

**Parameters to simulate:**
- Temperature: 15-30°C with diurnal cycle + seasonal drift
- pH: 6.5-8.5 with random walk
- Turbidity: 0-100 NTU with wave-like patterns
- Dissolved O2: 5-10 mg/L inversely correlated with temp
- Water level: tidal pattern + weather influence

**Anomaly injection:**
- pH drop: sudden drop to 5.5-6.0 (pollution spike)
- Thermal stratification: rapid temp gradient (layer shift)
- Hypoxia event: DO drops below 3 mg/L

### 2. AI Models (Person 2)

```python
# Isolation Forest: contamination=0.1, n_estimators=100
# LSTM: 2 LSTM layers (64 units) + Dense output, 
#       sequence_length=24, predict next 24h
# Training: use generated data, split 80/20 train/test
```

### 3. MQTT Topics

```
water/parameters     # Live sensor data (1 msg/sec)
water/alerts         # Anomaly notifications
water/forecast       # 24h predicted values
```

### 4. WebSocket Real-time Flow

```python
# FastAPI WebSocket pushes to frontend:
# Client connects → Server subscribes to MQTT → 
# Server broadcasts live data → Frontend updates 3D + charts
```

### 5. 3D Water Visual Mappings

| Parameter | Visual Effect |
|-----------|---------------|
| pH < 6.5 | Red/green tint on water surface |
| DO < 4 mg/L | Blue pulsing glow (hypoxia warning) |
| Turbidity > 60 | Reduce transparency, add particles |
| Temperature | Subtle warm/cool color shift |
| Water level | Wave height changes |

---

## Risk Mitigation

| Risk | Solution |
|------|----------|
| MQTT drops packets | Add heartbeat/ping, buffer last known state |
| LSTM too slow for real-time | Pre-compute forecast every 5 min, serve cached |
| Three.js performance | Use simpler shader fallback if needed (Plotly 3D) |
| Integration failures | Daily 5-min sync meetings, shared test data file |
| Demo internet issues | Run everything locally (no external APIs) |

---

## Bonus Criteria Positioning

- ✅ **AI**: LSTM provides 24h forecast (major bonus)
- ✅ **Innovation**: Predictive digital twin, not just sensors
- ✅ **Visual Impact**: 3D water with real-time reactive visuals
- ✅ **Demo**: Stands next to actual water at Saint Anastasia Island

---

## Suggested First Steps (Day 1)

1. **Create GitHub repo** with clear folder structure
2. **Person 1**: Start `simulation.py` - basic sine wave generation for 5 params
3. **Person 3**: Start `main.py` - FastAPI skeleton with MQTT connection
4. **Person 4**: Start `water.html` - Three.js scene with basic water plane
5. **All**: Agree on data format (JSON schema) for MQTT messages

This plan gives you a **working prototype by end of Week 1** and polish/rehearsal in Week 2.