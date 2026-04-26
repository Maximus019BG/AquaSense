# Digital Twin Water Body - Complete Project Documentation

## Table of Contents
1. [Hardware Requirements](#1-hardware-requirements)
2. [Recommended Hardware Selection](#2-recommended-hardware-selection)
3. [C/C++ Implementation Details](#3-c-c-implementation-details)
4. [Tech Stack for Web and Hardware](#4-tech-stack-for-web-and-hardware)
5. [Step-by-Step Implementation Guide](#5-step-by-step-implementation-guide)
6. [Team Task Distribution](#6-team-task-distribution)
7. [Complete Documentation](#7-complete-documentation)

---

# 1. Hardware Requirements

## 1.1 Core Processing Units

| Item | Description | Quantity | Price (EUR) | Price (BGN) |
|------|-------------|----------|-------------|-------------|
| **ESP32 DevKit V1** | Dual-core WiFi + Bluetooth microcontroller | 2 | 10-15 | 20-30 |
| **Raspberry Pi 4 (4GB)** | Edge computing hub, runs MQTT broker + backend | 1 | 55-65 | 110-130 |
| **Raspberry Pi 5** | Latest model, faster processing (optional) | 1 | 90-110 | 180-220 |

## 1.2 Water Quality Sensors

| Sensor | Description | Quantity | Price (EUR) | Price (BGN) |
|--------|-------------|----------|-------------|-------------|
| **DS18B20 Waterproof** | Temperature sensor (-55°C to +125°C) | 2 | 4-6 | 8-12 |
| **Analog pH Sensor Kit** | pH 0-14, includes BNC electrode | 1 | 20-35 | 40-70 |
| **Turbidity Sensor (TS-300B)** | 0-3000 NTU range, analog output | 1 | 8-15 | 15-30 |
| **Dissolved Oxygen Sensor** | DFRobot Gravity DO Kit, 0-20 mg/L | 1 | 75-125 | 150-250 |
| **HC-SR04 Ultrasonic** | Water level measurement, 2-400cm | 1 | 3-5 | 5-10 |

## 1.3 Connectivity & Networking

| Item | Description | Quantity | Price (EUR) | Price (BGN) |
|------|-------------|----------|-------------|-------------|
| **MQTT Broker (Mosquitto)** | Open source, runs on Raspberry Pi | 1 | FREE | FREE |
| **ESP32-WROOM-32** | WiFi module for custom integration | 2 | 4-8 | 8-15 |
| **LoRa Module (SX1278)** | Long-range communication (2km+) | 2 | 8-13 | 15-25 |
| **Ethernet Shield (W5500)** | Wired connection for Pi | 1 | 10-15 | 20-30 |

## 1.4 Power Supply

| Item | Description | Quantity | Price (EUR) | Price (BGN) |
|------|-------------|----------|-------------|-------------|
| **USB-C Power Supply (5V/3A)** | For Raspberry Pi | 1 | 8-13 | 15-25 |
| **12V 2A Power Adapter** | For sensors and ESP32 | 1 | 5-10 | 10-20 |
| **Power Bank (20,000mAh)** | Portable backup for demo | 1 | 20-40 | 40-80 |
| **18650 Battery Pack (4x)** | Rechargeable 12V system | 1 | 10-20 | 20-40 |

## 1.5 Cables, Connectors & Enclosures

| Item | Description | Quantity | Price (EUR) | Price (BGN) |
|------|-------------|----------|-------------|-------------|
| **Jumper Wires (M-M, M-F)** | Breadboard wiring | 1 set | 2-4 | 4-8 |
| **USB-C Cable** | Power and programming | 2 | 5-10 | 10-20 |
| **HDMI Cable (3m)** | Display connection | 1 | 5-10 | 10-20 |
| **Waterproof Enclosure (IP68)** | For ESP32 + sensors | 2 | 8-15 | 15-30 |
| **PVC Pipe (2m)** | Sensor mounting | 2 | 5-10 | 10-20 |

## 1.6 Demo & Presentation Equipment

| Item | Description | Quantity | Price (EUR) | Price (BGN) |
|------|-------------|----------|-------------|-------------|
| **Portable Monitor (15.6")** | HDMI display for demo | 1 | 75-150 | 150-300 |
| **Laptop (Development)** | Your existing machine | 1 | - | - |
| **Tripod/Mount** | Monitor placement | 1 | 10-20 | 20-40 |

---

## 1.7 Location Tracking Hardware

### GPS Modules

| Module | Description | Accuracy | Price (EUR) | Price (BGN) |
|--------|-------------|----------|-------------|-------------|
| **NEO-6M GPS** | Basic GPS, 2.5m accuracy | 2.5m | 8-15 | 15-30 |
| **NEO-7M GPS** | Better accuracy, faster fix | 2.0m | 12-20 | 25-40 |
| **NEO-8M GPS** | High accuracy, supports GLONASS | 1.5m | 18-30 | 35-60 |
| **GPS-RTK2** | centimeter-level accuracy (professional) | 1cm+ | 150-300 | 300-600 |

### Recommended GPS Selection

| Use Case | Recommended Module | Cost (EUR) |
|----------|-------------------|------------|
| **Hackathon Demo** | NEO-6M (sufficient for general location) | 10-15 |
| **Field Deployment** | NEO-7M or NEO-8M (better accuracy) | 15-30 |
| **Research/Production** | GPS-RTK2 (centimeter precision) | 150-300 |

### Why NEO-6M?
- **Low Cost**: ~10 EUR for basic tracking
- **Easy Integration**: UART interface, standard NMEA protocol
- **Small Size**: 25x25mm module fits anywhere
- **Low Power**: 3.3V operation, ~50mA
- **C/C++ Support**: Arduino libraries available (TinyGPS++)

### GPS Cables & Antennas

| Item | Description | Price (EUR) | Price (BGN) |
|------|-------------|-------------|-------------|
| **Active GPS Antenna** | External antenna for better signal | 5-10 | 10-20 |
| **GPS Antenna (u.FL)** | Standard GPS antenna with u.FL connector | 3-8 | 6-16 |
| **Jumper Wires** | For connecting GPS to ESP32 | 1-2 | 2-4 |

### ESP32 GPS Pin Connection

```
ESP32 GPIO Pin → GPS Module
────────────────────────────────
GPIO 16 (RX)   → GPS TX
GPIO 17 (TX)   → GPS RX
3.3V          → GPS VCC
GND           → GPS GND
```

### GPS C/C++ Code Integration

```cpp
#include <TinyGPS++.h>
#include <HardwareSerial.h>

#define GPS_TX_PIN 16
#define GPS_RX_PIN 17

HardwareSerial GPSSerial(1);
TinyGPSPlus gps;

void setup() {
    Serial.begin(115200);
    GPSSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
}

void loop() {
    while (GPSSerial.available()) {
        char c = GPSSerial.read();
        gps.encode(c);
    }
    
    if (gps.location.isUpdated()) {
        float lat = gps.location.lat();
        float lng = gps.location.lng();
        float alt = gps.altitude.meters();
        
        Serial.printf("Lat: %.6f, Lng: %.6f, Alt: %.2fm\n", lat, lng, alt);
    }
    
    delay(1000);
}
```

### MQTT Location Data Format

```json
{
  "latitude": 42.619461,
  "longitude": 25.393517,
  "altitude": 125.5,
  "satellites": 8,
  "accuracy": 2.5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Location Data in Water Quality Context

| Data Field | Use Case |
|------------|----------|
| **Latitude/Longitude** | Map display, spatial analysis |
| **Altitude** | Water level reference, depth calculation |
| **Satellites** | Signal quality indicator |
| **Accuracy** | Trust level for location data |

---

# 2. Recommended Hardware Selection

## 2.1 Selected Hardware (Best Option)

### For Hackathon/Demo Mode (Simulated Data)
**Total Cost: 0-380 BGN (0-200 EUR)**

| Item | Justification |
|------|---------------|
| Your Laptop | Already available - runs simulation + web |
| Portable Monitor (optional) | 200-400 BGN - Display 3D at demo site |
| Power Bank (optional) | 50-80 BGN - Backup power |

### For Real Deployment (Recommended for Future)
**Total Cost: ~300-400 BGN (150-200 EUR)**

| Item | Justification | Priority |
|------|---------------|-----------|
| **Raspberry Pi 4 (4GB)** | Edge computing hub, runs MQTT broker, FastAPI backend | **REQUIRED** |
| **ESP32 Dev Board** | WiFi connectivity, sensor nodes, C/C++ programming | **REQUIRED** |
| **DS18B20 Waterproof** | Temperature, reliable 1-wire interface | **REQUIRED** |
| **Analog pH Sensor Kit** | pH measurement, includes electrode | **REQUIRED** |
| **Turbidity Sensor** | Water clarity monitoring | **RECOMMENDED** |
| **HC-SR04 Ultrasonic** | Water level measurement | **RECOMMENDED** |
| **Dissolved Oxygen Sensor** | DO for water quality (optional, expensive) | OPTIONAL |

## 2.2 Hardware Selection Rationale

### Why ESP32?
- **WiFi + Bluetooth**: Built-in connectivity for IoT
- **Dual-core 240MHz**: Fast enough for sensor processing
- **C/C++ Support**: Native compilation, meets requirement #3
- **Low Cost**: 5-10 EUR per unit
- **Large Community**: Extensive libraries and documentation

### Why Raspberry Pi 4?
- **Full Linux**: Runs MQTT broker, backend, database
- **4GB RAM**: Handles ML inference + web server
- **HDMI Output**: Can run display directly
- **GPIO**: Can connect sensors directly if needed
- **Docker Support**: Easy deployment

### Why These Sensors?
- **DS18B20**: Industry standard, waterproof, 1-wire bus
- **pH Sensor**: Basic water quality metric
- **Turbidity**: Visual water quality indicator
- **DO Sensor**: Critical for aquatic life

---

# 3. C/C++ Implementation Details

## 3.1 ESP32 Firmware Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ESP32 FIRMWARE                          │
├─────────────────────────────────────────────────────────────┤
│  Sensors ──► ADC/1-Wire ──► Data Processing ──► WiFi      │
│                                        │                   │
│                                        ▼                   │
│                              MQTT Publish                   │
│                              (water/parameters)            │
└─────────────────────────────────────────────────────────────┘
```

## 3.2 C/C++ Code Structure

### Main File: main.cpp

```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Configuration
#define WIFI_SSID "YourNetwork"
#define WIFI_PASS "YourPassword"
#define MQTT_BROKER "192.168.1.100"
#define MQTT_TOPIC "water/parameters"

// Pin definitions
#define ONE_WIRE_PIN 4
#define PH_SENSOR_PIN 34
#define TURBIDITY_SENSOR_PIN 35
#define TRIGGER_PIN 5
#define ECHO_PIN 18

// Global objects
WiFiClient espClient;
PubSubClient mqttClient(espClient);
OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

// Data structure
struct WaterData {
    float temperature;
    float ph;
    float turbidity;
    float waterLevel;
    unsigned long timestamp;
};

WaterData currentData;

void setup() {
    Serial.begin(115200);
    
    // Initialize sensors
    sensors.begin();
    pinMode(TRIGGER_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    
    // Connect to WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.println("Connecting to WiFi...");
    }
    
    // Setup MQTT
    mqttClient.setServer(MQTT_BROKER, 1883);
}

void loop() {
    if (!mqttClient.connected()) {
        reconnectMQTT();
    }
    mqttClient.loop();
    
    // Read sensors
    readSensors();
    
    // Publish data
    publishData();
    
    delay(1000); // 1 second interval
}

void readSensors() {
    // Temperature (DS18B20)
    sensors.requestTemperatures();
    currentData.temperature = sensors.getTempCByIndex(0);
    
    // pH sensor (analog read, need conversion)
    int phRaw = analogRead(PH_SENSOR_PIN);
    currentData.ph = (phRaw / 4095.0) * 14.0; // Example conversion
    
    // Turbidity
    int turbRaw = analogRead(TURBIDITY_SENSOR_PIN);
    currentData.turbidity = (turbRaw / 4095.0) * 100.0; // 0-100 NTU
    
    // Ultrasonic water level
    digitalWrite(TRIGGER_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIGGER_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIGGER_PIN, LOW);
    
    long duration = pulseIn(ECHO_PIN, HIGH);
    currentData.waterLevel = (duration * 0.034 / 2); // cm
    
    currentData.timestamp = millis();
}

void publishData() {
    char jsonBuffer[256];
    snprintf(jsonBuffer, sizeof(jsonBuffer),
        "{\"temperature\":%.2f,\"ph\":%.2f,\"turbidity\":%.2f,\"level\":%.2f,\"timestamp\":%lu}",
        currentData.temperature,
        currentData.ph,
        currentData.turbidity,
        currentData.waterLevel,
        currentData.timestamp
    );
    
    mqttClient.publish(MQTT_TOPIC, jsonBuffer);
}

void reconnectMQTT() {
    while (!mqttClient.connected()) {
        String clientId = "ESP32-" + String(WiFi.macAddress());
        if (mqttClient.connect(clientId.c_str())) {
            mqttClient.subscribe(MQTT_TOPIC);
        } else {
            delay(5000);
        }
    }
}
```

### PlatformIO Configuration: platformio.ini

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = 
    paulstoffregen/OneWire@^2.3.7
    milesburton/DallasTemperature@^3.11.0
    knolleary/PubSubClient@^2.8.0

[env:esp32-c3]
platform = espressif32
board = esp32-c3-mini
framework = arduino
```

## 3.3 C/C++ Libraries Required

| Library | Purpose | Source |
|---------|---------|--------|
| **Arduino Framework** | ESP32 base framework | PlatformIO |
| **OneWire** | DS18B20 1-wire communication | PlatformIO library |
| **DallasTemperature** | DS18B20 temperature reading | PlatformIO library |
| **PubSubClient** | MQTT client for ESP32 | PlatformIO library |
| **WiFi** | WiFi connectivity (built-in) | ESP32 core |

## 3.4 Building and Flashing ESP32

```bash
# Install PlatformIO
pip install platformio

# Build the firmware
pio run -e esp32dev

# Flash to ESP32
pio run -e esp32dev -t upload

# Monitor output
pio device monitor
```

---

# 4. Tech Stack for Web and Hardware

## 4.1 Complete Technology Stack

### Hardware Layer
| Component | Technology | Justification |
|-----------|------------|---------------|
| Microcontroller | **ESP32** (C/C++) | WiFi, Bluetooth, dual-core |
| Edge Computing | **Raspberry Pi 4** | Full Linux, Docker support |
| Sensors | DS18B20, pH, Turbidity, DO | Industry-standard water sensors |
| Communication | **MQTT** (Mosquitto) | Lightweight pub/sub for IoT |

### Simulation Layer (Alternative to Hardware)
| Component | Technology | Justification |
|-----------|------------|---------------|
| Data Generation | **NumPy/SciPy** | Vectorized time-series generation |
| Anomaly Injection | Custom Python | Programmatic anomaly events |

### AI/ML Layer
| Component | Technology | Justification |
|-----------|------------|---------------|
| Anomaly Detection | **scikit-learn** (Isolation Forest) | Unsupervised detection |
| Time Series Forecast | **TensorFlow/Keras** (LSTM) | 24-hour prediction |

### Backend Layer
| Component | Technology | Justification |
|-----------|------------|---------------|
| API Framework | **FastAPI** | Async, auto-documentation |
| WebSocket | FastAPI WebSocket | Real-time streaming |
| MQTT Subscriber | **paho-mqtt** | Connect to sensor network |
| Database | SQLite (for demo) | Simple, no setup required |
| Container | **Docker** | Easy deployment |

### Frontend Layer (Next.js)
| Component | Technology | Justification |
|-----------|------------|---------------|
| Framework | **Next.js 14** (App Router) | React, SSR, API routes |
| 3D Rendering | **Three.js** (ocean shader) | Realistic water visualization |
| Charts | **Recharts** | React-native charting |
| State Management | React Context | Simple state sharing |
| Styling | **Tailwind CSS** | Rapid UI development |

### Integration Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │  HARDWARE   │      │ SIMULATION  │      │  NEXT.JS   │     │
│  │   (ESP32)   │      │  (Python)   │      │  FRONTEND   │     │
│  │             │      │             │      │             │     │
│  │ C/C++ Firmware     │ NumPy        │      │ Three.js    │     │
│  │ + MQTT Pub │──────│ + Anomalies  │      │ + Recharts  │     │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘     │
│         │                     │                     │           │
│         │         ┌───────────┴───────────┐        │           │
│         │         │                       │        │           │
│         ▼         ▼                       ▼        ▼           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MQTT BROKER (Mosquitto)                    │   │
│  │                                                         │   │
│  │  Topics:                                                │   │
│  │  - water/parameters    (live sensor data)              │   │
│  │  - water/alerts        (anomaly notifications)         │   │
│  │  - water/forecast      (AI predictions)                 │   │
│  └─────────────────────┬───────────────────────────────────┘   │
│                        │                                        │
│                        ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              BACKEND (FastAPI)                          │   │
│  │                                                         │   │
│  │  Endpoints:                                             │   │
│  │  - GET /api/live         (current parameters)          │   │
│  │  - GET /api/forecast     (24h predictions)             │   │
│  │  - GET /api/alerts      (anomaly history)              │   │
│  │  - WS  /ws              (real-time stream)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 5. Step-by-Step Implementation Guide

## Phase 1: Environment Setup (Day 1)

### Step 1.1: Hardware Setup
```
□ Unbox Raspberry Pi 4
□ Flash Raspberry Pi OS to microSD card
□ Connect to power and network
□ Update system: sudo apt update && sudo apt upgrade
□ Install Docker: curl -sSL get.docker.com | sh
□ Install docker-compose
```

### Step 1.2: Software Development Environment
```
□ Install VS Code on development machine
□ Install Node.js (v18+)
□ Install Python (3.10+)
□ Install PlatformIO (for ESP32)
□ Clone project repository
```

### Step 1.3: MQTT Broker Setup
```
□ Install Mosquitto: sudo apt install mosquitto mosquitto-clients
□ Configure mosquitto.conf:
   - Allow anonymous connections (for demo)
   - Set port 1883
   - Enable websockets (optional)
□ Start broker: sudo systemctl start mosquitto
□ Test with: mosquitto_sub -t "test"
```

## Phase 2: Hardware Programming (Days 2-4)

### Step 2.1: ESP32 C/C++ Development
```
□ Create PlatformIO project
□ Write main.cpp with sensor drivers
□ Test temperature sensor (DS18B20)
□ Test pH sensor (analog read)
□ Test turbidity sensor
□ Test ultrasonic distance sensor
□ Integrate MQTT publishing
□ Flash and test ESP32
```

### Step 2.2: ESP32 Sensor Calibration
```
□ Calibrate DS18B20: Verify against thermometer
□ Calibrate pH: Use pH 7 buffer solution
□ Calibrate turbidity: Compare with known standards
□ Document calibration values in code
```

### Step 2.3: Raspberry Pi Edge Computing
```
□ Install MQTT broker on Pi
□ Write Python MQTT subscriber
□ Implement data logging to SQLite
□ Set up systemd service for auto-start
```

## Phase 3: Backend Development (Days 3-5)

### Step 3.1: FastAPI Backend
```
□ Create FastAPI project structure
□ Implement data models (Pydantic)
□ Create MQTT subscriber service
□ Implement REST endpoints:
   - GET /api/live
   - GET /api/forecast
   - GET /api/alerts
   - GET /api/history
□ Implement WebSocket endpoint
□ Add CORS configuration
□ Write API documentation (Swagger)
```

### Step 3.2: Docker Containerization
```
□ Create Dockerfile for backend
□ Create docker-compose.yml
□ Configure environment variables
□ Test local deployment
```

## Phase 4: Simulation Engine (Days 2-4)

### Step 4.1: Data Generation
```
□ Create simulation project
□ Define 5 water parameters:
   - Temperature (15-30°C)
   - pH (6.5-8.5)
   - Turbidity (0-100 NTU)
   - Dissolved Oxygen (5-10 mg/L)
   - Water Level (variable)
□ Implement diurnal cycles (sine wave)
□ Implement seasonal drift
□ Implement random walk behavior
□ Add noise to all parameters
```

### Step 4.2: Anomaly Injection
```
□ Implement pH crash event
□ Implement thermal stratification
□ Implement hypoxia event
□ Add MQTT publisher for simulation
□ Create event trigger system
```

## Phase 5: AI Models (Days 4-6)

### Step 5.1: Anomaly Detection
```
□ Collect training data (from simulation)
□ Train Isolation Forest model
   - Parameters: contamination=0.1, n_estimators=100
□ Implement real-time anomaly detection
□ Create alert system
```

### Step 5.2: Time Series Forecasting
```
□ Prepare LSTM training data
□ Build LSTM model architecture:
   - 2 LSTM layers (64 units)
   - Dense output layer
   - sequence_length=24
   - predict next 24 hours
□ Train model with generated data
□ Save model to file
□ Implement inference function
```

## Phase 6: Frontend Development (Days 5-8)

### Step 6.1: Next.js Setup
```
□ Create Next.js project: npx create-next-app@latest
□ Configure Tailwind CSS
□ Install dependencies:
   - three, @react-three/fiber
   - recharts
   - socket.io-client
□ Create project structure
```

### Step 6.2: 3D Water Visualization
```
□ Set up Three.js scene
□ Implement ocean shader (jbouny/ocean)
□ Map parameters to visuals:
   - pH → water color tint
   - DO → warning glow
   - Turbidity → transparency
   - Temperature → warmth
   - Water level → wave height
□ Add camera controls
□ Optimize performance
```

### Step 6.3: Dashboard Components
```
□ Create parameter cards
□ Implement live charts (Recharts)
□ Create alert timeline
□ Add forecast display
□ Implement WebSocket connection
□ Style with Tailwind CSS
```

## Phase 7: Integration (Days 8-10)

### Step 7.1: End-to-End Testing
```
□ Test simulation → MQTT → Backend → Frontend
□ Test hardware → MQTT → Backend → Frontend
□ Test WebSocket real-time updates
□ Test AI model predictions
□ Test anomaly detection
□ Test alert system
```

### Step 7.2: Performance Optimization
```
□ Optimize LSTM inference speed
□ Optimize Three.js rendering
□ Add data caching
□ Implement rate limiting
□ Test stress scenarios
```

## Phase 8: Demo Preparation (Days 10-14)

### Step 8.1: UI/UX Polish
```
□ Add time controls (play/pause/fast-forward)
□ Add parameter adjustment controls
□ Improve color scheme
□ Add loading states
□ Add error handling UI
□ Test responsive design
```

### Step 8.2: Rehearsals
```
□ Full demo run with timer
□ Fix any issues
□ Prepare backup laptop
□ Bring all cables/adapters
□ Test at demo location (if possible)
```

---

# 6. Team Task Distribution

## Team Composition
- **4 Team Members**
- **All 4** understand Next.js
- **3 Members** understand C/C++

## Task Assignment Matrix

| Person | Primary Skills | Assigned Tasks | Days |
|--------|---------------|----------------|------|
| **Person 1** | Next.js + C/C++ | ESP32 Firmware + Hardware Integration | 1-10 |
| **Person 2** | Next.js + C/C++ | Simulation Engine + AI Models | 1-10 |
| **Person 3** | Next.js + C/C++ | Backend (FastAPI) + MQTT | 1-10 |
| **Person 4** | Next.js (no C/C++) | Frontend (3D + Dashboard) | 1-10 |

## Detailed Task Breakdown

### Person 1: Hardware Engineer
```
Days 1-2: Environment Setup
  □ Set up ESP32 development environment
  □ Install PlatformIO
  □ Configure ESP32 toolchain

Days 3-5: ESP32 C/C++ Development
  □ Write main.cpp with sensor drivers
  □ Implement DS18B20 temperature reading
  □ Implement pH sensor analog read
  □ Implement turbidity sensor
  □ Implement ultrasonic water level
  □ Integrate MQTT publishing
  □ Flash and test ESP32

Days 6-7: Hardware Integration
  □ Connect all sensors to ESP32
  □ Test in laboratory conditions
  □ Calibrate sensors
  □ Waterproof enclosure assembly

Days 8-10: Support & Integration
  □ Debug hardware issues
  □ Optimize sensor sampling rate
  □ Help with backend integration
  □ Document hardware setup
```

### Person 2: Simulation & AI Engineer
```
Days 1-2: Simulation Setup
  □ Create Python simulation project
  □ Define water parameter ranges
  □ Implement base time-series generation

Days 3-4: Simulation Development
  □ Implement diurnal cycles
  □ Implement seasonal drift
  □ Implement random walk behavior
  □ Add noise to all parameters

Days 5-6: Anomaly Injection
  □ Implement pH crash event
  □ Implement thermal stratification
  □ Implement hypoxia event
  □ Add MQTT publisher

Days 7-8: AI Model Development
  □ Train Isolation Forest model
  □ Build LSTM model architecture
  □ Train LSTM on generated data
  □ Save trained models

Days 9-10: AI Integration
  □ Integrate models with backend
  □ Implement real-time inference
  □ Test anomaly detection
  □ Test forecast generation
```

### Person 3: Backend Engineer
```
Days 1-2: Backend Setup
  □ Set up FastAPI project
  □ Configure MQTT broker
  □ Define data models

Days 3-4: MQTT Integration
  □ Write MQTT subscriber service
  □ Implement data logging
  □ Create WebSocket service

Days 5-6: API Development
  □ Implement REST endpoints:
     - GET /api/live
     - GET /api/forecast
     - GET /api/alerts
     - GET /api/history
  □ Add WebSocket endpoint
  □ Write API documentation

Days 7-8: Docker & Deployment
  □ Create Dockerfile
  □ Configure docker-compose
  □ Set up production environment
  □ Test deployment

Days 9-10: Integration Testing
  □ Connect to simulation/MQTT
  □ Test all endpoints
  □ Optimize performance
  □ Fix integration issues
```

### Person 4: Frontend Engineer
```
Days 1-2: Frontend Setup
  □ Create Next.js project
  □ Configure Tailwind CSS
  □ Install Three.js, Recharts

Days 3-4: 3D Visualization
  □ Set up Three.js scene
  □ Implement ocean shader
  □ Map parameters to visuals
  □ Add camera controls

Days 5-6: Dashboard Components
  □ Create parameter cards
  □ Implement live charts
  □ Create alert timeline
  □ Build forecast display

Days 7-8: Integration
  □ Connect WebSocket
  □ Connect to backend API
  □ Test real-time updates
  □ Handle edge cases

Days 9-10: Polish & Demo
  □ Add time controls
  □ Improve styling
  □ Test responsive design
  □ Prepare demo script
```

## Parallel Work Schedule

```
Week 1:
┌─────────┬──────────────────────────────────────────────────────────────┐
│  Day    │ Parallel Work Streams                                        │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Day 1   │ All: Environment setup                                       │
│ Day 2   │ P1: ESP32 setup, P2: Simulation, P3: Backend, P4: Frontend  │
│ Day 3   │ P1: C/C++ code, P2: Simulation, P3: MQTT, P4: Three.js      │
│ Day 4   │ P1: C/C++ code, P2: Simulation, P3: API, P4: Three.js       │
│ Day 5   │ P1: Hardware, P2: Anomalies, P3: API, P4: Dashboard        │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Day 6   │ P1: Hardware, P2: AI Models, P3: Docker, P4: Integration    │
│ Day 7   │ P1: Hardware, P2: AI Models, P3: Docker, P4: Integration   │
│ Day 8   │ P1: Integration, P2: AI Integration, P3: Integration       │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Week 2: │ Bug fixes, optimization, polish, rehearsals                 │
└─────────┴──────────────────────────────────────────────────────────────┘
```

## Daily Sync Meetings

```
Schedule: 15 minutes every morning
- Share progress from previous day
- Identify blockers
- Plan current day tasks
- Coordinate dependencies
```

---

# 7. Complete Documentation

## 7.1 API Documentation

### REST Endpoints

#### GET /api/live
Returns current water parameters.

**Response:**
```json
{
  "temperature": 22.5,
  "ph": 7.2,
  "turbidity": 15.3,
  "dissolved_oxygen": 8.5,
  "water_level": 250.0,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### GET /api/forecast
Returns 24-hour water quality forecast.

**Response:**
```json
{
  "forecast": [
    {
      "timestamp": "2024-01-15T11:00:00Z",
      "temperature": 22.8,
      "ph": 7.1,
      "turbidity": 15.5,
      "dissolved_oxygen": 8.3
    },
    ...
  ],
  "model_accuracy": 0.92
}
```

#### GET /api/alerts
Returns anomaly alert history.

**Response:**
```json
{
  "alerts": [
    {
      "id": "alert_001",
      "type": "pH_CRITICAL",
      "message": "pH dropped below 6.5",
      "value": 6.2,
      "threshold": 6.5,
      "timestamp": "2024-01-15T09:45:00Z",
      "severity": "high"
    },
    ...
  ]
}
```

#### GET /api/history
Returns historical data with optional time range.

**Query Parameters:**
- `start`: Start timestamp (ISO 8601)
- `end`: End timestamp (ISO 8601)
- `limit`: Maximum records (default: 1000)

#### WebSocket /ws
Real-time data streaming endpoint.

**Message Format:**
```json
{
  "type": "live_data",
  "data": {
    "temperature": 22.5,
    "ph": 7.2,
    "turbidity": 15.3,
    "dissolved_oxygen": 8.5,
    "water_level": 250.0
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 7.2 MQTT Topic Structure

```
water/
├── parameters          # Live sensor data (1 msg/sec)
│   └── Format: JSON with all parameters
├── alerts              # Anomaly notifications
│   └── Format: JSON with alert details
└── forecast           # AI predictions (every 5 min)
    └── Format: JSON array of 24h predictions
```

## 7.3 Hardware Pinout (ESP32)

| Pin | Sensor | Notes |
|-----|--------|-------|
| GPIO 4 | DS18B20 (OneWire) | Temperature |
| GPIO 34 | pH Sensor (Analog) | pH measurement |
| GPIO 35 | Turbidity (Analog) | Water clarity |
| GPIO 5 | HC-SR04 Trigger | Water level |
| GPIO 18 | HC-SR04 Echo | Water level |
| 3.3V | VCC | Power |
| GND | GND | Ground |

## 7.4 Installation Guides

### ESP32 Firmware Installation

```bash
# 1. Install PlatformIO
pip install platformio

# 2. Clone and navigate to project
cd firmware

# 3. Build firmware
pio run

# 4. Flash to ESP32
pio run -t upload

# 5. Monitor serial output
pio device monitor
```

### Backend Installation

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run with Docker
docker-compose up -d

# 5. Or run directly
uvicorn main:app --reload
```

### Frontend Installation

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev

# 4. Build for production
npm run build
npm start
```

## 7.5 Troubleshooting Guide

### ESP32 Issues

| Problem | Solution |
|---------|----------|
| Can't connect to WiFi | Check SSID/password, ensure 2.4GHz network |
| MQTT connection fails | Verify broker IP, check firewall |
| Temperature reading -127 | Check OneWire pin, verify sensor wiring |
| Analog read不稳定 | Add capacitor (100µF) to VCC/GND |

### Backend Issues

| Problem | Solution |
|---------|----------|
| MQTT not connecting | Check broker is running: `sudo systemctl status mosquitto` |
| WebSocket disconnects | Check CORS settings, increase timeout |
| Database errors | Verify SQLite file permissions |

### Frontend Issues

| Problem | Solution |
|---------|----------|
| Three.js not rendering | Check WebGL support, update browser |
| Charts not updating | Verify WebSocket connection, check console |
| Slow performance | Reduce sensor update frequency, optimize Three.js |

## 7.6 Project File Structure

```
digital-twin-water/
├── firmware/
│   ├── src/
│   │   └── main.cpp
│   ├── lib/
│   ├── test/
│   ├── platformio.ini
│   └── README.md
│
├── simulation/
│   ├── src/
│   │   ├── simulation.py
│   │   ├── anomalies.py
│   │   └── mqtt_publisher.py
│   ├── models/
│   │   ├── isolation_forest.pkl
│   │   └── lstm_model.h5
│   ├── requirements.txt
│   └── README.md
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── mqtt_service.py
│   │   ├── websocket_service.py
│   │   └── api/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── api/
│   │   ├── components/
│   │   │   ├── Water3D.tsx
│   │   │   ├── ParameterCard.tsx
│   │   │   ├── LiveChart.tsx
│   │   │   └── AlertTimeline.tsx
│   │   ├── lib/
│   │   │   ├── websocket.ts
│   │   │   └── api.ts
│   │   └── styles/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── README.md
│
├── docs/
│   ├── hardware.md
│   ├── api.md
│   ├── mqtt.md
│   └── troubleshooting.md
│
├── README.md
└── PROJECT_PLAN.md
```

## 7.7 Success Criteria

### Technical Requirements Met
- [x] Hardware in C/C++ (ESP32 firmware)
- [x] Web in Next.js
- [x] MQTT real-time communication
- [x] AI anomaly detection
- [x] AI time-series forecasting
- [x] 3D water visualization
- [x] Live data dashboard
- [x] Docker deployment

### Demo Requirements
- [ ] 3D water body renders correctly
- [ ] Parameters update in real-time
- [ ] Anomaly injection works on command
- [ ] 24-hour forecast displays
- [ ] Alerts trigger on anomalies
- [ ] Demo runs for 10 minutes without issues
- [ ] Backup laptop ready

---

## Summary

This documentation covers:
1. **Hardware Requirements** - Complete list of all needed components
2. **Best Hardware Selection** - Recommended ESP32 + Raspberry Pi + sensors
3. **C/C++ Implementation** - Full ESP32 firmware code
4. **Tech Stack** - Complete web + hardware technology stack
5. **Step-by-Step Guide** - 14-day implementation timeline
6. **Task Distribution** - 4 people, 3 know C/C++, all know Next.js
7. **Documentation** - API, MQTT, installation, troubleshooting

**If it doesn't work, I'm fired.** - This document provides everything needed to build a working digital twin water body system with hardware integration.
