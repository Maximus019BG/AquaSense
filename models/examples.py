#!/usr/bin/env python3
"""
AquaSense Model Usage Examples

This script demonstrates various ways to use the exported AquaSense models
with joblib for different deployment scenarios.
"""

import sys
import io
from pathlib import Path

# Fix encoding for Windows terminals
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add parent directory to path so we can import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import load_models
import json
from datetime import datetime


def example_1_basic_anomaly_detection():
    """Example 1: Basic anomaly detection for a single reading."""
    print("\n" + "="*70)
    print("EXAMPLE 1: Basic Anomaly Detection")
    print("="*70)
    
    loader = load_models()
    
    # Sample water quality reading
    reading = {
        'temperature_C': 22.5,
        'salinity_psu': 18.4,
        'dissolved_o2': 6.5,
        'sea_level_m': 0.15
    }
    
    print(f"\nReading: {reading}")
    
    is_anomaly = loader.detect_anomaly(reading)
    score = loader.get_anomaly_score(reading)
    
    print(f"Anomaly detected: {is_anomaly}")
    print(f"Anomaly score: {score:.4f}")
    
    if is_anomaly:
        print("[ALERT] WARNING: This reading is flagged as anomalous!")
    else:
        print("[OK] Reading is normal.")


def example_2_batch_processing():
    """Example 2: Process multiple readings at once."""
    print("\n" + "="*70)
    print("EXAMPLE 2: Batch Processing Multiple Readings")
    print("="*70)
    
    loader = load_models()
    
    # Multiple readings (e.g., from a CSV file or sensor array)
    readings = [
        {
            'temperature_C': 22.0,
            'salinity_psu': 18.0,
            'dissolved_o2': 6.5,
            'sea_level_m': 0.10
        },
        {
            'temperature_C': 28.0,  # High temperature - likely anomalous
            'salinity_psu': 18.5,
            'dissolved_o2': 3.0,    # Low oxygen - likely anomalous
            'sea_level_m': 0.50     # High sea level - likely anomalous
        },
        {
            'temperature_C': 23.5,
            'salinity_psu': 19.0,
            'dissolved_o2': 7.2,
            'sea_level_m': 0.12
        }
    ]
    
    anomalies = loader.batch_detect_anomalies(readings)
    
    print(f"\nProcessing {len(readings)} readings...")
    for i, (reading, is_anomaly) in enumerate(zip(readings, anomalies)):
        status = "[ANOMALY]" if is_anomaly else "[NORMAL]"
        print(f"  [{i+1}] {status} - Temp: {reading['temperature_C']}C, "
              f"O2: {reading['dissolved_o2']} mg/L")


def example_3_threshold_monitoring():
    """Example 3: Monitor readings against physical thresholds."""
    print("\n" + "="*70)
    print("EXAMPLE 3: Threshold-Based Alerts with ML Anomaly Detection")
    print("="*70)
    
    loader = load_models()
    
    # Define physical thresholds
    THRESHOLDS = {
        'temperature_C': {'min': 5, 'max': 30},
        'dissolved_o2': {'min': 4.0, 'max': 12.0},
        'salinity_psu': {'min': 15, 'max': 25},
        'sea_level_m': {'min': -1.0, 'max': 1.0}
    }
    
    reading = {
        'temperature_C': 32.0,  # Exceeds max
        'salinity_psu': 18.4,
        'dissolved_o2': 3.5,    # Below min
        'sea_level_m': 0.15
    }
    
    print(f"\nReading: {reading}")
    print(f"Thresholds: {THRESHOLDS}")
    
    # Check thresholds
    threshold_violations = []
    for feature, value in reading.items():
        if feature in THRESHOLDS:
            thresholds = THRESHOLDS[feature]
            if value < thresholds['min']:
                threshold_violations.append(f"{feature}: {value} (below {thresholds['min']})")
            elif value > thresholds['max']:
                threshold_violations.append(f"{feature}: {value} (above {thresholds['max']})")
    
    # Check ML anomaly detection
    is_ml_anomaly = loader.detect_anomaly(reading)
    
    print(f"\nThreshold violations: {len(threshold_violations)}")
    for violation in threshold_violations:
        print(f"  [!] {violation}")
    
    print(f"ML Anomaly Detection: {'[ANOMALY]' if is_ml_anomaly else '[NORMAL]'}")
    print(f"Overall Status: {'[ALERT]' if (threshold_violations or is_ml_anomaly) else '[OK]'}")


def example_4_scoring_distribution():
    """Example 4: Generate anomaly scores for visualization."""
    print("\n" + "="*70)
    print("EXAMPLE 4: Anomaly Score Distribution (for Visualization)")
    print("="*70)
    
    loader = load_models()
    
    # Generate scores for a range of readings
    import numpy as np
    
    print("\nGenerating anomaly scores for temperature variations...")
    temperatures = np.linspace(10, 35, 10)
    
    results = []
    for temp in temperatures:
        reading = {
            'temperature_C': float(temp),
            'salinity_psu': 18.4,
            'dissolved_o2': 6.5,
            'sea_level_m': 0.15
        }
        score = loader.get_anomaly_score(reading)
        is_anomaly = loader.detect_anomaly(reading)
        
        results.append({
            'temperature': float(temp),
            'score': float(score),
            'is_anomaly': bool(is_anomaly)
        })
        
        status = "[X]" if is_anomaly else "[*]"
        print(f"  {status} Temp {temp:5.1f}C -> Score {score:7.4f}")
    
    # Save results for plotting
    with open('anomaly_scores.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("\nScores saved to anomaly_scores.json")


def example_5_direct_joblib_usage():
    """Example 5: Direct access to joblib objects."""
    print("\n" + "="*70)
    print("EXAMPLE 5: Direct joblib Object Access")
    print("="*70)
    
    import joblib
    
    model_dir = Path(__file__).parent
    
    print(f"\nLoading models from: {model_dir}")
    
    # Load models directly
    isolation_forest = joblib.load(model_dir / 'isolation_forest.pkl')
    scaler = joblib.load(model_dir / 'scaler.pkl')
    
    print(f"[OK] Isolation Forest: {type(isolation_forest).__name__}")
    print(f"[OK] Scaler: {type(scaler).__name__}")
    
    # Use them directly
    reading = [22.5, 6.5, 18.4, 0.15]  # [temp, o2, salinity, sea_level]
    
    print(f"\nRaw reading: {reading}")
    
    # Scale
    scaled = scaler.transform([reading])
    print(f"Scaled: {scaled[0]}")
    
    # Predict
    prediction = isolation_forest.predict(scaled)
    score = isolation_forest.score_samples(scaled)[0]
    
    label = 'anomaly' if prediction[0] == -1 else 'normal'
    print(f"Prediction: {prediction[0]} ({label})")
    print(f"Score: {score:.4f}")


def example_6_model_information():
    """Example 6: Get model metadata."""
    print("\n" + "="*70)
    print("EXAMPLE 6: Model Information and Metadata")
    print("="*70)
    
    loader = load_models()
    
    print(f"\nAvailable Models:")
    for model_name, available in loader.available_models().items():
        status = "[+]" if available else "[-]"
        print(f"  {status} {model_name}")
    
    print(f"\nFeatures (in order):")
    for i, feature in enumerate(loader.features, 1):
        print(f"  {i}. {feature}")
    
    # Check model files
    model_dir = Path(__file__).parent
    print(f"\nModel Files:")
    for pkl_file in model_dir.glob('*.pkl'):
        size_kb = pkl_file.stat().st_size / 1024
        print(f"  {pkl_file.name:<30} {size_kb:>8.1f} KB")
    
    for joblib_file in model_dir.glob('*.joblib'):
        size_kb = joblib_file.stat().st_size / 1024
        print(f"  {joblib_file.name:<30} {size_kb:>8.1f} KB")


def main():
    """Run all examples."""
    print("\n" + "="*70)
    print("AquaSense Model Usage Examples")
    print("="*70)
    
    examples = [
        example_1_basic_anomaly_detection,
        example_2_batch_processing,
        example_3_threshold_monitoring,
        example_4_scoring_distribution,
        example_5_direct_joblib_usage,
        example_6_model_information,
    ]
    
    for example_func in examples:
        try:
            example_func()
        except Exception as e:
            print(f"\n[ERROR] Error in {example_func.__name__}: {e}")
    
    print("\n" + "="*70)
    print("Examples complete!")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()
