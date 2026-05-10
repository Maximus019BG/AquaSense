# AquaSense Models - Distribution & Deployment Guide

## Quick Summary

Your AquaSense models are now **exported using joblib** and ready to share with others!

## What's Exported

| File | Size | Purpose | Type |
|------|------|---------|------|
| `isolation_forest.pkl` | 1.7 MB | Anomaly detection model | joblib |
| `scaler.pkl` | 1.1 KB | Feature normalization | joblib |
| `imputer.joblib` | 22.9 MB | Missing value handler | joblib |
| `feature_names.json` | < 1 KB | Feature metadata | JSON |
| `aquasense_models.py` | ~ 7 KB | Python interface | Module |
| `__init__.py` | < 1 KB | Package initialization | Module |
| `examples.py` | ~ 12 KB | Usage examples | Script |
| `README.md` | ~ 8 KB | Documentation | Markdown |

**Total: ~24.6 MB** (Lightweight enough for edge devices!)

## Distribution Options

### Option 1: Share as Python Package

```bash
# Distribute the models/ directory
zip -r aquasense-models.zip models/

# Others install it
unzip aquasense-models.zip
pip install -r requirements.txt  # scikit-learn, joblib, numpy
```

**Usage:**
```python
from models import load_models

loader = load_models()
is_anomaly = loader.detect_anomaly(reading)
```

### Option 2: Share Individual Files

If others only need specific models:

```bash
# Just send the essentials
models/isolation_forest.pkl
models/scaler.pkl
models/feature_names.json
models/aquasense_models.py
```

### Option 3: Docker Image

Create a deployable container:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY models/ models/
COPY requirements.txt .
RUN pip install -r requirements.txt
CMD ["python", "-c", "from models import load_models; loader = load_models()"]
```

### Option 4: REST API Service

```bash
# Containerized web service
docker build -t aquasense-api .
docker run -p 5001:5001 aquasense-api
```

See `models/README.md` for API example.

## Getting Started for Others

### Step 1: Install Dependencies

```bash
pip install scikit-learn joblib numpy pandas
```

### Step 2: Copy Models

```bash
cp -r models/ /your/project/
```

### Step 3: Load and Use

```python
from models import load_models

# Initialize
loader = load_models()

# Single reading
reading = {
    'temperature_C': 22.5,
    'salinity_psu': 18.4,
    'dissolved_o2': 6.5,
    'sea_level_m': 0.15
}

# Detect anomaly
is_anomaly = loader.detect_anomaly(reading)
score = loader.get_anomaly_score(reading)

print(f"Anomaly: {is_anomaly}, Score: {score:.4f}")
```

## Direct joblib Usage

For developers who want to use joblib directly:

```python
import joblib
from pathlib import Path

# Load models
iso_forest = joblib.load('models/isolation_forest.pkl')
scaler = joblib.load('models/scaler.pkl')

# Use them
scaled_data = scaler.transform(your_data)
predictions = iso_forest.predict(scaled_data)
```

## Deployment Scenarios

### Scenario 1: Raspberry Pi / Edge Device

```bash
scp -r models/ pi@raspberrypi:/home/pi/aquasense/
ssh pi@raspberrypi "cd aquasense && python deploy.py"
```

### Scenario 2: Cloud Function / Lambda

```python
# AWS Lambda handler
from models import load_models

loader = load_models()

def handler(event, context):
    reading = event['reading']
    is_anomaly = loader.detect_anomaly(reading)
    return {'anomaly': is_anomaly}
```

### Scenario 3: Microservice / Docker

```bash
cd models
docker build -t aquasense-service:1.0 .
docker push your-registry/aquasense-service:1.0
```

### Scenario 4: Data Pipeline (Batch)

```python
import pandas as pd
from models import load_models

# Load CSV of readings
df = pd.read_csv('sensor_readings.csv')

# Load models
loader = load_models()

# Process all readings
readings = df[['temperature_C', 'salinity_psu', 'dissolved_o2', 'sea_level_m']].to_dict('records')
anomalies = loader.batch_detect_anomalies(readings)

# Save results
df['is_anomaly'] = anomalies
df.to_csv('sensor_readings_with_anomalies.csv', index=False)
```

## Version Control & Updates

### Save model version info

```python
# model_version.json
{
  "version": "1.0.0",
  "training_date": "2024-05-07",
  "training_samples": 370,
  "features": ["temperature_C", "dissolved_o2", "salinity_psu", "sea_level_m"],
  "isolation_forest": {
    "n_estimators": 100,
    "contamination": 0.05,
    "random_state": 42
  },
  "trained_by": "AquaSense team"
}
```

### Track model lineage

When retraining, save previous versions:

```bash
models/
├── isolation_forest.pkl              # Current
├── scaler.pkl                        # Current
└── archive/
    ├── v1.0/
    │   ├── isolation_forest.pkl
    │   └── scaler.pkl
    └── v0.9/
        ├── isolation_forest.pkl
        └── scaler.pkl
```

## Troubleshooting

### "ModuleNotFoundError: No module named 'models'"

Ensure Python path includes the parent directory:

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path.home() / 'projects' / 'aquasense'))

from models import load_models
```

### "FileNotFoundError: isolation_forest.pkl"

Check that all files are in the models directory:

```bash
ls -lh models/*.pkl models/*.joblib
```

### Scikit-learn version conflicts

Ensure consistent scikit-learn versions:

```bash
pip install scikit-learn==1.3.2  # Match training version
```

## Next Steps

1. **Test locally**: Run `python models/examples.py`
2. **Share package**: Zip and distribute `models/` directory
3. **Monitor usage**: Track model predictions in production
4. **Plan retraining**: Schedule model updates as new data arrives
5. **Document**: Keep `model_version.json` updated

## Files Summary

```
models/
├── __init__.py                 # Package init
├── aquasense_models.py         # Main module (imports/exports)
├── README.md                   # Detailed documentation
├── isolation_forest.pkl        # Joblib-exported model
├── scaler.pkl                  # Joblib-exported scaler
├── imputer.joblib              # Joblib-exported imputer
├── feature_names.json          # Feature metadata
└── examples.py                 # Usage demonstrations
```

## Summary

✓ **All models exported with joblib** for easy sharing  
✓ **Clean Python interface** for easy integration  
✓ **Comprehensive documentation** and examples  
✓ **Lightweight deployment** (<25 MB)  
✓ **Ready for production** use  

Your models are production-ready! 🚀
