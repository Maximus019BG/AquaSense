# Hardware Research for Digital Twin Water Body Project

This document provides detailed hardware options, specifications, and pricing for building a water quality monitoring system. Prices are in BGN (Bulgarian Lev) and EUR, with sources from Bulgarian shops and international suppliers.

---

## 1. Microcontrollers & Single Board Computers

### Primary Options

| Device | Description | Price (BGN) | Price (EUR) | Source |
|--------|-------------|-------------|-------------|--------|
| **ESP32 Dev Board** | WiFi + Bluetooth, dual-core, 240MHz | 15-25 | 8-13 | AliExpress |
| **ESP32-C3 SuperMini** | RISC-V based, compact, WiFi + BLE | 10-18 | 5-9 | AliExpress |
| **Raspberry Pi 4 (4GB)** | SBC, runs full backend, HDMI output | 110-130 | 55-65 | Comet.bg, KUBii |
| **Raspberry Pi 4 (8GB)** | Higher RAM for ML models | 150-170 | 75-85 | Comet.bg |
| **Raspberry Pi 5** | Latest model, faster | 180-220 | 90-110 | Comet.bg |
| **Arduino Nano 33 IoT** | WiFi built-in, smaller projects | 30-40 | 15-20 | eMAG.bg |

### Recommendation

**For Hackathon (Simulation/Demo):**
- Use your laptop as the main computing unit
- ESP32 only needed if connecting real sensors

**For Real Deployment:**
- Raspberry Pi 4 (4GB) as edge computing hub — runs MQTT broker, FastAPI, and can handle light ML inference
- ESP32 for sensor nodes (waterproof enclosure, WiFi mesh)

---

## 2. Water Quality Sensors

### Temperature Sensor

| Sensor | Description | Price (BGN) | Price (EUR) | Source |
|--------|-------------|-------------|-------------|--------|
| **DS18B20 Waterproof** | -55°C to +125°C, 1-wire interface, 1m cable | 7-12 | 4-6 | kasabov.eu, AliExpress |
| **DS18B20 Waterproof (3m)** | Longer cable for deeper placement | 10-15 | 5-8 | kasabov.eu, AliExpress |
| **DS18B20 Module** | PCB version without probe | 2-4 | 1-2 | AliExpress |

**AliExpress Links:**
- https://aliexpress.com/item/4000550061662.html (~$1.50/1pc)
- https://aliexpress.com/item/1005003094447055.html (~$3 for 10pcs)

---

### pH Sensor

| Sensor | Description | Price (BGN) | Price (EUR) | Source |
|--------|-------------|-------------|-------------|--------|
| **Analog pH Sensor Kit (BNC)** | pH 0-14, includes electrode + module | 40-70 | 20-35 | AliExpress, DFRobot |
| **Gravity Digital pH Sensor (I2C)** | Better accuracy, easier wiring | 50-80 | 25-40 | DFRobot, AliExpress |
| **Industrial pH Electrode (BNC)** | Professional grade, longer life | 80-150 | 40-75 | pihub.bg, eMAG |

**AliExpress Links:**
- https://aliexpress.com/item/1005002842540357.html (~$6 module + electrode)
- https://aliexpress.com/item/1005007421404969.html (~$8 premium kit)

**Note:** pH sensors need calibration solution (pH 7 buffer) — ~10 BGN / 5 EUR

---

### Turbidity Sensor

| Sensor | Description | Price (BGN) | Price (EUR) | Source |
|--------|-------------|-------------|-------------|--------|
| **TS-300B Turbidity Module** | 0-3000 NTU range, analog output | 15-30 | 8-15 | AliExpress |
| **DFRobot Gravity Turbidity** | Better quality, 0-3000 NTU | 40-60 | 20-30 | DFRobot, AliExpress |
| **SEN0189 Turbidity Sensor** | Arduino compatible | 20-35 | 10-18 | AliExpress |

**AliExpress Links:**
- https://aliexpress.com/item/1005001977037452.html (~$3 module)
- https://aliexpress.com/item/1005007480439894.html (~$12 DFRobot)

---

### Dissolved Oxygen Sensor

| Sensor | Description | Price (BGN) | Price (EUR) | Source |
|--------|-------------|-------------|-------------|--------|
| **DFRobot Gravity DO Kit** | Analog output, 0-20 mg/L | 150-250 | 75-125 | DFRobot, AliExpress |
| **Atlas Scientific DO Kit** | Professional grade, I2C | 200-350 | 100-175 | pihub.bg |
| **Optical DO Sensor** | No membrane needed, longer life | 300-500 | 150-250 | Alibaba |

**AliExpress Links:**
- https://aliexpress.com/item/32833443811.html (~$25 DFRobot kit)

---

### Water Level Sensor

| Sensor | Description | Price (BGN) | Price (EUR) | Source |
|--------|-------------|-------------|-------------|--------|
| **HC-SR04 Ultrasonic** | 2cm-400cm range, non-contact | 5-10 | 3-5 | AliExpress, eMAG |
| **JSN-SR04T Waterproof Ultrasonic** | Waterproof version for submersion | 15-25 | 8-13 | AliExpress |
| **Pressure Sensor (MPX5010)** | Depth measurement, analog | 20-35 | 10-18 | AliExpress |
| **Float Switch** | Simple on/off water detection | 3-8 | 2-4 | AliExpress |

---

## 3. Connectivity & Networking

| Item | Description | Price (BGN) | Price (EUR) | Source |
|------|-------------|-------------|-------------|--------|
| **MQTT Broker (Mosquitto)** | Open source, runs on Raspberry Pi | FREE | FREE | Open source |
| **ESP32-WROOM-32** | WiFi + BT module (for custom PCB) | 8-15 | 4-8 | AliExpress |
| **LoRa Module (SX1278)** | Long-range (2km+), low power | 15-25 | 8-13 | AliExpress |
| **Ethernet Shield (W5500)** | Wired connection for Pi | 20-30 | 10-15 | AliExpress |
| **Power over Ethernet (PoE)** | Power + data via one cable | 30-50 | 15-25 | AliExpress |

---

## 4. Power Supply

| Item | Description | Price (BGN) | Price (EUR) | Source |
|------|-------------|-------------|-------------|--------|
| **USB-C Power Supply (5V/3A)** | For Raspberry Pi | 15-25 | 8-13 | AliExpress, eMAG |
| **12V 2A Power Adapter** | For sensors and ESP32 | 10-20 | 5-10 | AliExpress |
| **Power Bank (20,000mAh)** | Portable backup for demo | 40-80 | 20-40 | eMAG, AliExpress |
| **Solar Panel (10W)** | For remote deployment | 30-50 | 15-25 | AliExpress |
| **Solar Charge Controller** | For battery management | 20-35 | 10-18 | AliExpress |
| **18650 Battery Pack (4x)** | Rechargeable, 12V system | 20-40 | 10-20 | AliExpress |

---

## 5. Demo & Presentation Hardware

| Item | Description | Price (BGN) | Price (EUR) | Source |
|------|-------------|-------------|-------------|--------|
| **Portable Monitor (15.6")** | HDMI, for 3D display at shore | 150-300 | 75-150 | Amazon, eMAG |
| **Laptop (Your Dev Machine)** | Runs simulation + backend | — | — | — |
| **Portable Speaker** | Voice-guided tour | 30-80 | 15-40 | eMAG |
| **HDMI Cable (5m)** | Extended reach for demo | 10-20 | 5-10 | AliExpress, eMAG |
| **Tripod/Mount** | For monitor at demo site | 20-40 | 10-20 | AliExpress |
| ** waterproof Case** | For ESP32 + sensors in water | 15-30 | 8-15 | AliExpress |

---

## 6. Complete Hardware Bundles

### Option A: Hackathon Demo (Simulated Data) — Your Setup

| Item | Estimated Cost |
|------|----------------|
| Laptop (you already have) | 0 BGN |
| Portable Monitor (optional) | 200-300 BGN |
| Power Bank (optional) | 50-80 BGN |
| **Total** | **0-380 BGN** |

*This is what you'll use — simulated data, no real sensors needed!*

---

### Option B: Basic Real Sensor Kit (~$50)

| Item | Price (USD) | Notes |
|------|-------------|-------|
| ESP32 Dev Board | $5 | WiFi connectivity |
| DS18B20 Waterproof | $2 | Temperature |
| Analog pH Sensor Kit | $8 | Includes electrode |
| Turbidity Sensor | $5 | Water clarity |
| JST Connectors, Wires | $5 | Misc wiring |
| **Total** | **~$25** | |

Add DFRobot DO Sensor: +$25 = **~$50 total**

---

### Option C: Premium Real Sensor Kit (~$150-200)

| Item | Price (USD) | Notes |
|------|-------------|-------|
| Raspberry Pi 4 (4GB) | $55 | Edge computing |
| ESP32 x 2 | $10 | Sensor nodes |
| DS18B20 Waterproof (2x) | $4 | Temperature |
| DFRobot pH Sensor (I2C) | $25 | Better accuracy |
| DFRobot Turbidity | $15 | Quality sensor |
| DFRobot DO Sensor | $30 | Dissolved oxygen |
| HC-SR04 Ultrasonic | $4 | Water level |
| Power Supply + Case | $20 | Raspberry Pi |
| **Total** | **~$163** | |

---

### Option D: Full Production System (~$500+)

| Item | Price (USD) | Notes |
|------|-------------|-------|
| Raspberry Pi 4/5 (8GB) | $85 | Main hub |
| ESP32 x 4 | $20 | Distributed sensors |
| Industrial pH Sensor | $60 | Long lifespan |
| DFRobot DO Sensor | $30 | Water quality |
| Turbidity + Conductivity | $40 | Multi-param |
| Ultrasonic Level | $10 | Water level |
| LoRa Modules | $30 | Long-range comms |
| Solar Panel + Battery | $50 | Off-grid power |
| Waterproof Enclosures | $40 | IP68 boxes |
| **Total** | **~$365** | |

---

## 7. Bulgarian Suppliers (Local Purchase)

### Recommended Shops

| Shop | Website | Notes |
|------|---------|-------|
| **Comet Electronics** | store.comet.bg | Raspberry Pi, Arduino, sensors |
| **Kasabov Electronics** | kasabov.eu | DS18B20, components, fast delivery |
| **eMAG.bg** | emag.bg | Arduino, power supplies, diverse |
| **RTS-BG** | rts-bg.com | Industrial sensors |
| **pihub.bg** | pihub.bg | pH sensors, water quality equipment |
| **Bazar.bg** | bazar.bg | Used/secondhand Raspberry Pi |

### Advantages of Buying Locally
- Faster delivery (1-3 days in Bulgaria)
- Warranty support
- No customs fees
- Easier returns

### Disadvantages
- Higher prices than AliExpress (typically 30-50% more)
- Limited sensor variety

---

## 8. Recommended Shopping List

### For Hackathon (Focus on Demo)

**No hardware needed** — run everything on your laptop with simulated data!

Optional additions:
| Item | Price | Purpose |
|------|-------|---------|
| Portable Monitor (15-24") | 200-400 BGN | Display 3D at demo site |
| HDMI Cable (5m+) | 15-30 BGN | Connect laptop to monitor |
| Power Bank (20,000mAh) | 50-80 BGN | Backup power |
| **Total** | **265-510 BGN** | |

---

### If You Want Real Sensors (Future Expansion)

Start with this budget-friendly set:
| Item | Price (BGN) | Price (EUR) |
|------|-------------|--------------|
| ESP32 Dev Board | 20 | 10 |
| DS18B20 Waterproof | 10 | 5 |
| Analog pH Sensor Kit | 50 | 25 |
| Turbidity Sensor | 25 | 13 |
| **Total** | **105 BGN** | **53 EUR** |

This gives you real temperature + pH + turbidity data if you want to expand beyond simulation later.

---

## 9. Shipping to Bulgaria

### AliExpress (China)
| Shipping Method | Time | Cost |
|-----------------|------|------|
| AliExpress Standard | 15-30 days | FREE (over $10) |
| Cainiao Smart | 10-20 days | $2-5 |
| DHL/FedEx | 5-10 days | $15-30 |

### Bulgarian Shops
| Shop | Delivery Time | Shipping Cost |
|------|---------------|----------------|
| Comet Electronics | 1-3 days | Free over 78 BGN |
| eMAG.bg | 1-2 days | 5-10 BGN |
| Kasabov.eu | Same day | 5-8 BGN |

---

## 10. Summary Recommendations

### For Your Hackathon (2 weeks, 5 people)

**Stick with simulation only** — no real sensors needed. Your plan already accounts for simulated data with anomaly injection. This is smarter because:
- No hardware debugging during crunch time
- You control all scenarios for perfect demo
- Can inject any anomaly on command

### Hardware to Have Ready for Demo Day
1. ✅ Your laptop (already have)
2. ✅ Portable monitor (borrow or rent ~100 BGN)
3. ✅ HDMI cable
4. ✅ Power bank as backup
5. ✅ All cables/adapters for laptop connection

### If You Want Real Sensors Post-Hackathon
Start with: ESP32 + DS18B20 + pH sensor = ~80 BGN total

This gives you a working prototype you can expand into a real water monitoring station over time.

---

## Quick Reference: Price Summary (BGN/EUR)

| Category | Budget (BGN) | Mid-Range (BGN) | Premium (BGN) |
|----------|-------------|-----------------|---------------|
| **Microcontroller** | 15-25 | 110-130 | 180-220 |
| **Sensors (Full Set)** | 100-150 | 200-350 | 500-800 |
| **Demo Equipment** | 0-100 | 200-400 | 400-600 |
| **Power** | 30-50 | 50-100 | 100-200 |
| **Total Project** | **145-325** | **560-980** | **1180-1820** |

*All prices are estimates and may vary. Check specific shops for current pricing.*