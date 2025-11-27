"""Data models for BIM Processing Service"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from enum import Enum
from datetime import datetime


class FileType(str, Enum):
    """Supported BIM file types"""
    REVIT = "revit"
    IFC = "ifc"


class ProcessingStatus(str, Enum):
    """BIM model processing status"""
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class ElementCategory(str, Enum):
    """BIM element categories"""
    WALL = "wall"
    FLOOR = "floor"
    COLUMN = "column"
    BEAM = "beam"
    ROOF = "roof"
    DOOR = "door"
    WINDOW = "window"
    STAIR = "stair"
    RAILING = "railing"
    FOUNDATION = "foundation"
    SLAB = "slab"
    OTHER = "other"


class GeometryType(str, Enum):
    """Geometry representation types"""
    SOLID = "solid"
    SURFACE = "surface"
    CURVE = "curve"


class BoundingBox(BaseModel):
    """3D bounding box"""
    min: Dict[str, float] = Field(..., description="Minimum point {x, y, z}")
    max: Dict[str, float] = Field(..., description="Maximum point {x, y, z}")


class Geometry(BaseModel):
    """Element geometry data"""
    type: GeometryType
    bounding_box: BoundingBox
    vertices: Optional[List[List[float]]] = None
    faces: Optional[List[List[int]]] = None


class Element(BaseModel):
    """BIM element"""
    id: str
    model_id: str
    external_id: str = Field(..., description="ID from BIM software")
    category: ElementCategory
    family_name: Optional[str] = None
    type_name: Optional[str] = None
    level: Optional[str] = None
    geometry: Geometry
    properties: Dict[str, Any] = Field(default_factory=dict)
    material_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BIMModelMetadata(BaseModel):
    """BIM model metadata"""
    software_version: Optional[str] = None
    project_info: Dict[str, Any] = Field(default_factory=dict)
    element_count: Optional[int] = None


class BIMModel(BaseModel):
    """BIM model representation"""
    id: str
    project_id: str
    file_name: str
    file_size: int
    file_type: FileType
    storage_url: str
    status: ProcessingStatus
    processing_progress: int = Field(default=0, ge=0, le=100)
    error_message: Optional[str] = None
    metadata: BIMModelMetadata = Field(default_factory=BIMModelMetadata)
    uploaded_by: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None


class ProcessingResult(BaseModel):
    """Result of BIM model processing"""
    model_id: str
    status: ProcessingStatus
    elements_processed: int
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    processing_time_seconds: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UploadResponse(BaseModel):
    """Response for file upload"""
    model_id: str
    file_name: str
    file_size: int
    file_type: FileType
    status: ProcessingStatus
    message: str


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: Dict[str, Any] = Field(
        ...,
        description="Error details including code, message, timestamp, etc."
    )
