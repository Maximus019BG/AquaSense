# Raspberry Pi Gateway Documentation

## Overview

This component acts as a bridge between the AquaSense hardware sensors and the cloud server. It runs on a Raspberry Pi (Raspberry Pi 5 recommended, 4GB RAM) and listens for water quality data transmitted over LoRa using an RFM95 radio module. The gateway forwards received messages immediately via HTTP POST requests to the main Next.js web application.

## Architecture & Code Structure

The codebase is designed with abstraction, making it modular and easy to adapt for CI/CD or future hardware changes.

- **`sensor_reader.py`**: Defines abstract classes for reading data. It currently implements:
  - `LoraSensorReader`: Reads telemetry from a serial LoRa module and returns parsed payloads as they arrive.
- **`http_transmitter.py`**: Handles transmitting the serialized JSON data robustly to a configured HTTP server.
- **`main.py`**: The entrypoint that brings things together, handling environment-based configuration and the main transmission loop. When LoRa hardware is used, incoming messages are forwarded immediately upon reception; when running without LoRa the gateway can operate in a polling mode using `INTERVAL_SECONDS`.
- **`main.py`**: The entrypoint that brings things together, handling environment-based configuration and the main transmission loop. When LoRa hardware is available, incoming messages are forwarded immediately upon reception. The gateway extracts a `device_id` from incoming LoRa payloads and includes it in the HTTP request as `buoy_id`.
  - Hops deduplication: Clients may forward messages across multiple hops. To avoid duplicate deliveries when the same `device_id` is received multiple times within a short window, the gateway performs a simple in-memory deduplication check and ignores repeated sightings of the same `buoy_id` within `HOPS_WINDOW_SECONDS` (configurable via environment variable).

## Setup & Execution

### Prerequisites

- Python 3.9+
- `requests` package (can install via `pip install requests`)

### Configuration (Environment Variables)

- `SERVER_URL`: The destination for your HTTP POST requests. (Default: `http://localhost:3000/api/readings`)
- `LORA_PORT`: The serial port your LoRa module is attached to. (Default: `/dev/ttyUSB0`)
- `INTERVAL_SECONDS`: Delay between transmissions when running in polling mode.
- `DEVICE_KEY`: Optional device identifier to include with each payload (Default: `default-device-key`).
- `HOPS_WINDOW_SECONDS`: Time window (seconds) to consider duplicate hops for the same `buoy_id` (Default: `2.0`).
- `ALLOW_RAW_LORA`: When set to `true`, the gateway will accept LoRa payloads without Ed25519 signatures. Use only for testing or in trusted networks. (Default: `false`)

### Authentication (Ed25519)

- The gateway verifies Ed25519 signatures on incoming LoRa payloads. Clients MUST sign the canonical JSON payload (sorted keys, no whitespace) and include the base64-encoded signature in the `sig` field of the JSON payload.
- The gateway looks up the client's public key by `id` (device id) in `keys/pubkeys.json`. Populate that file with a mapping of `device_id` -> base64(Ed25519 public key).
- Unsigned or invalidly-signed messages are rejected by the gateway.

If you need to accept raw LoRa payloads without signatures (for example during development or on a trusted local network), you can set the `ALLOW_RAW_LORA` environment variable to `true`. This disables signature enforcement and may expose you to spoofed messages, so only enable it when appropriate.

Example client payload (JSON sent over LoRa):

```json
{
  "id": "sensor-01",
  "metric": "turb_raw",
  "value": 1234,
  "seq": 42,
  "hops": 0,
  "ts": 1650000000,
  "sig": "<base64-signature>"
}
```

Provisioning: generate an Ed25519 keypair per device, store the private key securely on the device (or in a secure element), and add the device's public key (base64) to `hardware/gateway/keys/pubkeys.json` prior to deployment.

### Running

```bash
# Run the gateway (forwards LoRa messages immediately when received)
python src/main.py
```

## CI/CD Readiness

- The module isolates IO operations (Serial / HTTP requests), which makes it amenable to unit testing by mocking the `SensorDataReader` and `DataTransmitter` classes.
- Behavior is configurable entirely through environment variables.
