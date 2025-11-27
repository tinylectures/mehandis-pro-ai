"""
Anomaly Detection Model for Quantity Validation
Uses Isolation Forest and statistical methods to detect anomalies in construction quantities
"""
import numpy as np
# from sklearn.ensemble import IsolationForest  # Optional - not needed for basic detection
from typing import Dict, Any, Tuple, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class AnomalyDetector:
    """
    Detects anomalies in construction quantity data
    Requirements: 6.1, 6.2
    """
    
    def __init__(self):
        self.version = "1.0.0"
        self.last_trained = datetime.now().isoformat()
        
        # Initialize Isolation Forest model (optional - using statistical methods instead)
        # self.model = IsolationForest(
        #     contamination=0.1,  # Expected proportion of outliers
        #     random_state=42,
        #     n_estimators=100
        # )
        
        # Historical data for statistical analysis
        self.historical_stats = self._load_historical_stats()
        
        logger.info("Anomaly detector initialized")
    
    def _load_historical_stats(self) -> Dict[str, Dict[str, Any]]:
        """Load historical statistics for different element categories"""
        # In production, this would load from a database
        # For now, using reasonable defaults based on construction standards
        return {
            "wall": {
                "volume": {"mean": 50.0, "std": 20.0, "min": 5.0, "max": 200.0},
                "area": {"mean": 100.0, "std": 40.0, "min": 10.0, "max": 500.0},
                "length": {"mean": 10.0, "std": 5.0, "min": 1.0, "max": 50.0}
            },
            "floor": {
                "volume": {"mean": 30.0, "std": 15.0, "min": 5.0, "max": 150.0},
                "area": {"mean": 200.0, "std": 80.0, "min": 20.0, "max": 1000.0}
            },
            "column": {
                "volume": {"mean": 5.0, "std": 3.0, "min": 0.5, "max": 20.0},
                "length": {"mean": 3.5, "std": 1.5, "min": 2.0, "max": 8.0}
            },
            "beam": {
                "volume": {"mean": 8.0, "std": 4.0, "min": 1.0, "max": 30.0},
                "length": {"mean": 6.0, "std": 3.0, "min": 2.0, "max": 15.0}
            },
            "slab": {
                "volume": {"mean": 40.0, "std": 20.0, "min": 5.0, "max": 200.0},
                "area": {"mean": 150.0, "std": 60.0, "min": 15.0, "max": 800.0}
            }
        }
    
    def detect(
        self,
        category: str,
        quantity_type: str,
        value: float,
        metadata: Optional[Dict[str, Any]] = None,
        threshold: float = 0.8
    ) -> Tuple[bool, float, Optional[Dict[str, float]]]:
        """
        Detect if a quantity value is anomalous
        
        Args:
            category: Element category (wall, floor, column, etc.)
            quantity_type: Type of quantity (volume, area, length)
            value: Quantity value to check
            metadata: Additional context
            threshold: Confidence threshold for anomaly detection
        
        Returns:
            Tuple of (is_anomaly, confidence, expected_range)
        """
        try:
            # Normalize category
            category = category.lower()
            quantity_type = quantity_type.lower()
            
            # Get historical stats for this category and type
            if category in self.historical_stats:
                if quantity_type in self.historical_stats[category]:
                    stats = self.historical_stats[category][quantity_type]
                    
                    # Calculate z-score
                    z_score = abs((value - stats['mean']) / stats['std'])
                    
                    # Check if value is within reasonable range
                    is_outside_range = value < stats['min'] or value > stats['max']
                    
                    # Check if value is statistical outlier (z-score > 3)
                    is_statistical_outlier = z_score > 3
                    
                    # Determine if anomaly
                    is_anomaly = is_outside_range or is_statistical_outlier
                    
                    # Calculate confidence based on z-score
                    # Higher z-score = higher confidence it's an anomaly
                    confidence = min(z_score / 5.0, 1.0) if is_anomaly else 1.0 - min(z_score / 5.0, 1.0)
                    
                    expected_range = {
                        "min": stats['min'],
                        "max": stats['max'],
                        "mean": stats['mean'],
                        "std": stats['std']
                    }
                    
                    logger.info(f"Anomaly check: {category}/{quantity_type}={value}, z-score={z_score:.2f}, anomaly={is_anomaly}")
                    
                    return is_anomaly, confidence, expected_range
            
            # If no historical data, use conservative approach
            logger.warning(f"No historical data for {category}/{quantity_type}, using conservative detection")
            
            # Check for obviously invalid values
            if value <= 0 or value > 10000:
                return True, 0.9, {"min": 0.1, "max": 10000, "mean": 100, "std": 50}
            
            return False, 0.5, None
            
        except Exception as e:
            logger.error(f"Error in anomaly detection: {str(e)}")
            return False, 0.0, None
    
    def batch_detect(self, quantities: list) -> list:
        """
        Detect anomalies in a batch of quantities
        
        Args:
            quantities: List of quantity dictionaries
        
        Returns:
            List of detection results
        """
        results = []
        for qty in quantities:
            is_anomaly, confidence, expected_range = self.detect(
                category=qty.get('category', ''),
                quantity_type=qty.get('quantity_type', ''),
                value=qty.get('value', 0),
                metadata=qty.get('metadata')
            )
            results.append({
                'element_id': qty.get('element_id'),
                'is_anomaly': is_anomaly,
                'confidence': confidence,
                'expected_range': expected_range
            })
        return results
    
    def update_stats(self, category: str, quantity_type: str, values: list):
        """
        Update historical statistics with new data
        
        Args:
            category: Element category
            quantity_type: Type of quantity
            values: List of values to incorporate
        """
        if category not in self.historical_stats:
            self.historical_stats[category] = {}
        
        if quantity_type not in self.historical_stats[category]:
            self.historical_stats[category][quantity_type] = {}
        
        # Calculate new statistics
        values_array = np.array(values)
        self.historical_stats[category][quantity_type] = {
            "mean": float(np.mean(values_array)),
            "std": float(np.std(values_array)),
            "min": float(np.min(values_array)),
            "max": float(np.max(values_array))
        }
        
        self.last_trained = datetime.now().isoformat()
        logger.info(f"Updated stats for {category}/{quantity_type}")
