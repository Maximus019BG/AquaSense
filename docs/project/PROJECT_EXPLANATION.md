# Digital Twin of a Water Body - Project Overview

## What Is This Project?

This project creates a **digital twin** of a real water body (like a lagoon or shoreline near Saint Anastasia Island). A digital twin is a virtual replica that shows the real-time state of the physical water AND predicts what will happen in the future.

Think of it like a video game simulation—but it's not fake data. It's a living, breathing digital model of actual water, showing you what's happening right now AND what will happen in the next 24 hours.

---

## Why Does This Matter?

### The Problem
- Water pollution events happen silently—we can't see them
- By the time we detect contamination, it's often too late
- Traditional monitoring just shows current numbers on a chart—useful, but not engaging or predictive

### Our Solution
We combine **real-time sensor simulation**, **AI prediction**, and **immersive 3D visualization** to:
1. **Monitor** the water in real-time
2. **Detect** problems automatically (AI spotting pollution before it's visible)
3. **Predict** future water quality (what will the water look like in 24 hours?)
4. **Visualize** it in a way that anyone can understand—watch the water change color when something's wrong

---

## How It Works

### Step 1: Data Generation (Simulation Engine)

We simulate data from 5 key water quality parameters:
| Parameter | What It Measures | Why It Matters |
|-----------|------------------|----------------|
| **Temperature** | Water heat (°C) | Affects all chemical/biological processes |
| **pH** | Acidity/alkalinity (6.5-8.5 normal) | pH crash = pollution indicator |
| **Turbidity** | Cloudiness/clarity (0-100 NTU) | High turbidity = sediment or algae |
| **Dissolved Oxygen** | Oxygen in water (5-10 mg/L normal) | Low DO = dead zone / fish kill risk |
| **Water Level** | Tidal height | Flooding, storm surge prediction |

The simulation adds:
- **Normal patterns**: Daily cycles, seasonal changes, random drift
- **Anomaly events**: Sudden pollution spikes, thermal layer shifts, hypoxia events

### Step 2: AI Analysis

Two AI models work behind the scenes:

**Isolation Forest (Anomaly Detection)**
- Learns what "normal" water looks like
- Flags anything unusual—like a sudden pH drop indicating pollution
- Generates alerts automatically

**LSTM Neural Network (Forecasting)**
- Studies patterns in historical data
- Predicts what each parameter will do over the next 24 hours
- Answers: "What will the water quality be tomorrow?"

### Step 3: Backend API

A FastAPI server acts as the central hub:
- Receives live data via MQTT (real-time messaging)
- Runs AI models on incoming data
- Exposes simple endpoints:
  - `/live` — Current water state
  - `/forecast` — 24-hour predictions
  - `/alerts` — Active warnings
  - `/ws` — Real-time WebSocket stream

### Step 4: 3D Digital Twin

A Three.js 3D water scene responds to the data in real-time:

| When This Happens... | You'll See This... |
|----------------------|--------------------|
| pH drops below 6.5 | Water turns slightly red/green (pollution warning) |
| Dissolved oxygen < 4 mg/L | Blue pulsing glow (hypoxia alert) |
| Turbidity increases | Water becomes murky, less transparent |
| Temperature rises | Subtle warm color shift |
| Water level rises | Waves get taller |

### Step 5: Dashboard

A user-friendly interface showing:
- **Live charts** for each parameter (Chart.js)
- **24-hour forecast** graph
- **Alert timeline** showing when anomalies occurred
- **3D water scene** (the main attraction)

---

## Hardware Components

While our hackathon version uses simulated data, here's how you could scale this to real hardware:

### Water Quality Sensors (For Real Deployment)

| Sensor Type | Measures | Hardware Options |
|-------------|----------|-------------------|
| **Temperature** | Water temp (°C) | DS18B20 waterproof, TMP102 |
| **pH** | Acidity (0-14) | Atlas Scientific pH kit, DFRobot |
| **Turbidity** | Water clarity (NTU) | DFrobot turbidity sensor, SEN0189 |
| **Dissolved Oxygen** | O2 levels (mg/L) | Atlas Scientific DO kit, LDO |
| **Water Level** | Depth/height | Ultrasonic (HC-SR04), pressure sensor |

### Connectivity & Processing

| Component | Purpose | Options |
|-----------|---------|---------|
| **Microcontroller** | Collect sensor data | ESP32, Raspberry Pi Pico, Arduino Nano 33 IoT |
| **WiFi/LoRa** | Transmit data | ESP32 built-in WiFi, LoRa radio for long range |
| **MQTT Broker** | Message hub | Mosquitto on Raspberry Pi |
| **Edge Computing** | Run AI locally | Raspberry Pi 4/5, NVIDIA Jetson Nano (for heavier models) |

### Demo Setup (Hackathon)

For the Saint Anastasia Island demo, consider:

| Hardware | Use Case |
|----------|----------|
| **Laptop** (your dev machine) | Runs simulation + backend + frontend |
| **Portable Monitor** (15-24") | Display 3D water scene at the shore |
| **Portable Speaker** | Voice-guided tour for tourists |
| **Power Bank** (20,000mAh+) | Backup power for demo |
| **Raspberry Pi** (optional) | Lightweight MQTT broker on-site |
| **HDMI Cable** | Connect laptop to portable monitor |

### Optional: Drones & Cameras

For enhanced visuals:
- **Drone (DJI Mini)** — Capture aerial footage of the water body to overlay on 3D scene
- **GoPro** — Livestream real water view alongside digital twin
- **Thermal Camera** — Show temperature differences visually

---

## What Can You Do With It?

### For Environmental Researchers
- Predict contamination events before they happen
- Understand how pollution spreads over time
- Test "what if" scenarios

### For Water Authorities
- Early warning system for pollution
- Flood and storm surge forecasting
- Data-driven decision making

### For Tourists & Visitors (The Demo)
- Stand next to real water at Saint Anastasia Island
- See a glowing, animated digital replica showing invisible data
- Touch the screen to see "what happens in 24 hours"
- Experience science in a visceral, unforgettable way

---

## What Makes This Project Special?

| Typical Hackathon Project | Our Project |
|---------------------------|--------------|
| Shows current sensor reading on a graph | Shows a living, breathing 3D water body that changes in real-time |
| Only tells you what's happening NOW | Predicts what will happen in the NEXT 24 HOURS |
| Static dashboard with numbers | Immersive 3D visualization you can walk around |
| Detects problems manually | AI automatically detects invisible anomalies |

---

## The "Wow Factor"

Imagine standing at the shoreline of Saint Anastasia Island:
- **Real water** is in front of you
- **Next to it**: A large screen showing a 3D digital replica
- The digital twin shows glowing zones where pollution might spread
- You touch the water → it shows what it will look like in 24 hours
- A warning pulse glows blue → AI detected low oxygen, potential fish kill

This isn't just a science fair project—it's a **living demonstration** that turns invisible data into something visceral and unforgettable.

---

## Summary

| Component | What It Does |
|-----------|--------------|
| Simulation Engine | Generates realistic water data with built-in anomaly events |
| AI Models | Detects pollution automatically + predicts next 24 hours |
| Backend | Real-time API connecting everything together |
| 3D Visualization | Interactive water body that changes color based on water quality |
| Dashboard | User-friendly interface with live charts and alerts |

**The result**: A predictive digital twin that shows the future of a water body, not just its present—turning complex environmental data into an immersive, visual experience.