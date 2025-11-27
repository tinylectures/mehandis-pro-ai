"""Tests for IFC file processor"""
import pytest
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from processors.ifc_processor import IFCProcessor, IFCFileError
from models import ElementCategory, GeometryType


class TestIFCProcessor:
    """Test suite for IFCProcessor"""
    
    @pytest.fixture
    def processor(self):
        """Create an IFCProcessor instance"""
        return IFCProcessor()
    
    @pytest.fixture
    def temp_ifc_file(self):
        """Create a temporary mock IFC file"""
        with tempfile.NamedTemporaryFile(suffix='.ifc', delete=False) as f:
            # Write minimal IFC header
            f.write(b'ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(());\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;')
            temp_path = f.name
        
        yield temp_path
        
        # Cleanup
        Path(temp_path).unlink(missing_ok=True)
    
    def test_can_process_valid_ifc_file(self, processor):
        """Test that processor recognizes .ifc files"""
        assert processor.can_process("model.ifc") is True
        assert processor.can_process("MODEL.IFC") is True
        assert processor.can_process("/path/to/model.ifc") is True
    
    def test_can_process_invalid_file(self, processor):
        """Test that processor rejects non-IFC files"""
        assert processor.can_process("model.rvt") is False
        assert processor.can_process("model.dwg") is False
        assert processor.can_process("model.txt") is False
    
    def test_validate_file_not_found(self, processor):
        """Test validation fails for non-existent file"""
        is_valid, error = processor.validate_file("/nonexistent/file.ifc")
        assert is_valid is False
        # Error could be about missing library or file not found
        assert "not found" in error.lower() or "not available" in error.lower()
    
    def test_validate_file_empty(self, processor):
        """Test validation fails for empty file"""
        with tempfile.NamedTemporaryFile(suffix='.ifc', delete=False) as f:
            temp_path = f.name
        
        try:
            is_valid, error = processor.validate_file(temp_path)
            assert is_valid is False
            # Error could be about empty file or missing library
            assert "empty" in error.lower() or "not available" in error.lower()
        finally:
            Path(temp_path).unlink(missing_ok=True)
    
    def test_classify_element_wall(self, processor):
        """Test element classification for walls"""
        mock_element = Mock()
        mock_element.is_a.return_value = "IfcWall"
        
        category = processor._classify_element(mock_element)
        assert category == ElementCategory.WALL
    
    def test_classify_element_slab(self, processor):
        """Test element classification for slabs/floors"""
        mock_element = Mock()
        mock_element.is_a.return_value = "IfcSlab"
        
        category = processor._classify_element(mock_element)
        assert category == ElementCategory.FLOOR
    
    def test_classify_element_column(self, processor):
        """Test element classification for columns"""
        mock_element = Mock()
        mock_element.is_a.return_value = "IfcColumn"
        
        category = processor._classify_element(mock_element)
        assert category == ElementCategory.COLUMN
    
    def test_classify_element_unknown(self, processor):
        """Test element classification for unknown type"""
        mock_element = Mock()
        mock_element.is_a.return_value = "IfcUnknownType"
        
        category = processor._classify_element(mock_element)
        assert category == ElementCategory.OTHER
    
    def test_calculate_bounding_box_with_vertices(self, processor):
        """Test bounding box calculation from vertices"""
        vertices = [
            [0.0, 0.0, 0.0],
            [5.0, 0.0, 0.0],
            [5.0, 3.0, 0.0],
            [0.0, 3.0, 0.0],
            [0.0, 0.0, 2.0],
            [5.0, 0.0, 2.0],
            [5.0, 3.0, 2.0],
            [0.0, 3.0, 2.0],
        ]
        
        bbox = processor._calculate_bounding_box(vertices)
        
        assert bbox.min["x"] == 0.0
        assert bbox.min["y"] == 0.0
        assert bbox.min["z"] == 0.0
        assert bbox.max["x"] == 5.0
        assert bbox.max["y"] == 3.0
        assert bbox.max["z"] == 2.0
    
    def test_calculate_bounding_box_empty(self, processor):
        """Test bounding box calculation with no vertices"""
        bbox = processor._calculate_bounding_box([])
        
        assert bbox.min["x"] == 0.0
        assert bbox.min["y"] == 0.0
        assert bbox.min["z"] == 0.0
        assert bbox.max["x"] == 0.0
        assert bbox.max["y"] == 0.0
        assert bbox.max["z"] == 0.0
    
    def test_extract_properties_basic(self, processor):
        """Test basic property extraction"""
        mock_element = Mock()
        mock_element.Name = "Test Wall"
        mock_element.Description = "A test wall element"
        mock_element.ObjectType = "Wall Type 1"
        mock_element.Tag = "W-001"
        mock_element.IsDefinedBy = []
        
        properties = processor._extract_properties(mock_element)
        
        assert properties["Name"] == "Test Wall"
        assert properties["Description"] == "A test wall element"
        assert properties["ObjectType"] == "Wall Type 1"
        assert properties["Tag"] == "W-001"
    
    def test_extract_properties_no_attributes(self, processor):
        """Test property extraction with minimal attributes"""
        mock_element = Mock()
        mock_element.Name = None
        mock_element.Description = None
        mock_element.ObjectType = None
        mock_element.Tag = None
        mock_element.IsDefinedBy = []
        
        properties = processor._extract_properties(mock_element)
        
        # Should return empty dict or dict without None values
        assert isinstance(properties, dict)
    
    def test_get_element_level_no_structure(self, processor):
        """Test level extraction when element has no structure"""
        mock_element = Mock()
        mock_element.ContainedInStructure = []
        
        level = processor._get_element_level(mock_element)
        assert level is None
    
    def test_get_element_type_name_no_type(self, processor):
        """Test type name extraction when element has no type"""
        mock_element = Mock()
        mock_element.IsTypedBy = []
        
        type_name = processor._get_element_type_name(mock_element)
        assert type_name is None
    
    def test_get_material_ids_no_materials(self, processor):
        """Test material ID extraction when element has no materials"""
        mock_element = Mock()
        mock_element.HasAssociations = []
        
        material_ids = processor._get_material_ids(mock_element)
        assert material_ids == []
    
    def test_get_project_info_no_ifcopenshell(self, processor):
        """Test project info extraction when ifcopenshell not available"""
        with patch('processors.ifc_processor.IFCOPENSHELL_AVAILABLE', False):
            project_info = processor.get_project_info("test.ifc")
            assert project_info == {}
    
    def test_get_software_version_with_info(self, processor):
        """Test software version extraction with full info"""
        mock_info = {
            'application': 'Revit',
            'version': '2024',
            'schema': 'IFC4'
        }
        
        with patch.object(processor, 'get_project_info', return_value=mock_info):
            version = processor.get_software_version("test.ifc")
            assert "Revit" in version
            assert "2024" in version
            assert "IFC4" in version
    
    def test_get_software_version_schema_only(self, processor):
        """Test software version extraction with schema only"""
        mock_info = {
            'schema': 'IFC2X3'
        }
        
        with patch.object(processor, 'get_project_info', return_value=mock_info):
            version = processor.get_software_version("test.ifc")
            assert "IFC2X3" in version
    
    def test_get_software_version_no_info(self, processor):
        """Test software version extraction with no info"""
        with patch.object(processor, 'get_project_info', return_value={}):
            version = processor.get_software_version("test.ifc")
            assert "unknown" in version.lower()


class TestIFCProcessorIntegration:
    """Integration tests for IFC processor"""
    
    @pytest.fixture
    def processor(self):
        """Create an IFCProcessor instance"""
        return IFCProcessor()
    
    def test_extract_elements_no_ifcopenshell(self, processor):
        """Test that extract_elements raises error when ifcopenshell not available"""
        with patch('processors.ifc_processor.IFCOPENSHELL_AVAILABLE', False):
            with pytest.raises(IFCFileError) as exc_info:
                processor.extract_elements("test.ifc", "model-123")
            assert "not available" in str(exc_info.value).lower()
    
    def test_extract_elements_invalid_file(self, processor):
        """Test that extract_elements raises error for invalid file"""
        with pytest.raises(IFCFileError):
            processor.extract_elements("/nonexistent/file.ifc", "model-123")
    
    def test_validate_file_no_ifcopenshell(self, processor):
        """Test validation when ifcopenshell not available"""
        with patch('processors.ifc_processor.IFCOPENSHELL_AVAILABLE', False):
            is_valid, error = processor.validate_file("test.ifc")
            assert is_valid is False
            assert "not available" in error.lower()
    
    @pytest.mark.skipif(
        not hasattr(sys.modules.get('processors.ifc_processor', None), 'IFCOPENSHELL_AVAILABLE') or 
        not sys.modules.get('processors.ifc_processor', None).IFCOPENSHELL_AVAILABLE,
        reason="ifcopenshell not available"
    )
    def test_full_processing_workflow_with_mock(self, processor):
        """Test complete processing workflow with mocked IFC file"""
        # This test would require a real IFC file or extensive mocking
        # For now, we test the error handling path
        with tempfile.NamedTemporaryFile(suffix='.ifc', delete=False) as f:
            f.write(b'Invalid IFC content')
            temp_path = f.name
        
        try:
            # Should fail validation
            is_valid, error = processor.validate_file(temp_path)
            # Either validation fails or extraction fails
            assert is_valid is False or error is not None
        finally:
            Path(temp_path).unlink(missing_ok=True)


class TestIFCProcessorGeometry:
    """Tests for IFC geometry processing"""
    
    @pytest.fixture
    def processor(self):
        """Create an IFCProcessor instance"""
        return IFCProcessor()
    
    def test_extract_geometry_no_shape(self, processor):
        """Test geometry extraction when shape creation fails"""
        mock_element = Mock()
        
        # Test that extraction returns None when it fails
        geometry = processor._extract_geometry(mock_element)
        assert geometry is None
    
    def test_calculate_bounding_box_negative_coords(self, processor):
        """Test bounding box with negative coordinates"""
        vertices = [
            [-5.0, -3.0, -1.0],
            [5.0, 3.0, 1.0],
        ]
        
        bbox = processor._calculate_bounding_box(vertices)
        
        assert bbox.min["x"] == -5.0
        assert bbox.min["y"] == -3.0
        assert bbox.min["z"] == -1.0
        assert bbox.max["x"] == 5.0
        assert bbox.max["y"] == 3.0
        assert bbox.max["z"] == 1.0
    
    def test_calculate_bounding_box_single_point(self, processor):
        """Test bounding box with single vertex"""
        vertices = [[2.5, 3.5, 4.5]]
        
        bbox = processor._calculate_bounding_box(vertices)
        
        assert bbox.min["x"] == 2.5
        assert bbox.min["y"] == 3.5
        assert bbox.min["z"] == 4.5
        assert bbox.max["x"] == 2.5
        assert bbox.max["y"] == 3.5
        assert bbox.max["z"] == 4.5
