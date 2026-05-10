"""
AquaSense Models Package

This package contains trained models and utilities for water quality monitoring.

Models included:
- Isolation Forest: Anomaly detection model
- MinMaxScaler: Feature normalization (exported via joblib)
- Feature metadata: JSON file with feature names and order

Usage:
    from models import load_models
    
    loader = load_models()
    is_anomaly = loader.detect_anomaly({'temperature_C': 22, ...})
"""

from .aquasense_models import ModelLoader, load_models

__all__ = ['ModelLoader', 'load_models']
__version__ = '1.0.0'
