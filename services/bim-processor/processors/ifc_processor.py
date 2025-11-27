"""IFC file processor

This implementation provides IFC file processing capabilities for the BIM microservice.
IFC (Industry Foundation Classes) is an open standard for BIM data exchange.

This processor:
1. Validates IFC file format
2. Parses IFC files using IfcOpenShell
3. Extracts elements with geometry and properties
4. Converts IFC geometry to internal format
"""
import logging
import uuid
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime, timezone

try:
    import ifcopenshell
    import ifcopenshell.geom
    IFCOPENSHELL_AVAILABLE = True
except ImportError:
    IFCOPENSHELL_AVAILABLE = False
    logging.warning("ifcopenshell not available - IFC file parsing will not work")

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    logging.warning("numpy not available - geometry processing will be limited")

from models import Element, ElementCategory, Geometry, GeometryType, BoundingBox
from processors.element_classifier import get_classifier

logger = logging.getLogger(__name__)


class IFCFileError(Exception):
    """Exception raised for IFC file processing errors"""
    pass


class IFCProcessor:
    """Processor for IFC files
    
    This processor handles IFC file parsing and element extraction using IfcOpenShell.
    It extracts geometric and property data from IFC models and converts them to
    the internal Element format.
    """
    
    # IFC entity type to ElementCategory mapping
    CATEGORY_MAPPING = {
        "IfcWall": ElementCategory.WALL,
        "IfcWallStandardCase": ElementCategory.WALL,
        "IfcSlab": ElementCategory.FLOOR,
        "IfcColumn": ElementCategory.COLUMN,
        "IfcBeam": ElementCategory.BEAM,
        "IfcRoof": ElementCategory.ROOF,
        "IfcDoor": ElementCategory.DOOR,
        "IfcWindow": ElementCategory.WINDOW,
        "IfcStair": ElementCategory.STAIR,
        "IfcStairFlight": ElementCategory.STAIR,
        "IfcRailing": ElementCategory.RAILING,
        "IfcFooting": ElementCategory.FOUNDATION,
        "IfcPile": ElementCategory.FOUNDATION,
    }
    
    def __init__(self):
        self.logger = logger
        self._validate_dependencies()
        self.classifier = get_classifier()
        
        # Configure IfcOpenShell geometry settings
        if IFCOPENSHELL_AVAILABLE:
            self.settings = ifcopenshell.geom.settings()
            self.settings.set(self.settings.USE_WORLD_COORDS, True)
            self.settings.set(self.settings.WELD_VERTICES, True)
    
    def _validate_dependencies(self):
        """Validate that required dependencies are available"""
        if not IFCOPENSHELL_AVAILABLE:
            self.logger.error(
                "ifcopenshell library not available. "
                "Install with: pip install ifcopenshell"
            )
        if not NUMPY_AVAILABLE:
            self.logger.warning(
                "numpy library not available. "
                "Install with: pip install numpy"
            )
    
    def can_process(self, file_path: str) -> bool:
        """
        Check if file can be processed by this processor
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if file has .ifc extension
        """
        return file_path.lower().endswith('.ifc')
    
    def validate_file(self, file_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that the file is a valid IFC file
        
        Args:
            file_path: Path to IFC file
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not IFCOPENSHELL_AVAILABLE:
            return False, "IfcOpenShell library not available"
        
        path = Path(file_path)
        
        if not path.exists():
            return False, f"File not found: {file_path}"
        
        if not path.is_file():
            return False, f"Path is not a file: {file_path}"
        
        if path.stat().st_size == 0:
            return False, "File is empty"
        
        if not self.can_process(file_path):
            return False, "Not a valid IFC file (must have .ifc extension)"
        
        # Try to open the file with IfcOpenShell
        try:
            ifc_file = ifcopenshell.open(file_path)
            # Check if file has a valid schema
            if not ifc_file.schema:
                return False, "IFC file has no valid schema"
        except Exception as e:
            return False, f"Cannot open IFC file: {str(e)}"
        
        return True, None

    def extract_elements(self, file_path: str, model_id: str) -> List[Element]:
        """
        Extract elements from IFC file
        
        Args:
            file_path: Path to IFC file
            model_id: ID of the BIM model
            
        Returns:
            List of extracted elements
            
        Raises:
            IFCFileError: If file cannot be processed
        """
        if not IFCOPENSHELL_AVAILABLE:
            raise IFCFileError("IfcOpenShell library not available")
        
        self.logger.info(f"Processing IFC file: {file_path}")
        
        # Validate file
        is_valid, error_msg = self.validate_file(file_path)
        if not is_valid:
            raise IFCFileError(error_msg)
        
        elements = []
        
        try:
            # Open IFC file
            ifc_file = ifcopenshell.open(file_path)
            self.logger.info(f"Opened IFC file with schema: {ifc_file.schema}")
            
            # Get all building elements
            building_elements = self._get_building_elements(ifc_file)
            self.logger.info(f"Found {len(building_elements)} building elements")
            
            # Process each element
            for ifc_element in building_elements:
                try:
                    element = self._process_ifc_element(ifc_element, model_id)
                    if element:
                        elements.append(element)
                except Exception as e:
                    self.logger.warning(
                        f"Failed to process element {ifc_element.GlobalId}: {str(e)}"
                    )
                    continue
            
            self.logger.info(f"Successfully extracted {len(elements)} elements from IFC file")
            
        except Exception as e:
            error_msg = f"Error processing IFC file: {str(e)}"
            self.logger.error(error_msg)
            raise IFCFileError(error_msg)
        
        return elements
    
    def _get_building_elements(self, ifc_file) -> List:
        """
        Get all building elements from IFC file
        
        Args:
            ifc_file: Opened IFC file
            
        Returns:
            List of IFC building elements
        """
        # Get all products (physical building elements)
        elements = []
        
        # Get specific element types we're interested in
        for ifc_type in self.CATEGORY_MAPPING.keys():
            try:
                elements.extend(ifc_file.by_type(ifc_type))
            except Exception as e:
                self.logger.debug(f"No elements of type {ifc_type}: {e}")
        
        return elements
    
    def _process_ifc_element(self, ifc_element, model_id: str) -> Optional[Element]:
        """
        Process a single IFC element and convert to internal format
        
        Args:
            ifc_element: IFC element object
            model_id: ID of the BIM model
            
        Returns:
            Element object or None if processing fails
        """
        # Get element category
        category = self._classify_element(ifc_element)
        
        # Extract properties
        properties = self._extract_properties(ifc_element)
        
        # Extract geometry
        geometry = self._extract_geometry(ifc_element)
        if not geometry:
            self.logger.debug(f"No geometry for element {ifc_element.GlobalId}")
            return None
        
        # Get level/storey
        level = self._get_element_level(ifc_element)
        
        # Create element
        element = Element(
            id=str(uuid.uuid4()),
            model_id=model_id,
            external_id=ifc_element.GlobalId,
            category=category,
            family_name=ifc_element.is_a(),
            type_name=self._get_element_type_name(ifc_element),
            level=level,
            geometry=geometry,
            properties=properties,
            material_ids=self._get_material_ids(ifc_element),
            created_at=datetime.now(timezone.utc)
        )
        
        return element
    
    def _classify_element(self, ifc_element) -> ElementCategory:
        """
        Classify IFC element into standard category using the classifier
        
        Args:
            ifc_element: IFC element object
            
        Returns:
            Element category
        """
        element_type = ifc_element.is_a()
        
        # Extract properties for classification
        properties = self._extract_properties(ifc_element)
        
        # Get family/type name
        family_name = self._get_element_type_name(ifc_element)
        
        # Use the classifier for classification
        category = self.classifier.classify_ifc_element(
            ifc_type=element_type,
            properties=properties,
            family_name=family_name
        )
        
        # Log classification metadata
        metadata = self.classifier.get_classification_metadata(
            category=category,
            element_type=element_type,
            properties=properties
        )
        self.logger.debug(
            f"Classified {element_type} as {category.value} "
            f"(method: {metadata['classification_method']}, "
            f"confidence: {metadata['confidence']})"
        )
        
        return category

    def _extract_properties(self, ifc_element) -> Dict[str, Any]:
        """
        Extract properties from IFC element
        
        Args:
            ifc_element: IFC element object
            
        Returns:
            Dictionary of properties
        """
        properties = {}
        
        # Basic properties
        if hasattr(ifc_element, 'Name') and ifc_element.Name:
            properties['Name'] = ifc_element.Name
        
        if hasattr(ifc_element, 'Description') and ifc_element.Description:
            properties['Description'] = ifc_element.Description
        
        if hasattr(ifc_element, 'ObjectType') and ifc_element.ObjectType:
            properties['ObjectType'] = ifc_element.ObjectType
        
        if hasattr(ifc_element, 'Tag') and ifc_element.Tag:
            properties['Tag'] = ifc_element.Tag
        
        # Extract property sets
        try:
            if hasattr(ifc_element, 'IsDefinedBy'):
                for definition in ifc_element.IsDefinedBy:
                    if definition.is_a('IfcRelDefinesByProperties'):
                        property_set = definition.RelatingPropertyDefinition
                        if property_set.is_a('IfcPropertySet'):
                            pset_name = property_set.Name
                            pset_props = {}
                            
                            for prop in property_set.HasProperties:
                                if prop.is_a('IfcPropertySingleValue'):
                                    prop_name = prop.Name
                                    prop_value = prop.NominalValue
                                    if prop_value:
                                        pset_props[prop_name] = prop_value.wrappedValue
                            
                            if pset_props:
                                properties[pset_name] = pset_props
        except Exception as e:
            self.logger.debug(f"Error extracting property sets: {e}")
        
        # Extract quantities
        try:
            if hasattr(ifc_element, 'IsDefinedBy'):
                for definition in ifc_element.IsDefinedBy:
                    if definition.is_a('IfcRelDefinesByProperties'):
                        property_set = definition.RelatingPropertyDefinition
                        if property_set.is_a('IfcElementQuantity'):
                            qset_name = property_set.Name
                            qset_quantities = {}
                            
                            for quantity in property_set.Quantities:
                                q_name = quantity.Name
                                q_value = None
                                
                                if quantity.is_a('IfcQuantityLength'):
                                    q_value = quantity.LengthValue
                                elif quantity.is_a('IfcQuantityArea'):
                                    q_value = quantity.AreaValue
                                elif quantity.is_a('IfcQuantityVolume'):
                                    q_value = quantity.VolumeValue
                                elif quantity.is_a('IfcQuantityCount'):
                                    q_value = quantity.CountValue
                                elif quantity.is_a('IfcQuantityWeight'):
                                    q_value = quantity.WeightValue
                                
                                if q_value is not None:
                                    qset_quantities[q_name] = q_value
                            
                            if qset_quantities:
                                properties[qset_name] = qset_quantities
        except Exception as e:
            self.logger.debug(f"Error extracting quantities: {e}")
        
        return properties
    
    def _extract_geometry(self, ifc_element) -> Optional[Geometry]:
        """
        Extract geometry from IFC element
        
        Args:
            ifc_element: IFC element object
            
        Returns:
            Geometry object or None if extraction fails
        """
        try:
            # Create geometry shape
            shape = ifcopenshell.geom.create_shape(self.settings, ifc_element)
            
            # Get geometry data
            geometry_data = shape.geometry
            
            # Extract vertices
            verts = geometry_data.verts
            vertices = []
            for i in range(0, len(verts), 3):
                vertices.append([verts[i], verts[i+1], verts[i+2]])
            
            # Extract faces
            faces_data = geometry_data.faces
            faces = []
            for i in range(0, len(faces_data), 3):
                faces.append([faces_data[i], faces_data[i+1], faces_data[i+2]])
            
            # Calculate bounding box
            bounding_box = self._calculate_bounding_box(vertices)
            
            return Geometry(
                type=GeometryType.SOLID,
                bounding_box=bounding_box,
                vertices=vertices,
                faces=faces
            )
            
        except Exception as e:
            self.logger.debug(f"Could not extract geometry: {e}")
            return None
    
    def _calculate_bounding_box(self, vertices: List[List[float]]) -> BoundingBox:
        """
        Calculate bounding box from vertices
        
        Args:
            vertices: List of vertex coordinates
            
        Returns:
            BoundingBox object
        """
        if not vertices:
            return BoundingBox(
                min={"x": 0.0, "y": 0.0, "z": 0.0},
                max={"x": 0.0, "y": 0.0, "z": 0.0}
            )
        
        if NUMPY_AVAILABLE:
            verts_array = np.array(vertices)
            min_point = verts_array.min(axis=0)
            max_point = verts_array.max(axis=0)
            
            return BoundingBox(
                min={"x": float(min_point[0]), "y": float(min_point[1]), "z": float(min_point[2])},
                max={"x": float(max_point[0]), "y": float(max_point[1]), "z": float(max_point[2])}
            )
        else:
            # Manual calculation without numpy
            xs = [v[0] for v in vertices]
            ys = [v[1] for v in vertices]
            zs = [v[2] for v in vertices]
            
            return BoundingBox(
                min={"x": min(xs), "y": min(ys), "z": min(zs)},
                max={"x": max(xs), "y": max(ys), "z": max(zs)}
            )

    def _get_element_level(self, ifc_element) -> Optional[str]:
        """
        Get the building storey/level for an element
        
        Args:
            ifc_element: IFC element object
            
        Returns:
            Level name or None
        """
        try:
            if hasattr(ifc_element, 'ContainedInStructure'):
                for rel in ifc_element.ContainedInStructure:
                    if rel.is_a('IfcRelContainedInSpatialStructure'):
                        structure = rel.RelatingStructure
                        if structure.is_a('IfcBuildingStorey'):
                            return structure.Name or structure.LongName or f"Level {structure.Elevation}"
        except Exception as e:
            self.logger.debug(f"Could not determine element level: {e}")
        
        return None
    
    def _get_element_type_name(self, ifc_element) -> Optional[str]:
        """
        Get the type name for an element
        
        Args:
            ifc_element: IFC element object
            
        Returns:
            Type name or None
        """
        try:
            if hasattr(ifc_element, 'IsTypedBy'):
                for rel in ifc_element.IsTypedBy:
                    if rel.is_a('IfcRelDefinesByType'):
                        element_type = rel.RelatingType
                        return element_type.Name
        except Exception as e:
            self.logger.debug(f"Could not determine element type: {e}")
        
        return None
    
    def _get_material_ids(self, ifc_element) -> List[str]:
        """
        Get material IDs for an element
        
        Args:
            ifc_element: IFC element object
            
        Returns:
            List of material IDs
        """
        material_ids = []
        
        try:
            if hasattr(ifc_element, 'HasAssociations'):
                for association in ifc_element.HasAssociations:
                    if association.is_a('IfcRelAssociatesMaterial'):
                        material = association.RelatingMaterial
                        
                        if material.is_a('IfcMaterial'):
                            material_ids.append(str(material.id()))
                        elif material.is_a('IfcMaterialLayerSetUsage'):
                            layer_set = material.ForLayerSet
                            for layer in layer_set.MaterialLayers:
                                if layer.Material:
                                    material_ids.append(str(layer.Material.id()))
                        elif material.is_a('IfcMaterialList'):
                            for mat in material.Materials:
                                material_ids.append(str(mat.id()))
        except Exception as e:
            self.logger.debug(f"Could not extract materials: {e}")
        
        return material_ids
    
    def get_project_info(self, file_path: str) -> Dict[str, Any]:
        """
        Extract project information from IFC file
        
        Args:
            file_path: Path to IFC file
            
        Returns:
            Dictionary of project information
        """
        if not IFCOPENSHELL_AVAILABLE:
            return {}
        
        try:
            ifc_file = ifcopenshell.open(file_path)
            
            project_info = {
                "schema": ifc_file.schema,
                "file_name": Path(file_path).name,
                "file_size": Path(file_path).stat().st_size,
            }
            
            # Get project
            projects = ifc_file.by_type('IfcProject')
            if projects:
                project = projects[0]
                project_info['project_name'] = project.Name or ""
                project_info['project_description'] = project.Description or ""
                project_info['project_long_name'] = project.LongName or ""
            
            # Get application info
            applications = ifc_file.by_type('IfcApplication')
            if applications:
                app = applications[0]
                project_info['application'] = app.ApplicationFullName or ""
                project_info['version'] = app.Version or ""
            
            # Get person and organization
            persons = ifc_file.by_type('IfcPerson')
            if persons:
                person = persons[0]
                project_info['author'] = f"{person.GivenName or ''} {person.FamilyName or ''}".strip()
            
            organizations = ifc_file.by_type('IfcOrganization')
            if organizations:
                org = organizations[0]
                project_info['organization'] = org.Name or ""
            
            return project_info
            
        except Exception as e:
            self.logger.error(f"Error extracting project info: {e}")
            return {}
    
    def get_software_version(self, file_path: str) -> str:
        """
        Get software version from IFC file
        
        Args:
            file_path: Path to IFC file
            
        Returns:
            Software version string
        """
        project_info = self.get_project_info(file_path)
        
        application = project_info.get('application', '')
        version = project_info.get('version', '')
        schema = project_info.get('schema', '')
        
        if application and version:
            return f"{application} {version} (IFC {schema})"
        elif schema:
            return f"IFC {schema}"
        else:
            return "IFC (version unknown)"
