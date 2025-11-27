"""Tests for Revit file processor"""
import pytest
import tempfile
import struct
from pathlib import Path
from unittest.mock import Mock, patch
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from processors.revit_processor import RevitProcessor, RevitFileError
from models import ElementCategory, GeometryType


class TestRevitProcessor:
    """Test suite for RevitProcessor"""
    
    @pytest.fixture
    def processor(self):
        """Create a RevitProcessor instance"""
        return RevitProcessor()
    
    @pytest.fixture
    def temp_revit_file(self):
        """Create a temporary mock Revit file"""
        with tempfile.NamedTemporaryFile(suffix='.rvt', delete=False) as f:
            # Write some dummy data
            f.write(b'Mock Revit File Content')
            temp_path = f.name
        
        yield temp_path
        
        # Cleanup
        Path(temp_path).unlink(missing_ok=True)
    
    def test_can_process_valid_revit_file(self, processor):
        """Test that processor recognizes .rvt files"""
        assert processor.can_process("model.rvt") is True
        assert processor.can_process("MODEL.RVT") is True
        assert processor.can_process("/path/to/model.rvt") is True
    
    def test_can_process_invalid_file(self, processor):
        """Test that processor rejects non-Revit files"""
        assert processor.can_process("model.ifc") is False
        assert processor.can_process("model.dwg") is False
        assert processor.can_process("model.txt") is False
    
    def test_validate_file_not_found(self, processor):
        """Test validation fails for non-existent file"""
        is_valid, error = processor.validate_file("/nonexistent/file.rvt")
        assert is_valid is False
        assert "not found" in error.lower()
    
    def test_validate_file_empty(self, processor):
        """Test validation fails for empty file"""
        with tempfile.NamedTemporaryFile(suffix='.rvt', delete=False) as f:
            temp_path = f.name
        
        try:
            is_valid, error = processor.validate_file(temp_path)
            assert is_valid is False
            assert "empty" in error.lower()
        finally:
            Path(temp_path).unlink(missing_ok=True)
    
    def test_classify_element_wall(self, processor):
        """Test element classification for walls"""
        category = processor.classify_element(-2000011)
        assert category == ElementCategory.WALL
    
    def test_classify_element_floor(self, processor):
        """Test element classification for floors"""
        category = processor.classify_element(-2000032)
        assert category == ElementCategory.FLOOR
    
    def test_classify_element_column(self, processor):
        """Test element classification for columns"""
        category = processor.classify_element(-2000100)
        assert category == ElementCategory.COLUMN
    
    def test_classify_element_unknown(self, processor):
        """Test element classification for unknown category"""
        category = processor.classify_element(999999)
        assert category == ElementCategory.OTHER
    
    def test_create_geometry_for_wall(self, processor):
        """Test geometry creation for wall category"""
        geometry = processor._create_geometry_for_category(
            ElementCategory.WALL,
            (0.0, 0.0, 0.0)
        )
        
        assert geometry.type == GeometryType.SOLID
        assert geometry.bounding_box is not None
        assert len(geometry.vertices) == 8  # Box has 8 vertices
        assert len(geometry.faces) == 6  # Box has 6 faces
    
    def test_create_geometry_for_column(self, processor):
        """Test geometry creation for column category"""
        geometry = processor._create_geometry_for_category(
            ElementCategory.COLUMN,
            (5.0, 5.0, 0.0)
        )
        
        assert geometry.type == GeometryType.SOLID
        assert geometry.bounding_box.min["x"] == 5.0
        assert geometry.bounding_box.min["y"] == 5.0
        assert geometry.bounding_box.min["z"] == 0.0
    
    def test_create_properties_for_wall(self, processor):
        """Test property creation for wall category"""
        properties = processor._create_properties_for_category(
            ElementCategory.WALL,
            "Basic Wall",
            "Generic - 200mm",
            (0.0, 0.0, 0.0)
        )
        
        assert properties["Family"] == "Basic Wall"
        assert properties["Type"] == "Generic - 200mm"
        assert "Length" in properties
        assert "Height" in properties
        assert "Thickness" in properties
        assert "Volume" in properties
    
    def test_create_properties_for_door(self, processor):
        """Test property creation for door category"""
        properties = processor._create_properties_for_category(
            ElementCategory.DOOR,
            "Single Door",
            "0915 x 2134mm",
            (10.0, 0.0, 0.0)
        )
        
        assert properties["Family"] == "Single Door"
        assert "Width" in properties
        assert "Height" in properties
        assert properties["Location"]["X"] == 10.0
    
    def test_create_element(self, processor):
        """Test element creation with all components"""
        element = processor._create_element(
            model_id="model-123",
            external_id="elem-456",
            category=ElementCategory.BEAM,
            family_name="Structural Framing",
            type_name="W12x26",
            level="Level 2",
            position=(0.0, 0.0, 3.0)
        )
        
        assert element.model_id == "model-123"
        assert element.external_id == "elem-456"
        assert element.category == ElementCategory.BEAM
        assert element.family_name == "Structural Framing"
        assert element.type_name == "W12x26"
        assert element.level == "Level 2"
        assert element.geometry is not None
        assert element.properties is not None
        assert element.created_at is not None
    
    def test_create_sample_elements(self, processor):
        """Test sample element creation"""
        elements = processor._create_sample_elements("model-123", "test.rvt")
        
        assert len(elements) > 0
        assert all(elem.model_id == "model-123" for elem in elements)
        
        # Check that we have different categories
        categories = {elem.category for elem in elements}
        assert ElementCategory.WALL in categories
        assert ElementCategory.FLOOR in categories
        assert ElementCategory.COLUMN in categories
    
    def test_get_project_info(self, processor, temp_revit_file):
        """Test project info extraction"""
        project_info = processor.get_project_info(temp_revit_file)
        
        assert "project_name" in project_info
        assert "project_number" in project_info
        assert "author" in project_info
        assert project_info["project_name"] != ""
    
    def test_extract_file_metadata(self, processor, temp_revit_file):
        """Test file metadata extraction"""
        metadata = processor._extract_file_metadata(temp_revit_file)
        
        assert "file_name" in metadata
        assert "file_size" in metadata
        assert metadata["file_size"] > 0
    
    def test_extract_elements_invalid_file(self, processor):
        """Test that extract_elements raises error for invalid file"""
        with pytest.raises(RevitFileError):
            processor.extract_elements("/nonexistent/file.rvt", "model-123")
    
    def test_extract_elements_success(self, processor, temp_revit_file):
        """Test successful element extraction"""
        # Mock the validation to pass for our temp file
        with patch.object(processor, 'can_process', return_value=True):
            elements = processor.extract_elements(temp_revit_file, "model-123")
            
            assert isinstance(elements, list)
            assert len(elements) > 0
            
            # Verify element structure
            for element in elements:
                assert element.model_id == "model-123"
                assert element.external_id is not None
                assert element.category is not None
                assert element.geometry is not None
                assert element.properties is not None


class TestRevitProcessorIntegration:
    """Integration tests for Revit processor"""
    
    @pytest.fixture
    def processor(self):
        """Create a RevitProcessor instance"""
        return RevitProcessor()
    
    def test_full_processing_workflow(self, processor):
        """Test complete processing workflow"""
        # Create a temporary file
        with tempfile.NamedTemporaryFile(suffix='.rvt', delete=False) as f:
            f.write(b'Mock Revit File Content')
            temp_path = f.name
        
        try:
            # Mock validation to pass
            with patch.object(processor, 'can_process', return_value=True):
                # Extract elements
                elements = processor.extract_elements(temp_path, "test-model")
                
                # Verify we got elements
                assert len(elements) > 0
                
                # Verify each element has required data
                for element in elements:
                    assert element.id is not None
                    assert element.model_id == "test-model"
                    assert element.external_id is not None
                    assert element.category in ElementCategory
                    
                    # Verify geometry
                    assert element.geometry.type == GeometryType.SOLID
                    assert element.geometry.bounding_box is not None
                    assert len(element.geometry.vertices) > 0
                    assert len(element.geometry.faces) > 0
                    
                    # Verify properties
                    assert "Family" in element.properties
                    assert "Type" in element.properties
                    assert "Location" in element.properties
                
                # Get project info
                project_info = processor.get_project_info(temp_path)
                assert project_info["project_name"] is not None
                
        finally:
            Path(temp_path).unlink(missing_ok=True)
    
    def test_element_geometry_consistency(self, processor):
        """Test that element geometry is consistent"""
        elements = processor._create_sample_elements("model-123", "test.rvt")
        
        for element in elements:
            # Verify bounding box matches vertices
            bbox = element.geometry.bounding_box
            vertices = element.geometry.vertices
            
            if vertices:
                # Check that all vertices are within or on bounding box
                for vertex in vertices:
                    x, y, z = vertex
                    assert bbox.min["x"] <= x <= bbox.max["x"]
                    assert bbox.min["y"] <= y <= bbox.max["y"]
                    assert bbox.min["z"] <= z <= bbox.max["z"]
    
    def test_element_properties_completeness(self, processor):
        """Test that all elements have complete properties"""
        elements = processor._create_sample_elements("model-123", "test.rvt")
        
        required_properties = ["Family", "Type", "Location"]
        
        for element in elements:
            for prop in required_properties:
                assert prop in element.properties, \
                    f"Element {element.external_id} missing property: {prop}"
