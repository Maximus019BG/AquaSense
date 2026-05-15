"""
AquaSense Model Loader and Inference Module

This module provides a clean interface to load and use the trained AquaSense models.
Models are exported using joblib for easy sharing and deployment.

Usage:
    from models.aquasense_models import ModelLoader
    
    loader = ModelLoader()
    
    # Anomaly detection
    is_anomaly = loader.detect_anomaly({
        'temperature_C': 22.5,
        'salinity_psu': 18.4,
        'dissolved_o2': 6.5,
        'sea_level_m': 0.15
    })
    
    # Checking model availability
    print(loader.available_models())
"""

import joblib
import json
from pathlib import Path
import numpy as np
from typing import Dict, List, Optional, Tuple


class ModelLoader:
    """Load and manage AquaSense models trained with joblib and scikit-learn."""
    
    def __init__(self, model_dir: Optional[Path] = None):
        """
        Initialize the model loader.
        
        Args:
            model_dir: Path to directory containing models. 
                      Defaults to the directory where this file is located.
        """
        if model_dir is None:
            package_dir = Path(__file__).parent
            artifacts_dir = package_dir / 'artifacts'
            model_dir = artifacts_dir if artifacts_dir.exists() else package_dir
        
        self.model_dir = Path(model_dir)
        self._isolation_forest = None
        self._scaler = None
        self._features = None
        self._load_metadata()
    
    def _load_metadata(self):
        """Load feature names from JSON."""
        features_file = self.model_dir / 'feature_names.json'
        if features_file.exists():
            with open(features_file, 'r') as f:
                self._features = json.load(f)
    
    @property
    def isolation_forest(self):
        """Lazy-load and cache the Isolation Forest model."""
        if self._isolation_forest is None:
            iso_file = self.model_dir / 'isolation_forest.pkl'
            if not iso_file.exists():
                raise FileNotFoundError(
                    f"Isolation Forest model not found at {iso_file}. "
                    "Run the training notebook first."
                )
            self._isolation_forest = joblib.load(iso_file)
        return self._isolation_forest
    
    @property
    def scaler(self):
        """Lazy-load and cache the MinMaxScaler."""
        if self._scaler is None:
            scaler_file = self.model_dir / 'scaler.pkl'
            if not scaler_file.exists():
                raise FileNotFoundError(
                    f"Scaler model not found at {scaler_file}. "
                    "Run the training notebook first."
                )
            self._scaler = joblib.load(scaler_file)
        return self._scaler
    
    @property
    def features(self) -> List[str]:
        """Get the list of features expected by the model."""
        if self._features is None:
            # Fallback if feature_names.json doesn't exist
            self._features = [
                'sea_level_m', 'temperature_C', 'dissolved_o2', 
                'primary_production', 'salinity_psu', 'nitrate', 'phosphate'
            ]
        return self._features
    
    def available_models(self) -> Dict[str, bool]:
        """
        Check which models are available.
        
        Returns:
            Dictionary with model names and availability status.
        """
        return {
            'isolation_forest': (self.model_dir / 'isolation_forest.pkl').exists(),
            'scaler': (self.model_dir / 'scaler.pkl').exists(),
            'feature_names': (self.model_dir / 'feature_names.json').exists(),
            'imputer': (self.model_dir / 'imputer.joblib').exists(),
        }
    
    def detect_anomaly(self, reading: Dict[str, float]) -> bool:
        """
        Detect if a water quality reading is anomalous.
        
        Args:
            reading: Dictionary with feature values, e.g.:
                    {'temperature_C': 22.5, 'salinity_psu': 18.4, 
                     'dissolved_o2': 6.5, 'sea_level_m': 0.15}
        
        Returns:
            True if anomaly detected, False if normal.
            
        Raises:
            ValueError: If required features are missing from reading.
        """
        # Extract features in correct order
        features_to_use = ['temperature_C', 'dissolved_o2', 'salinity_psu', 'sea_level_m']
        
        missing = set(features_to_use) - set(reading.keys())
        if missing:
            raise ValueError(f"Missing required features: {missing}")
        
        # Create feature vector in correct order
        feature_vector = [[reading[f] for f in features_to_use]]
        
        # Scale the input
        scaled = self.scaler.transform(feature_vector)
        
        # Get prediction (-1 = anomaly, 1 = normal)
        prediction = self.isolation_forest.predict(scaled)[0]
        
        return prediction == -1
    
    def get_anomaly_score(self, reading: Dict[str, float]) -> float:
        """
        Get the anomaly score for a reading (more negative = more anomalous).
        
        Args:
            reading: Dictionary with feature values.
        
        Returns:
            Anomaly score (negative values indicate anomalies).
        """
        features_to_use = ['temperature_C', 'dissolved_o2', 'salinity_psu', 'sea_level_m']
        
        missing = set(features_to_use) - set(reading.keys())
        if missing:
            raise ValueError(f"Missing required features: {missing}")
        
        feature_vector = [[reading[f] for f in features_to_use]]
        scaled = self.scaler.transform(feature_vector)
        
        return self.isolation_forest.score_samples(scaled)[0]
    
    def batch_detect_anomalies(self, readings: List[Dict[str, float]]) -> List[bool]:
        """
        Detect anomalies in multiple readings at once.
        
        Args:
            readings: List of reading dictionaries.
        
        Returns:
            List of boolean anomaly indicators.
        """
        return [self.detect_anomaly(r) for r in readings]


# Convenience function for quick imports
def load_models(model_dir: Optional[Path] = None) -> ModelLoader:
    """
    Convenience function to load all models.
    
    Usage:
        loader = load_models()
        is_anomaly = loader.detect_anomaly(reading)
    """
    return ModelLoader(model_dir)


if __name__ == '__main__':
    # Example usage
    try:
        loader = ModelLoader()
        
        print("✓ Available models:")
        for model_name, available in loader.available_models().items():
            status = "✓" if available else "✗"
            print(f"  {status} {model_name}")
        
        # Example detection
        sample_reading = {
            'temperature_C': 22.5,
            'salinity_psu': 18.4,
            'dissolved_o2': 6.5,
            'sea_level_m': 0.15
        }
        
        is_anomaly = loader.detect_anomaly(sample_reading)
        score = loader.get_anomaly_score(sample_reading)
        
        print(f"\nSample reading: {sample_reading}")
        print(f"Is anomaly: {is_anomaly}")
        print(f"Anomaly score: {score:.4f}")
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
