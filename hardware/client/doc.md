**Overview**

- **Project**: AquaSense client firmware (ESP32) that reads sensors and transmits via LoRa.
- **Repository files**: see [src/main.cpp](src/main.cpp), [platformio.ini](platformio.ini), and shared protocol in [lib/shared/include/protocol.h](lib/shared/include/protocol.h).
- **Security**: LoRa sensor payloads are signed with Ed25519 to authenticate origin and protect integrity. See the "Security: Ed25519 signing" section below.

**Hardware / Main Board**

- **Main MCU**: Espressif ESP32 (board defined in PlatformIO build settings).
- **Build flags**: GPIO and settings are provided via `build_flags` in [platformio.ini](platformio.ini).
  - Edit `build_flags` to change pin assignments or `DEVICE_ID`.

**Pin Mapping (configured via `platformio.ini`)**

- **Turbidity sensor**: `SENSOR_PIN` (analog input). See [platformio.ini](platformio.ini).
- **pH sensor**: `PH_SENSOR_PIN` (analog input). Added default: `PH_SENSOR_PIN=19` in [platformio.ini](platformio.ini).
- **Temperature probe / OneWire**: `TEMP_SENSOR_PIN` is used as a digital OneWire bus. See [src/main.cpp](src/main.cpp).
- **BH1750 light sensor (I2C)**: `BH1750_SDA_PIN`, `BH1750_SCL_PIN` (I2C pins). BH1750 is on I2C address 0x23. See [src/main.cpp](src/main.cpp).
- **ADXL345 accelerometer**:
  - Primary: I2C on `ADXL345_SDA_PIN` / `ADXL345_SCL_PIN`.
  - SPI fallback: code tries SCK/MISO/MOSI combos (e.g. SCK=18, MISO=19, MOSI=23) and CS candidates (5, 15). See ADXL init logic in [src/main.cpp](src/main.cpp).
- **LoRa**: SPI-based LoRa module. Frequency controlled by `LORA_FREQUENCY` (build flag). LoRa library use in [src/lora_module.cpp](src/lora_module.cpp).

**Sensors (what code reads and how)**

- **Turbidity**: read by `Sensor` class (`include/sensor.h`, `src/sensor.cpp`) via `analogRead(SENSOR_PIN)` and sent as metrics `turb_raw` and `turb_pct` in `loop()` ([src/main.cpp](src/main.cpp)).
- **pH**: if `PH_SENSOR_PIN` defined, `Sensor phSensor(PH_SENSOR_PIN)` is created and raw value is sent as `ph_raw`. Currently raw ADC value is sent; optional calibration is not included yet. See `loop()` in [src/main.cpp](src/main.cpp).
- **Temperature**: OneWire (DS18B20) on `TEMP_SENSOR_PIN` using the `DallasTemperature` library; code checks devices and reads temperature. GPIO 4 is treated as a digital bus, not an analog input. See [src/main.cpp](src/main.cpp).
- **Light (BH1750)**: BH1750 I2C read with `readBh1750()` and sent as `lux` metric. See [src/main.cpp](src/main.cpp).
- **Accelerometer (ADXL345)**: read axis values when detected; sends `accel_x`, `accel_y`, `accel_z` metrics. See detection and read in [src/main.cpp](src/main.cpp).

**LoRa Module / Radio behavior**

- `LoRaModule` wrapper in [include/lora_module.h](include/lora_module.h) and [src/lora_module.cpp](src/lora_module.cpp).
- `begin()` initializes SPI + LoRa radio; `send()` wraps `LoRa.beginPacket()`/`LoRa.endPacket()` and returns radio to receive mode with `LoRa.receive()` after sending.
- `onReceive()` registers a callback invoked when a packet arrives; the project registers a handler in `setup()` (see [src/main.cpp](src/main.cpp)).

**Protocol: payload format and implementation**

- Shared payload type: `Shared::SensorPayload` defined in [lib/shared/include/protocol.h](lib/shared/include/protocol.h).
  - Fields: `id[16]` (origin device id), `metric[16]`, `value` (int32), `seq` (uint32 per-origin sequence), `hops` (uint8), `ts` (uint32 epoch seconds).
- Serialization/parsing: implemented in [lib/shared/src/protocol.cpp](lib/shared/src/protocol.cpp).
  - Serialize produces compact JSON-like string: {"id":"...","metric":"...","value":...,"hops":...,"ts":...}
  - Parse extracts `id`, `metric`, `value`, `hops` (optional), and `ts`.
- All sensor transmissions use `logAndSend()` in [src/main.cpp](src/main.cpp), which fills a `SensorPayload` and calls `Shared::serializePayload()` then `lora.send()`.

**Relay / Hops logic (how multi-hop forwarding works)**

- Goal: extend range by allowing clients to forward packets toward the gateway.
- Key parameters (defined in code):
  - `RELAY_MAX_HOPS` (default 3): maximum hop count a packet may be forwarded.
  - `RELAY_CACHE_SIZE` (default 16): number of recent packet hashes stored to deduplicate.
- Deduplication (implemented):
- Incoming packets are parsed into `Shared::SensorPayload` and a dedupe key is built from the origin identifier and sequence: `id|seq`.
- That key is hashed with FNV-1a and tracked in a small ring `relayCache`.
- Using `seq` ensures relaying decisions are stable even if `hops` is changed during forwarding.
- If the hash exists in the cache, the packet is considered duplicate and not re-relayed.
- Relay handler (registered via `lora.onReceive()` in [src/main.cpp](src/main.cpp)) steps:

1.  Copy incoming bytes to a null-terminated buffer and parse with `Shared::parsePayload()`.
2.  Ignore the packet if parsing fails or if `p.id == DEVICE_ID` (originated here).
3.  Build dedupe key `id|metric|value|ts`, hash it, and skip if present in `relayCache`.
4.  Check `p.hops`; if `p.hops >= RELAY_MAX_HOPS` skip relaying.
5.  Increment `p.hops`, re-serialize payload, and call `lora.send()` to rebroadcast.
6.  On successful send, add the dedupe key hash to `relayCache` to prevent future re-relays of the same origin+payload.

- Notes on behavior and loops:
  - Because each relay increments `hops`, relaying is bounded by `RELAY_MAX_HOPS` and cannot continue forever.
  - Origin-based dedupe ignores `hops` when deciding duplicates, so nodes won't re-relay the same original message just because `hops` changed.
  - If `ts` has low resolution or collisions are possible, adding a per-origin `seq` field is recommended for robust dedupe.

**Device identity and build-time configuration**

- `DEVICE_ID` is used as the origin ID in payload `id` field. It defaults to `sensor-01` but can be set per-device at build time.
  - Default in [platformio.ini](platformio.ini): `-D DEVICE_ID="sensor-01"`.
  - Override during build:
    ```bash
    pio run -e client -D DEVICE_ID="client-23" -t upload
    ```

**How to add pH calibration (suggestion)**

- Currently `ph_raw` is the raw ADC value. For a calibrated pH (0–14):
  1. Measure known pH buffer solutions and record ADC values.
  2. Fit a linear or piecewise-linear mapping ADC -> pH.
  3. Replace `logAndSend("pH raw", "ph_raw", phVal, "raw")` with a calibrated value, e.g., `ph_x100 = (int32_t)roundf(ph * 100)` and metric `ph_x100`.

**Files of interest**

- Main app: [src/main.cpp](src/main.cpp)
- Sensor wrapper: [include/sensor.h](include/sensor.h), [src/sensor.cpp](src/sensor.cpp)
- LoRa wrapper: [include/lora_module.h](include/lora_module.h), [src/lora_module.cpp](src/lora_module.cpp)
- Shared protocol: [lib/shared/include/protocol.h](lib/shared/include/protocol.h), [lib/shared/src/protocol.cpp](lib/shared/src/protocol.cpp)
- Build flags / pins: [platformio.ini](platformio.ini)

**Recommendations / Next steps**

- If you want zero chance of re-relay loops, implement dedupe based on `(id, metric, ts)` rather than the whole packet bytes.
- Add a per-origin monotonic sequence number to `SensorPayload` to make dedupe robust even if `ts` granularity is coarse.
- Increase `RELAY_CACHE_SIZE` if the network is busier or add time-based expiry.
- Implement calibrated pH conversion and optionally send pH in scaled integer (e.g., pH\*100) for compactness.

If you want, I can now:

- implement origin-based dedupe (ignore `hops` when hashing), or
- add calibrated pH conversion and a test harness.

**Security: Ed25519 signing**

- Summary: All sensor payloads transmitted over LoRa are signed with Ed25519 to ensure authenticity and integrity. Signatures are carried in a `sig` field (base64 string) in the serialized payload.

- Signed fields: `id`, `metric`, `value`, `seq`, `ts` (canonical order). Do not include `hops` or `sig` in the signed data.

- Client signing (ESP32):
  - Build canonical bytes from the signed fields using a stable encoding (for example: ASCII join with `|`: `id|metric|value|seq|ts`).
  - Sign the canonical bytes with the device's Ed25519 private key.
  - Base64-encode the 64-byte signature and include it as the `sig` string in the payload JSON.
  - Transmit the payload including `sig`. Do not modify `sig` on relays; relays may only increment `hops`.

- Relay requirements:
  - Relays MUST NOT change any signed fields or the `sig` field. They may increment `hops` only.
  - Deduplication continues to use `id|seq` (or `id|seq|metric`) as the cache key.

- Gateway verification:
  - Parse payload, extract `sig` and the signed fields.
  - Recreate the canonical bytes exactly as the client did.
  - Lookup the public key for `id` and verify the signature with an Ed25519-capable library.
  - Reject or drop packets with invalid signatures.
  - Use `seq` per device to provide replay protection; reject `seq` ≤ last-seen and persist last-seen values.

- Key management and implementation notes:
  - Do not commit private keys to source. Provision keys securely or store in protected flash/secure element on device.
  - Client libraries: Monocypher is a small portable option for ESP32. Other lightweight Ed25519 C implementations are available in `lib/ed25519`.
  - Gateway/server: use libsodium or any Ed25519-capable crypto library for verification.
  - Signature size: raw Ed25519 signature = 64 bytes; base64 representation ≈ 88 characters. Account for the extra bytes in payload sizing.

If you want, I can:

- add the `sig` field to `SensorPayload` and update serialization/parsing in the shared protocol, or
- create a small example showing how to sign on ESP32 with Monocypher and verify on a desktop using libsodium.
