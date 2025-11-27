from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import logging
from config import settings
from models import ErrorResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.service_name,
    version=settings.version,
    description="Microservice for processing BIM models (Revit and IFC files)",
    responses={
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        403: {"model": ErrorResponse, "description": "Forbidden"},
        404: {"model": ErrorResponse, "description": "Not Found"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


# Authentication dependency
async def verify_token(authorization: Optional[str] = Header(None)) -> str:
    """
    Verify JWT token from Authorization header.
    In production, this should validate the JWT token with the API Gateway.
    
    Args:
        authorization: Authorization header value
        
    Returns:
        Validated token string
        
    Raises:
        HTTPException: If token is missing or invalid
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = authorization.replace("Bearer ", "")
    
    # TODO: Validate JWT token with API Gateway or shared secret
    # For now, just check that token exists and is not empty
    if not token or len(token) < 10:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return token


@app.get("/health")
async def health_check():
    """
    Health check endpoint - no authentication required.
    Used by load balancers and monitoring systems.
    """
    return {
        "status": "ok",
        "service": "bim-processor",
        "version": settings.version
    }


@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": settings.service_name,
        "version": settings.version,
        "description": "Processes Revit and IFC BIM models with element classification",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "openapi": "/openapi.json",
            "upload_model": "/api/v1/upload",
            "process_model": "/api/v1/process/{model_id}",
            "get_status": "/api/v1/status/{model_id}",
            "process_revit": "/api/v1/process/revit",
            "process_ifc": "/api/v1/process/ifc",
            "classify_element": "/api/v1/classify/element",
            "get_categories": "/api/v1/classify/categories",
        }
    }


@app.post("/api/v1/process/revit", response_model=dict)
async def process_revit_file(
    file_path: str,
    model_id: str,
    token: str = Depends(verify_token)
):
    """
    Process a Revit file and extract elements
    
    Args:
        file_path: Path to the Revit file
        model_id: ID of the BIM model
        token: JWT authentication token
        
    Returns:
        Processing result with extracted elements
        
    Raises:
        HTTPException: If file processing fails
    """
    from processors.revit_processor import RevitProcessor, RevitFileError
    import time
    
    logger.info(f"Processing Revit file: {file_path} for model: {model_id}")
    
    processor = RevitProcessor()
    
    try:
        # Validate file
        is_valid, error_msg = processor.validate_file(file_path)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Revit file: {error_msg}"
            )
        
        # Extract elements
        start_time = time.time()
        elements = processor.extract_elements(file_path, model_id)
        processing_time = time.time() - start_time
        
        # Get project info
        project_info = processor.get_project_info(file_path)
        software_version = processor.get_software_version(file_path)
        
        logger.info(
            f"Successfully processed Revit file. "
            f"Extracted {len(elements)} elements in {processing_time:.2f}s"
        )
        
        return {
            "status": "success",
            "model_id": model_id,
            "elements_count": len(elements),
            "processing_time_seconds": processing_time,
            "software_version": software_version,
            "project_info": project_info,
            "elements": [
                {
                    "id": elem.id,
                    "external_id": elem.external_id,
                    "category": elem.category.value,
                    "family_name": elem.family_name,
                    "type_name": elem.type_name,
                    "level": elem.level,
                    "properties": elem.properties,
                }
                for elem in elements
            ]
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except RevitFileError as e:
        logger.error(f"Revit processing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error processing Revit file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/api/v1/process/ifc", response_model=dict)
async def process_ifc_file(
    file_path: str,
    model_id: str,
    token: str = Depends(verify_token)
):
    """
    Process an IFC file and extract elements
    
    Args:
        file_path: Path to the IFC file
        model_id: ID of the BIM model
        token: JWT authentication token
        
    Returns:
        Processing result with extracted elements
        
    Raises:
        HTTPException: If file processing fails
    """
    from processors.ifc_processor import IFCProcessor, IFCFileError
    import time
    
    logger.info(f"Processing IFC file: {file_path} for model: {model_id}")
    
    processor = IFCProcessor()
    
    try:
        # Validate file
        is_valid, error_msg = processor.validate_file(file_path)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid IFC file: {error_msg}"
            )
        
        # Extract elements
        start_time = time.time()
        elements = processor.extract_elements(file_path, model_id)
        processing_time = time.time() - start_time
        
        # Get project info
        project_info = processor.get_project_info(file_path)
        software_version = processor.get_software_version(file_path)
        
        logger.info(
            f"Successfully processed IFC file. "
            f"Extracted {len(elements)} elements in {processing_time:.2f}s"
        )
        
        return {
            "status": "success",
            "model_id": model_id,
            "elements_count": len(elements),
            "processing_time_seconds": processing_time,
            "software_version": software_version,
            "project_info": project_info,
            "elements": [
                {
                    "id": elem.id,
                    "external_id": elem.external_id,
                    "category": elem.category.value,
                    "family_name": elem.family_name,
                    "type_name": elem.type_name,
                    "level": elem.level,
                    "properties": elem.properties,
                }
                for elem in elements
            ]
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except IFCFileError as e:
        logger.error(f"IFC processing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error processing IFC file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


from pydantic import BaseModel


class ClassificationRequest(BaseModel):
    """Request model for element classification"""
    element_type: str
    file_type: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    family_name: Optional[str] = None


@app.post("/api/v1/classify/element", response_model=dict)
async def classify_element(
    request: ClassificationRequest,
    token: str = Depends(verify_token)
):
    """
    Classify a BIM element into a standard category
    
    This endpoint provides element classification as a standalone service,
    allowing classification of elements without full file processing.
    
    Args:
        request: Classification request with element details
        token: JWT authentication token
        
    Returns:
        Classification result with category and metadata
        
    Raises:
        HTTPException: If classification fails
    """
    from processors.element_classifier import get_classifier
    
    logger.info(f"Classifying element: type={request.element_type}, file_type={request.file_type}")
    
    try:
        classifier = get_classifier()
        
        # Classify based on file type
        if request.file_type.lower() == 'ifc':
            category = classifier.classify_ifc_element(
                ifc_type=request.element_type,
                properties=request.properties,
                family_name=request.family_name
            )
        elif request.file_type.lower() == 'revit':
            category = classifier.classify_revit_element(
                category_id=request.category_id,
                category_name=request.category_name,
                properties=request.properties,
                family_name=request.family_name
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {request.file_type}. Must be 'ifc' or 'revit'"
            )
        
        # Get classification metadata
        # For Revit elements with category_id, use that for metadata
        element_type_for_metadata = (
            str(request.category_id) if request.file_type.lower() == 'revit' and request.category_id is not None
            else request.element_type
        )
        
        metadata = classifier.get_classification_metadata(
            category=category,
            element_type=element_type_for_metadata,
            properties=request.properties
        )
        
        # Get confidence score
        confidence = classifier.get_classification_confidence(
            element_type=element_type_for_metadata,
            category=category,
            properties=request.properties
        )
        
        logger.info(
            f"Classified {request.element_type} as {category.value} "
            f"(confidence: {confidence})"
        )
        
        return {
            "status": "success",
            "element_type": request.element_type,
            "file_type": request.file_type,
            "category": category.value,
            "confidence": confidence,
            "classification_method": metadata["classification_method"],
            "metadata": metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error classifying element: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification error: {str(e)}"
        )


@app.get("/api/v1/classify/categories", response_model=dict)
async def get_supported_categories(token: str = Depends(verify_token)):
    """
    Get list of all supported element categories
    
    Args:
        token: JWT authentication token
        
    Returns:
        List of supported categories with descriptions
    """
    from processors.element_classifier import get_classifier
    from models import ElementCategory
    
    classifier = get_classifier()
    categories = classifier.get_supported_categories()
    
    # Create category descriptions
    category_info = {
        ElementCategory.WALL: "Vertical building elements including walls, partitions, and curtain walls",
        ElementCategory.FLOOR: "Horizontal building elements including floors, slabs, and decks",
        ElementCategory.COLUMN: "Vertical structural support elements",
        ElementCategory.BEAM: "Horizontal structural support elements including beams, girders, and joists",
        ElementCategory.ROOF: "Roof elements and roofing systems",
        ElementCategory.DOOR: "Door elements and openings",
        ElementCategory.WINDOW: "Window elements and glazing",
        ElementCategory.STAIR: "Stair elements including flights and landings",
        ElementCategory.RAILING: "Railing, handrail, and guardrail elements",
        ElementCategory.FOUNDATION: "Foundation elements including footings, piles, and piers",
        ElementCategory.SLAB: "Slab elements",
        ElementCategory.OTHER: "Other or unclassified elements"
    }
    
    return {
        "status": "success",
        "categories": [
            {
                "value": cat.value,
                "name": cat.name,
                "description": category_info.get(cat, "")
            }
            for cat in categories
        ]
    }


# In-memory storage for processing status (in production, use Redis or database)
processing_status_store: Dict[str, Dict[str, Any]] = {}


@app.post("/api/v1/upload", response_model=dict)
async def upload_bim_model(
    project_id: str,
    file_path: str,
    file_type: str,
    token: str = Depends(verify_token)
):
    """
    Upload and queue a BIM model for processing
    
    This endpoint initiates the BIM model processing workflow:
    1. Validates the file
    2. Creates a processing job
    3. Returns immediately with job ID
    4. Processing happens asynchronously
    
    Args:
        project_id: ID of the project this model belongs to
        file_path: Path to the uploaded BIM file
        file_type: Type of file ('revit' or 'ifc')
        token: JWT authentication token
        
    Returns:
        Upload response with model ID and initial status
        
    Raises:
        HTTPException: If upload fails
    """
    import uuid
    from pathlib import Path
    from models import ProcessingStatus, FileType
    
    logger.info(f"Upload request: project={project_id}, file={file_path}, type={file_type}")
    
    try:
        # Validate file type
        if file_type.lower() not in ['revit', 'ifc']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file_type}. Must be 'revit' or 'ifc'"
            )
        
        # Validate file exists
        path = Path(file_path)
        if not path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: {file_path}"
            )
        
        # Generate model ID
        model_id = str(uuid.uuid4())
        
        # Create processing job
        processing_status_store[model_id] = {
            "model_id": model_id,
            "project_id": project_id,
            "file_name": path.name,
            "file_size": path.stat().st_size,
            "file_type": file_type.lower(),
            "file_path": file_path,
            "status": ProcessingStatus.PROCESSING.value,
            "progress": 0,
            "error_message": None,
            "elements_processed": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Created processing job for model: {model_id}")
        
        # In production, this would queue the job to a message queue (e.g., Celery, RabbitMQ)
        # For now, we'll process synchronously but return the status
        
        return {
            "status": "success",
            "model_id": model_id,
            "file_name": path.name,
            "file_size": path.stat().st_size,
            "file_type": file_type.lower(),
            "processing_status": ProcessingStatus.PROCESSING.value,
            "message": "File uploaded successfully. Processing started."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload error: {str(e)}"
        )


@app.post("/api/v1/process/{model_id}", response_model=dict)
async def process_bim_model(
    model_id: str,
    token: str = Depends(verify_token)
):
    """
    Process a BIM model that has been uploaded
    
    This endpoint triggers the actual processing of a BIM model.
    It can be called after upload or to retry failed processing.
    
    Args:
        model_id: ID of the model to process
        token: JWT authentication token
        
    Returns:
        Processing result
        
    Raises:
        HTTPException: If processing fails
    """
    from processors.ifc_processor import IFCProcessor, IFCFileError
    from processors.revit_processor import RevitProcessor, RevitFileError
    from models import ProcessingStatus
    import time
    
    logger.info(f"Processing model: {model_id}")
    
    try:
        # Get processing job
        if model_id not in processing_status_store:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {model_id}"
            )
        
        job = processing_status_store[model_id]
        file_path = job["file_path"]
        file_type = job["file_type"]
        
        # Update status to processing
        job["status"] = ProcessingStatus.PROCESSING.value
        job["progress"] = 10
        
        # Select processor based on file type
        if file_type == 'ifc':
            processor = IFCProcessor()
        elif file_type == 'revit':
            processor = RevitProcessor()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file_type}"
            )
        
        # Validate file
        job["progress"] = 20
        is_valid, error_msg = processor.validate_file(file_path)
        if not is_valid:
            job["status"] = ProcessingStatus.ERROR.value
            job["error_message"] = error_msg
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file: {error_msg}"
            )
        
        # Extract elements
        job["progress"] = 30
        start_time = time.time()
        elements = processor.extract_elements(file_path, model_id)
        processing_time = time.time() - start_time
        
        # Update progress
        job["progress"] = 80
        job["elements_processed"] = len(elements)
        
        # Get metadata
        job["progress"] = 90
        project_info = processor.get_project_info(file_path)
        software_version = processor.get_software_version(file_path)
        
        # Mark as complete
        job["status"] = ProcessingStatus.READY.value
        job["progress"] = 100
        job["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        logger.info(
            f"Successfully processed model {model_id}. "
            f"Extracted {len(elements)} elements in {processing_time:.2f}s"
        )
        
        return {
            "status": "success",
            "model_id": model_id,
            "processing_status": ProcessingStatus.READY.value,
            "elements_count": len(elements),
            "processing_time_seconds": processing_time,
            "software_version": software_version,
            "project_info": project_info,
            "elements": [
                {
                    "id": elem.id,
                    "external_id": elem.external_id,
                    "category": elem.category.value,
                    "family_name": elem.family_name,
                    "type_name": elem.type_name,
                    "level": elem.level,
                    "properties": elem.properties,
                }
                for elem in elements
            ]
        }
        
    except HTTPException:
        raise
    except (IFCFileError, RevitFileError) as e:
        logger.error(f"Processing error for model {model_id}: {str(e)}")
        if model_id in processing_status_store:
            processing_status_store[model_id]["status"] = ProcessingStatus.ERROR.value
            processing_status_store[model_id]["error_message"] = str(e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error processing model {model_id}: {str(e)}")
        if model_id in processing_status_store:
            processing_status_store[model_id]["status"] = ProcessingStatus.ERROR.value
            processing_status_store[model_id]["error_message"] = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing error: {str(e)}"
        )


@app.get("/api/v1/status/{model_id}", response_model=dict)
async def get_processing_status(
    model_id: str,
    token: str = Depends(verify_token)
):
    """
    Get the processing status of a BIM model
    
    Args:
        model_id: ID of the model
        token: JWT authentication token
        
    Returns:
        Processing status information
        
    Raises:
        HTTPException: If model not found
    """
    logger.info(f"Status request for model: {model_id}")
    
    if model_id not in processing_status_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model not found: {model_id}"
        )
    
    job = processing_status_store[model_id]
    
    return {
        "status": "success",
        "model_id": model_id,
        "processing_status": job["status"],
        "progress": job["progress"],
        "elements_processed": job.get("elements_processed", 0),
        "error_message": job.get("error_message"),
        "created_at": job.get("created_at"),
        "completed_at": job.get("completed_at")
    }


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting {settings.service_name} on port {settings.port}")
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
