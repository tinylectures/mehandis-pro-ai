from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import numpy as np
from dotenv import load_dotenv
import logging

# Import our AI/ML modules
from models.anomaly_detector import AnomalyDetector
from models.cost_predictor import CostPredictor
from models.progress_analyzer import ProgressAnalyzer

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ConstructAI ML Service",
    version="1.0.0",
    description="AI/ML microservice for construction quantity validation, cost prediction, and progress analysis"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ML models
anomaly_detector = AnomalyDetector()
cost_predictor = CostPredictor()
progress_analyzer = ProgressAnalyzer()

# Pydantic models for request/response
class QuantityData(BaseModel):
    element_id: str
    category: str
    quantity_type: str
    value: float
    unit: str
    metadata: Optional[Dict[str, Any]] = None

class QuantityValidationRequest(BaseModel):
    quantities: List[QuantityData]
    threshold: float = Field(default=0.8, ge=0.0, le=1.0, description="Anomaly detection threshold")

class AnomalyResult(BaseModel):
    element_id: str
    is_anomaly: bool
    confidence: float
    expected_range: Optional[Dict[str, float]] = None
    message: str

class QuantityValidationResponse(BaseModel):
    total_quantities: int
    anomalies_detected: int
    results: List[AnomalyResult]

class ProjectParameters(BaseModel):
    project_type: str
    location: str
    total_area: float
    num_floors: int
    construction_type: str
    materials: List[str]
    historical_data: Optional[Dict[str, Any]] = None

class CostPredictionResponse(BaseModel):
    predicted_cost: float
    confidence_interval: Dict[str, float]
    cost_breakdown: Dict[str, float]
    factors: List[Dict[str, Any]]

class ProgressAnalysisResponse(BaseModel):
    completion_percentage: float
    confidence: float
    detected_elements: List[str]
    analysis_details: Dict[str, Any]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "ai-ml",
        "models": {
            "anomaly_detector": "loaded",
            "cost_predictor": "loaded",
            "progress_analyzer": "loaded"
        }
    }

@app.post("/api/validate-quantities", response_model=QuantityValidationResponse)
async def validate_quantities(request: QuantityValidationRequest):
    """
    Validate quantities using anomaly detection
    Requirements: 6.1, 6.2
    """
    try:
        logger.info(f"Validating {len(request.quantities)} quantities")
        
        results = []
        anomaly_count = 0
        
        for qty in request.quantities:
            # Detect anomalies
            is_anomaly, confidence, expected_range = anomaly_detector.detect(
                category=qty.category,
                quantity_type=qty.quantity_type,
                value=qty.value,
                metadata=qty.metadata,
                threshold=request.threshold
            )
            
            if is_anomaly:
                anomaly_count += 1
                message = f"Anomaly detected: {qty.quantity_type} value {qty.value} {qty.unit} is outside expected range"
            else:
                message = f"Quantity within normal range"
            
            results.append(AnomalyResult(
                element_id=qty.element_id,
                is_anomaly=is_anomaly,
                confidence=confidence,
                expected_range=expected_range,
                message=message
            ))
        
        return QuantityValidationResponse(
            total_quantities=len(request.quantities),
            anomalies_detected=anomaly_count,
            results=results
        )
    
    except Exception as e:
        logger.error(f"Error validating quantities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")

@app.post("/api/predict-cost", response_model=CostPredictionResponse)
async def predict_cost(params: ProjectParameters):
    """
    Predict project cost using ML model
    Requirements: 6.3, 6.4
    """
    try:
        logger.info(f"Predicting cost for {params.project_type} project")
        
        # Make prediction
        prediction = cost_predictor.predict(
            project_type=params.project_type,
            location=params.location,
            total_area=params.total_area,
            num_floors=params.num_floors,
            construction_type=params.construction_type,
            materials=params.materials,
            historical_data=params.historical_data
        )
        
        return CostPredictionResponse(
            predicted_cost=prediction['cost'],
            confidence_interval=prediction['confidence_interval'],
            cost_breakdown=prediction['breakdown'],
            factors=prediction['factors']
        )
    
    except Exception as e:
        logger.error(f"Error predicting cost: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/api/analyze-progress", response_model=ProgressAnalysisResponse)
async def analyze_progress(
    image: UploadFile = File(...),
    project_id: str = None
):
    """
    Analyze construction progress from site photos
    Requirements: 6.5
    """
    try:
        logger.info(f"Analyzing progress for project {project_id}")
        
        # Read image
        image_data = await image.read()
        
        # Analyze progress
        analysis = progress_analyzer.analyze(image_data, project_id)
        
        return ProgressAnalysisResponse(
            completion_percentage=analysis['completion'],
            confidence=analysis['confidence'],
            detected_elements=analysis['elements'],
            analysis_details=analysis['details']
        )
    
    except Exception as e:
        logger.error(f"Error analyzing progress: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@app.get("/api/models/status")
async def get_models_status():
    """Get status of all ML models"""
    return {
        "anomaly_detector": {
            "status": "ready",
            "version": anomaly_detector.version,
            "last_trained": anomaly_detector.last_trained
        },
        "cost_predictor": {
            "status": "ready",
            "version": cost_predictor.version,
            "last_trained": cost_predictor.last_trained
        },
        "progress_analyzer": {
            "status": "ready",
            "version": progress_analyzer.version
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
