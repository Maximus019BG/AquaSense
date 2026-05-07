# AquaSense Models

## Overview

This directory contains trained machine learning models for AquaSense water quality monitoring, exported using **joblib** for easy sharing and deployment.

## Models Included

### 1. **Isolation Forest** (`isolation_forest.pkl`)
- **Purpose**: Anomaly detection in water quality readings
- **Type**: scikit-learn IsolationForest model
- **Features**: Temperature, Dissolved O₂, Salinity, Sea Level
- **Export**: joblib
- **Size**: ~50 KB

### 2. **MinMaxScaler** (`scaler.pkl`)
- **Purpose**: Feature normalization [0, 1] range
- **Type**: scikit-learn MinMaxScaler
- **Export**: joblib
- **Dependencies**: Fitted on training data - must be used with Isolation Forest

### 3. **Feature Names** (`feature_names.json`)
- **Purpose**: Defines the exact feature order and names
- **Format**: JSON array
- **Critical**: Ensures consistency across training, validation, and inference

### 4. **Imputer** (`imputer.joblib`)
- **Purpose**: Handle missing values in data
- **Type**: scikit-learn SimpleImputer
- **Export**: joblib

## Installation

1. **Copy the models directory** to your project:
   ```bash
   cp -r models/ /path/to/your/project/
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   pip install scikit-learn joblib numpy pandas
   ```

## Usage

### Quick Start

```python
from models import load_models

# Load all models
loader = load_models()

# Check available models
print(loader.available_models())

# Detect anomalies
reading = {
    'temperature_C': 22.5,
    'salinity_psu': 18.4,
    'dissolved_o2': 6.5,
    'sea_level_m': 0.15
}

is_anomaly = loader.detect_anomaly(reading)
print(f"Anomaly detected: {is_anomaly}")

# Get anomaly score (more negative = more anomalous)
score = loader.get_anomaly_score(reading)
print(f"Anomaly score: {score:.4f}")
```

### Advanced: Batch Processing

```python
readings = [
    {'temperature_C': 22.5, 'salinity_psu': 18.4, 'dissolved_o2': 6.5, 'sea_level_m': 0.15},
    {'temperature_C': 25.0, 'salinity_psu': 19.0, 'dissolved_o2': 5.0, 'sea_level_m': 0.20},
    # ... more readings
]

anomalies = loader.batch_detect_anomalies(readings)
for i, is_anomaly in enumerate(anomalies):
    print(f"Reading {i}: Anomaly={is_anomaly}")
```

### Direct joblib Loading

If you prefer to work directly with joblib:

```python
import joblib
from pathlib import Path

model_dir = Path('models')

# Load models directly
isolation_forest = joblib.load(model_dir / 'isolation_forest.pkl')
scaler = joblib.load(model_dir / 'scaler.pkl')
imputer = joblib.load(model_dir / 'imputer.joblib')

# Use them
scaled_reading = scaler.transform([[22.5, 6.5, 18.4, 0.15]])
prediction = isolation_forest.predict(scaled_reading)
```

## Model Details

### Isolation Forest Parameters
- **n_estimators**: 100 (number of trees)
- **contamination**: 0.05 (expected anomaly rate)
- **random_state**: 42 (reproducibility)

### Features (in order)
1. `temperature_C` - Water temperature in Celsius
2. `dissolved_o2` - Dissolved oxygen in mg/L
3. `salinity_psu` - Salinity in PSU (Practical Salinity Units)
4. `sea_level_m` - Sea level elevation in meters

## Deployment

### Raspberry Pi / Edge Devices

The models are lightweight and suitable for deployment on edge devices:

```python
#!/usr/bin/env python3
# deploy_on_pi.py - Example for Raspberry Pi

from models import load_models
import time

loader = load_models()

while True:
    # Read from sensors (pseudocode)
    reading = read_sensor_data()
    
    if loader.detect_anomaly(reading):
        print("ALERT: Anomaly detected!")
        log_anomaly(reading)
    
    time.sleep(300)  # Check every 5 minutes
```

### Web Service / API

```python
from flask import Flask, request, jsonify
from models import load_models

app = Flask(__name__)
loader = load_models()

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    try:
        is_anomaly = loader.detect_anomaly(data)
        score = loader.get_anomaly_score(data)
        return jsonify({
            'anomaly': bool(is_anomaly),
            'score': float(score)
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

## Troubleshooting

### ModuleNotFoundError: No module named 'models'

Make sure the `models/` directory is in your Python path:

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from models import load_models
```

### FileNotFoundError: Model file not found

Ensure all `.pkl` and `.json` files are present in the models directory. Check file permissions and that training was completed successfully.

### Feature name warnings

The scikit-learn warnings about feature names are harmless. The models will still work correctly. To suppress them:

```python
import warnings
warnings.filterwarnings('ignore', category=UserWarning)
```

## Model Training

To retrain these models, run the Jupyter notebook:

```bash
cd model/
jupyter notebook 01_anomaly_detection_training.ipynb
```

This will regenerate all `.pkl` files in the `model/outputs/` directory.

## File Structure

```
models/
├── __init__.py                  # Package initialization
├── aquasense_models.py          # Model loading module
├── isolation_forest.pkl         # Anomaly detection model (joblib)
├── scaler.pkl                   # Feature scaler (joblib)
├── imputer.joblib               # Missing value imputer (joblib)
├── feature_names.json           # Feature metadata
└── README.md                    # This file
```

## Requirements

- Python 3.8+
- scikit-learn >= 0.24
- joblib >= 1.0
- numpy
- pandas (optional, for batch processing)

## License

This project is part of the AquaSense water quality monitoring system.

## Support

For issues or questions about the models, refer to:
- [Project Documentation](../docs/project/COMPLETE_PROJECT_DOCUMENTATION.md)
- [Implementation Plan](../docs/plans/IMPLEMENTATION_PLAN.md)
