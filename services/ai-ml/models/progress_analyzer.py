"""
Progress Analysis Model
Uses computer vision to analyze construction progress from site photos
"""
import cv2
import numpy as np
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
import io
from PIL import Image

logger = logging.getLogger(__name__)

class ProgressAnalyzer:
    """
    Analyzes construction progress from images using computer vision
    Requirements: 6.5
    """
    
    def __init__(self):
        self.version = "1.0.0"
        
        # Element detection thresholds
        self.detection_thresholds = {
            "concrete": 0.7,
            "steel": 0.6,
            "framing": 0.65,
            "walls": 0.7,
            "roofing": 0.75
        }
        
        logger.info("Progress analyzer initialized")
    
    def analyze(
        self,
        image_data: bytes,
        project_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze construction progress from an image
        
        Args:
            image_data: Image bytes
            project_id: Optional project identifier
        
        Returns:
            Dictionary with completion percentage, confidence, detected elements, and details
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Failed to decode image")
            
            # Analyze image
            analysis_results = self._analyze_image(image)
            
            # Calculate overall completion
            completion = self._calculate_completion(analysis_results)
            
            # Detect construction elements
            detected_elements = self._detect_elements(image, analysis_results)
            
            # Calculate confidence
            confidence = self._calculate_confidence(analysis_results)
            
            logger.info(f"Progress analysis complete: {completion:.1f}% completion")
            
            return {
                "completion": round(completion, 2),
                "confidence": round(confidence, 2),
                "elements": detected_elements,
                "details": {
                    "image_size": {
                        "width": image.shape[1],
                        "height": image.shape[0]
                    },
                    "analysis_timestamp": datetime.now().isoformat(),
                    "project_id": project_id,
                    "metrics": analysis_results
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing progress: {str(e)}")
            raise
    
    def _analyze_image(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Perform image analysis to extract construction metrics
        
        Args:
            image: OpenCV image array
        
        Returns:
            Dictionary of analysis metrics
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Calculate image statistics
        brightness = np.mean(gray)
        contrast = np.std(gray)
        
        # Detect edges (indicates structural elements)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        
        # Color analysis (different construction phases have different color profiles)
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Detect concrete (gray tones)
        gray_mask = cv2.inRange(hsv, np.array([0, 0, 50]), np.array([180, 50, 200]))
        concrete_ratio = np.sum(gray_mask > 0) / gray_mask.size
        
        # Detect steel/metal (darker, bluish tones)
        steel_mask = cv2.inRange(hsv, np.array([90, 50, 50]), np.array([130, 255, 200]))
        steel_ratio = np.sum(steel_mask > 0) / steel_mask.size
        
        # Detect wood/framing (brown/orange tones)
        wood_mask = cv2.inRange(hsv, np.array([10, 50, 50]), np.array([30, 255, 200]))
        wood_ratio = np.sum(wood_mask > 0) / wood_mask.size
        
        return {
            "brightness": float(brightness),
            "contrast": float(contrast),
            "edge_density": float(edge_density),
            "concrete_ratio": float(concrete_ratio),
            "steel_ratio": float(steel_ratio),
            "wood_ratio": float(wood_ratio)
        }
    
    def _calculate_completion(self, metrics: Dict[str, Any]) -> float:
        """
        Calculate overall completion percentage based on metrics
        
        Args:
            metrics: Analysis metrics
        
        Returns:
            Completion percentage (0-100)
        """
        # Weighted calculation based on different indicators
        # Higher edge density = more structure = higher completion
        edge_score = min(metrics["edge_density"] * 100, 40)
        
        # Concrete presence indicates foundation/structure
        concrete_score = metrics["concrete_ratio"] * 30
        
        # Steel presence indicates structural work
        steel_score = metrics["steel_ratio"] * 20
        
        # Wood/framing indicates interior work
        wood_score = metrics["wood_ratio"] * 10
        
        total_score = edge_score + concrete_score + steel_score + wood_score
        
        # Normalize to 0-100 range
        completion = min(total_score, 100.0)
        
        return completion
    
    def _detect_elements(
        self,
        image: np.ndarray,
        metrics: Dict[str, Any]
    ) -> List[str]:
        """
        Detect which construction elements are present
        
        Args:
            image: OpenCV image array
            metrics: Analysis metrics
        
        Returns:
            List of detected element names
        """
        detected = []
        
        if metrics["concrete_ratio"] > 0.1:
            detected.append("concrete_foundation")
        
        if metrics["steel_ratio"] > 0.05:
            detected.append("steel_structure")
        
        if metrics["wood_ratio"] > 0.05:
            detected.append("wood_framing")
        
        if metrics["edge_density"] > 0.3:
            detected.append("structural_elements")
        
        # Check for walls (vertical edges)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        
        # Detect vertical lines (walls)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=100, maxLineGap=10)
        if lines is not None and len(lines) > 10:
            detected.append("walls")
        
        return detected
    
    def _calculate_confidence(self, metrics: Dict[str, Any]) -> float:
        """
        Calculate confidence in the analysis
        
        Args:
            metrics: Analysis metrics
        
        Returns:
            Confidence score (0-1)
        """
        # Higher contrast and brightness = better image quality = higher confidence
        brightness_score = min(metrics["brightness"] / 255.0, 1.0)
        contrast_score = min(metrics["contrast"] / 100.0, 1.0)
        
        # Average the scores
        confidence = (brightness_score + contrast_score) / 2.0
        
        # Ensure minimum confidence
        confidence = max(confidence, 0.5)
        
        return confidence
    
    def batch_analyze(
        self,
        images: List[bytes],
        project_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Analyze multiple images in batch
        
        Args:
            images: List of image bytes
            project_id: Optional project identifier
        
        Returns:
            List of analysis results
        """
        results = []
        for image_data in images:
            try:
                result = self.analyze(image_data, project_id)
                results.append(result)
            except Exception as e:
                logger.error(f"Error analyzing image: {str(e)}")
                results.append({
                    "error": str(e),
                    "completion": 0.0,
                    "confidence": 0.0
                })
        return results
