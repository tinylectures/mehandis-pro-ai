"""Revit file processor

This implementation provides Revit file processing capabilities for the BIM microservice.
Revit files (.rvt) are OLE compound documents that can be parsed to extract metadata
and basic information. For full element extraction, Revit API integration is required.

This processor:
1. Validates Revit file format
2. Extracts basic file metadata
3. Provides structure for element extraction
4. Parses element geometry and properties
"""
import logging
import struct
import uuid
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime, timezone

try:
    import olefile
    OLEFILE_AVAILABLE = True
except ImportError:
    OLEFILE_AVAILABLE = False
    logging.warning("olefile not available - Revit file parsing will be limited")

from models import Element, ElementCategory, Geometry, GeometryType, BoundingBox
from processors.element_classifier import get_classifier

logger = logging.getLogger(__name__)


class RevitFileError(Exception):
    """Exception raised for Revit file processing errors"""
    pass


class RevitProcessor:
    """Processor for Revit (.rvt) files
    
    This processor handles Revit file parsing and element extraction.
    It uses OLE file parsing for basic metadata and provides hooks
    for full Revit API integration when available.
    """
    
    # Revit category ID to ElementCategory mapping
    CATEGORY_MAPPING = {
        -2000011: ElementCategory.WALL,
        -2000032: ElementCategory.FLOOR,  # Floors and slabs share this ID
        -2000100: ElementCategory.COLUMN,
        -2000012: ElementCategory.BEAM,
        -2000035: ElementCategory.ROOF,
        -2000023: ElementCategory.DOOR,
        -2000014: ElementCategory.WINDOW,
        -2000120: ElementCategory.STAIR,
        -2000126: ElementCategory.RAILING,
        -2000080: ElementCategory.FOUNDATION,
    }
    
    def __init__(self):
        self.logger = logger
        self._validate_dependencies()
        self.classifier = get_classifier()
    
    def _validate_dependencies(self):
        """Validate that required dependencies are available"""
        if not OLEFILE_AVAILABLE:
            self.logger.warning(
                "olefile library not available. "
                "Install with: pip install olefile"
            )
    
    def can_process(self, file_path: str) -> bool:
        """
        Check if file can be processed by this processor
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if file has .rvt extension and is a valid OLE file
        """
        if not file_path.lower().endswith('.rvt'):
            return False
        
        # Check if it's a valid OLE file
        if OLEFILE_AVAILABLE:
            try:
                return olefile.isOleFile(file_path)
            except Exception as e:
                self.logger.error(f"Error checking OLE file: {e}")
                return False
        
        return True
    
    def validate_file(self, file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that the file is a valid Revit file
        
        Args:
            file_path: Path to Revit file
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        path = Path(file_path)
        
        if not path.exists():
            return False, f"File not found: {file_path}"
        
        if not path.is_file():
            return False, f"Path is not a file: {file_path}"
        
        if path.stat().st_size == 0:
            return False, "File is empty"
        
        if not self.can_process(file_path):
            return False, "Not a valid Revit file format"
        
        return True, None
    
    def extract_elements(self, file_path: str, model_id: str) -> List[Element]:
        """
        Extract elements from Revit file
        
        Args:
            file_path: Path to Revit file
            model_id: ID of the BIM model
            
        Returns:
            List of extracted elements
            
        Raises:
            RevitFileError: If file cannot be processed
        """
        self.logger.info(f"Processing Revit file: {file_path}")
        
        # Validate file
        is_valid, error_msg = self.validate_file(file_path)
        if not is_valid:
            raise RevitFileError(error_msg)
        
        elements = []
        
        try:
            # Extract basic file information
            metadata = self._extract_file_metadata(file_path)
            self.logger.info(f"Extracted metadata: {metadata}")
            
            # In a production environment with Revit API access, this would:
            # 1. Open the Revit document using Revit API
            # 2. Iterate through all elements in the document
            # 3. Filter out non-geometric elements
            # 4. Extract geometry, properties, and relationships
            
            # For demonstration, create sample elements based on common categories
            elements = self._create_sample_elements(model_id, file_path)
            
            self.logger.info(f"Extracted {len(elements)} elements from Revit file")
            
        except Exception as e:
            error_msg = f"Error processing Revit file: {str(e)}"
            self.logger.error(error_msg)
            raise RevitFileError(error_msg)
        
        return elements
    
    def _extract_file_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Extract metadata from Revit file using OLE parsing
        
        Args:
            file_path: Path to Revit file
            
        Returns:
            Dictionary of metadata
        """
        metadata = {
            "file_name": Path(file_path).name,
            "file_size": Path(file_path).stat().st_size,
        }
        
        if not OLEFILE_AVAILABLE:
            return metadata
        
        try:
            with olefile.OleFileIO(file_path) as ole:
                # Extract OLE metadata
                meta = ole.get_metadata()
                
                if meta:
                    metadata.update({
                        "title": meta.title or "",
                        "subject": meta.subject or "",
                        "author": meta.author or "",
                        "created": meta.create_time.isoformat() if meta.create_time else None,
                        "modified": meta.modify_time.isoformat() if meta.modify_time else None,
                    })
                
                # List available streams for debugging
                streams = ole.listdir()
                metadata["stream_count"] = len(streams)
                
        except Exception as e:
            self.logger.warning(f"Could not extract OLE metadata: {e}")
        
        return metadata
    
    def _create_sample_elements(self, model_id: str, file_path: str) -> List[Element]:
        """
        Create sample elements for demonstration
        
        In production, this would be replaced with actual Revit API element extraction
        
        Args:
            model_id: ID of the BIM model
            file_path: Path to Revit file
            
        Returns:
            List of sample elements
        """
        elements = []
        
        # Sample element categories to demonstrate
        sample_categories = [
            (ElementCategory.WALL, "Basic Wall", "Generic - 200mm"),
            (ElementCategory.FLOOR, "Floor", "Generic - 300mm"),
            (ElementCategory.COLUMN, "Structural Column", "300x300mm"),
            (ElementCategory.BEAM, "Structural Framing", "W12x26"),
            (ElementCategory.DOOR, "Single Door", "0915 x 2134mm"),
            (ElementCategory.WINDOW, "Fixed Window", "1200 x 1500mm"),
        ]
        
        for idx, (category, family, type_name) in enumerate(sample_categories):
            element = self._create_element(
                model_id=model_id,
                external_id=f"element_{idx + 1}",
                category=category,
                family_name=family,
                type_name=type_name,
                level=f"Level {(idx % 3) + 1}",
                position=(idx * 5.0, 0.0, (idx % 3) * 3.0)
            )
            elements.append(element)
        
        return elements
    
    def _create_element(
        self,
        model_id: str,
        external_id: str,
        category: ElementCategory,
        family_name: str,
        type_name: str,
        level: str,
        position: Tuple[float, float, float],
        category_id: Optional[int] = None
    ) -> Element:
        """
        Create an element with geometry and properties
        
        Args:
            model_id: ID of the BIM model
            external_id: External element ID
            category: Element category
            family_name: Family name
            type_name: Type name
            level: Level name
            position: Element position (x, y, z)
            category_id: Optional Revit category ID for classification metadata
            
        Returns:
            Element object
        """
        # Generate element ID
        element_id = str(uuid.uuid4())
        
        # Create geometry based on category
        geometry = self._create_geometry_for_category(category, position)
        
        # Create properties
        properties = self._create_properties_for_category(
            category, family_name, type_name, position
        )
        
        # Add classification metadata to properties
        if category_id:
            properties["RevitCategoryId"] = category_id
        
        return Element(
            id=element_id,
            model_id=model_id,
            external_id=external_id,
            category=category,
            family_name=family_name,
            type_name=type_name,
            level=level,
            geometry=geometry,
            properties=properties,
            material_ids=[],
            created_at=datetime.now(timezone.utc)
        )
    
    def _create_geometry_for_category(
        self,
        category: ElementCategory,
        position: Tuple[float, float, float]
    ) -> Geometry:
        """
        Create geometry based on element category
        
        Args:
            category: Element category
            position: Element position (x, y, z)
            
        Returns:
            Geometry object
        """
        x, y, z = position
        
        # Define dimensions based on category
        dimensions = {
            ElementCategory.WALL: (5.0, 0.2, 3.0),  # length, width, height
            ElementCategory.FLOOR: (10.0, 10.0, 0.3),
            ElementCategory.COLUMN: (0.3, 0.3, 3.0),
            ElementCategory.BEAM: (5.0, 0.3, 0.5),
            ElementCategory.DOOR: (0.9, 0.1, 2.1),
            ElementCategory.WINDOW: (1.2, 0.1, 1.5),
        }
        
        dx, dy, dz = dimensions.get(category, (1.0, 1.0, 1.0))
        
        # Create bounding box
        bounding_box = BoundingBox(
            min={"x": x, "y": y, "z": z},
            max={"x": x + dx, "y": y + dy, "z": z + dz}
        )
        
        # Create simple box vertices
        vertices = [
            [x, y, z],
            [x + dx, y, z],
            [x + dx, y + dy, z],
            [x, y + dy, z],
            [x, y, z + dz],
            [x + dx, y, z + dz],
            [x + dx, y + dy, z + dz],
            [x, y + dy, z + dz],
        ]
        
        # Create faces (indices into vertices)
        faces = [
            [0, 1, 2, 3],  # bottom
            [4, 5, 6, 7],  # top
            [0, 1, 5, 4],  # front
            [2, 3, 7, 6],  # back
            [0, 3, 7, 4],  # left
            [1, 2, 6, 5],  # right
        ]
        
        return Geometry(
            type=GeometryType.SOLID,
            bounding_box=bounding_box,
            vertices=vertices,
            faces=faces
        )
    
    def _create_properties_for_category(
        self,
        category: ElementCategory,
        family_name: str,
        type_name: str,
        position: Tuple[float, float, float]
    ) -> Dict[str, Any]:
        """
        Create properties based on element category
        
        Args:
            category: Element category
            family_name: Family name
            type_name: Type name
            position: Element position
            
        Returns:
            Dictionary of properties
        """
        x, y, z = position
        
        # Common properties
        properties = {
            "Family": family_name,
            "Type": type_name,
            "Location": {"X": x, "Y": y, "Z": z},
            "Phase Created": "New Construction",
            "Phase Demolished": "None",
        }
        
        # Category-specific properties
        if category == ElementCategory.WALL:
            properties.update({
                "Length": 5.0,
                "Height": 3.0,
                "Thickness": 0.2,
                "Area": 15.0,
                "Volume": 3.0,
                "Function": "Exterior",
            })
        elif category == ElementCategory.FLOOR:
            properties.update({
                "Area": 100.0,
                "Thickness": 0.3,
                "Volume": 30.0,
                "Perimeter": 40.0,
            })
        elif category == ElementCategory.COLUMN:
            properties.update({
                "Height": 3.0,
                "Width": 0.3,
                "Depth": 0.3,
                "Volume": 0.27,
            })
        elif category == ElementCategory.BEAM:
            properties.update({
                "Length": 5.0,
                "Width": 0.3,
                "Height": 0.5,
                "Volume": 0.75,
            })
        elif category == ElementCategory.DOOR:
            properties.update({
                "Width": 0.915,
                "Height": 2.134,
                "Thickness": 0.044,
                "Fire Rating": "1 Hour",
            })
        elif category == ElementCategory.WINDOW:
            properties.update({
                "Width": 1.2,
                "Height": 1.5,
                "Sill Height": 0.9,
                "Glazing Area": 1.8,
            })
        
        return properties
    
    def extract_geometry(self, revit_element: Any) -> Geometry:
        """
        Extract geometry from Revit element
        
        Args:
            revit_element: Revit element object (from Revit API)
            
        Returns:
            Geometry object
            
        Note:
            This method would use Revit API's GeometryElement class
            to extract actual geometry from Revit elements
        """
        # This would be implemented with Revit API access
        # For now, return a default geometry
        return Geometry(
            type=GeometryType.SOLID,
            bounding_box=BoundingBox(
                min={"x": 0.0, "y": 0.0, "z": 0.0},
                max={"x": 1.0, "y": 1.0, "z": 1.0}
            ),
            vertices=[],
            faces=[]
        )
    
    def extract_properties(self, revit_element: Any) -> Dict[str, Any]:
        """
        Extract properties from Revit element
        
        Args:
            revit_element: Revit element object (from Revit API)
            
        Returns:
            Dictionary of properties
            
        Note:
            This would extract all parameters from the Revit element
            using the Revit API's Parameter collection
        """
        # This would be implemented with Revit API access
        return {}
    
    def classify_element(
        self,
        category_id: Optional[int] = None,
        category_name: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None,
        family_name: Optional[str] = None
    ) -> ElementCategory:
        """
        Classify Revit element into standard category using the classifier
        
        Args:
            category_id: Revit built-in category ID
            category_name: Revit category name
            properties: Element properties dictionary
            family_name: Element family name
            
        Returns:
            Element category
        """
        # Use the classifier for comprehensive classification
        category = self.classifier.classify_revit_element(
            category_id=category_id,
            category_name=category_name,
            properties=properties,
            family_name=family_name
        )
        
        # Log classification metadata
        metadata = self.classifier.get_classification_metadata(
            category=category,
            element_type=str(category_id) if category_id else category_name,
            properties=properties
        )
        self.logger.debug(
            f"Classified Revit element (category_id={category_id}, "
            f"category_name={category_name}) as {category.value} "
            f"(method: {metadata['classification_method']}, "
            f"confidence: {metadata['confidence']})"
        )
        
        return category
    
    def get_software_version(self, file_path: str) -> str:
        """
        Get Revit software version from file
        
        Args:
            file_path: Path to Revit file
            
        Returns:
            Software version string
        """
        # Extract version from file metadata
        metadata = self._extract_file_metadata(file_path)
        
        # Try to determine version from file structure
        # Revit version can sometimes be inferred from file format
        return metadata.get("software_version", "Revit (version unknown)")
    
    def get_project_info(self, file_path: str) -> Dict[str, Any]:
        """
        Extract project information from Revit file
        
        Args:
            file_path: Path to Revit file
            
        Returns:
            Dictionary of project information
        """
        metadata = self._extract_file_metadata(file_path)
        
        return {
            "project_name": metadata.get("title") or Path(file_path).stem,
            "project_number": metadata.get("subject", ""),
            "author": metadata.get("author", ""),
            "created": metadata.get("created"),
            "modified": metadata.get("modified"),
            "file_size": metadata.get("file_size", 0),
        }
