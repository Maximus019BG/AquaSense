# Raspberry Pi Gateway Documentation

## Overview
This component acts as a bridge between the AquaSense hardware sensors and the cloud server. It runs on a Raspberry Pi (or similar Linux machine) and listens for water quality data transmitted over LoRa. The gateway then forwards this data via HTTP POST requests to the main Next.js web application.

## Architecture & Code Structure
The codebase is designed with abstraction, making it modular and easy to adapt for CI/CD or future hardware changes.

- **`sensor_reader.py`**: Defines abstract classes for reading data. It currently implements:
  - `LoraSensorReader`: Reads telemetry from a serial LoRa module.
  - `DummySensorReader`: Falling back to realistic random data if LoRa hardware is unavailable or fails. Returns data containing:
    - Temperature
    - pH
    - Light Intensity
    - Turbidity
    - Gyro Level (X, Y, Z)
    - Gyro Accelerometer (X, Y, Z)
- **`http_transmitter.py`**: Handles transmitting the serialized JSON data robustly to a configured HTTP server.
- **`main.py`**: The entrypoint that brings things together, handling environment-based configuration and the main transmission loop.

## Setup & Execution

### Prerequisites
- Python 3.9+ 
- `requests` package (can install via `pip install requests`)

### Configuration (Environment Variables)
- `SERVER_URL`: The destination for your HTTP POST requests. (Default: `http://localhost:3000/api/readings`)
- `LORA_PORT`: The serial port your LoRa module is attached to. (Default: `/dev/ttyUSB0`)
- `USE_DUMMY_DATA`: `true` or `false`. If `true`, ignores LoRa and continually streams dummy test data.
- `INTERVAL_SECONDS`: Delay between transmissions.

### Running
```bash
# E.g. locally with dummy data
USE_DUMMY_DATA=true INTERVAL_SECONDS=10 python src/main.py
```

## CI/CD Readiness
- The module isolates IO operations (Serial / HTTP requests), which makes it amenable to unit testing by mocking the `SensorDataReader` and `DataTransmitter` classes.
- Behavior is configurable entirely through environment variables.
