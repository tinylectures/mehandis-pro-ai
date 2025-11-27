"""Tests for element classification functionality

This test module validates that element classification works correctly
for both IFC and Revit elements, ensuring all elements are properly
categorized according to the classification rules.
"""
import pytest
from processors.element_classifier import ElementClassifier, get_classifier
from models import ElementCategory


class TestElementClassifier:
    """Test suite for ElementClassifier"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.classifier = ElementClassifier()
    
    def test_classifier_singleton(self):
        """Test that get_classifier returns the same instance"""
        classifier1 = get_classifier()
        classifier2 = get_classifier()
        assert classifier1 is classifier2
    
    def test_classify_ifc_wall(self):
        """Test classification of IFC wall elements"""
        category = self.classifier.classify_ifc_element("IfcWall")
        assert category == ElementCategory.WALL
    
    def test_classify_ifc_wall_standard_case(self):
        """Test classification of IFC standard wall"""
        category = self.classifier.classify_ifc_element("IfcWallStandardCase")
        assert category == ElementCategory.WALL
    
    def test_classify_ifc_slab(self):
        """Test classification of IFC slab elements"""
        category = self.classifier.classify_ifc_element("IfcSlab")
        assert category == ElementCategory.FLOOR
    
    def test_classify_ifc_column(self):
        """Test classification of IFC column elements"""
        category = self.classifier.classify_ifc_element("IfcColumn")
        assert category == ElementCategory.COLUMN
    
    def test_classify_ifc_beam(self):
        """Test classification of IFC beam elements"""
        category = self.classifier.classify_ifc_element("IfcBeam")
        assert category == ElementCategory.BEAM
    
    def test_classify_ifc_door(self):
        """Test classification of IFC door elements"""
        category = self.classifier.classify_ifc_element("IfcDoor")
        assert category == ElementCategory.DOOR
    
    def test_classify_ifc_window(self):
        """Test classification of IFC window elements"""
        category = self.classifier.classify_ifc_element("IfcWindow")
        assert category == ElementCategory.WINDOW
    
    def test_classify_ifc_stair(self):
        """Test classification of IFC stair elements"""
        category = self.classifier.classify_ifc_element("IfcStair")
        assert category == ElementCategory.STAIR
    
    def test_classify_ifc_railing(self):
        """Test classification of IFC railing elements"""
        category = self.classifier.classify_ifc_element("IfcRailing")
        assert category == ElementCategory.RAILING
    
    def test_classify_ifc_foundation(self):
        """Test classification of IFC foundation elements"""
        category = self.classifier.classify_ifc_element("IfcFooting")
        assert category == ElementCategory.FOUNDATION
    
    def test_classify_ifc_unknown_type(self):
        """Test classification of unknown IFC element type"""
        category = self.classifier.classify_ifc_element("IfcUnknownType")
        assert category == ElementCategory.OTHER
    
    def test_classify_ifc_with_properties(self):
        """Test classification using element properties"""
        properties = {
            "Type": "wall",
            "Function": "Load Bearing"
        }
        category = self.classifier.classify_ifc_element(
            "IfcBuildingElementProxy",
            properties=properties
        )
        assert category == ElementCategory.WALL
    
    def test_classify_ifc_with_family_name(self):
        """Test classification using family name"""
        category = self.classifier.classify_ifc_element(
            "IfcBuildingElementProxy",
            family_name="column"
        )
        assert category == ElementCategory.COLUMN
    
    def test_classify_revit_wall(self):
        """Test classification of Revit wall elements"""
        category = self.classifier.classify_revit_element(category_id=-2000011)
        assert category == ElementCategory.WALL
    
    def test_classify_revit_floor(self):
        """Test classification of Revit floor elements"""
        category = self.classifier.classify_revit_element(category_id=-2000032)
        assert category == ElementCategory.FLOOR
    
    def test_classify_revit_column(self):
        """Test classification of Revit column elements"""
        category = self.classifier.classify_revit_element(category_id=-2000100)
        assert category == ElementCategory.COLUMN
    
    def test_classify_revit_beam(self):
        """Test classification of Revit beam elements"""
        category = self.classifier.classify_revit_element(category_id=-2000012)
        assert category == ElementCategory.BEAM
    
    def test_classify_revit_door(self):
        """Test classification of Revit door elements"""
        category = self.classifier.classify_revit_element(category_id=-2000023)
        assert category == ElementCategory.DOOR
    
    def test_classify_revit_window(self):
        """Test classification of Revit window elements"""
        category = self.classifier.classify_revit_element(category_id=-2000014)
        assert category == ElementCategory.WINDOW
    
    def test_classify_revit_with_category_name(self):
        """Test classification using Revit category name"""
        category = self.classifier.classify_revit_element(
            category_name="beam"
        )
        # Should match "beam" keyword
        assert category == ElementCategory.BEAM
    
    def test_classify_revit_with_family_name(self):
        """Test classification using Revit family name"""
        category = self.classifier.classify_revit_element(
            family_name="Basic Wall"
        )
        assert category == ElementCategory.WALL
    
    def test_classify_revit_unknown(self):
        """Test classification of unknown Revit element"""
        category = self.classifier.classify_revit_element(category_id=-9999999)
        assert category == ElementCategory.OTHER
    
    def test_classification_confidence_high(self):
        """Test confidence score for direct type mapping"""
        confidence = self.classifier.get_classification_confidence(
            "IfcWall",
            ElementCategory.WALL
        )
        assert confidence == 1.0
    
    def test_classification_confidence_medium(self):
        """Test confidence score for property-based classification"""
        properties = {"Type": "Wall"}
        confidence = self.classifier.get_classification_confidence(
            "IfcBuildingElementProxy",
            ElementCategory.WALL,
            properties=properties
        )
        assert confidence == 0.7
    
    def test_classification_metadata(self):
        """Test classification metadata generation"""
        metadata = self.classifier.get_classification_metadata(
            ElementCategory.WALL,
            element_type="IfcWall"
        )
        assert metadata["category"] == "wall"
        assert metadata["classification_method"] == "ifc_type_mapping"
        assert metadata["confidence"] == 1.0
    
    def test_get_supported_categories(self):
        """Test retrieval of all supported categories"""
        categories = self.classifier.get_supported_categories()
        assert len(categories) > 0
        assert ElementCategory.WALL in categories
        assert ElementCategory.FLOOR in categories
        assert ElementCategory.COLUMN in categories
    
    def test_classification_cache(self):
        """Test that classification results are cached"""
        # First call
        category1 = self.classifier.classify_ifc_element("IfcWall")
        # Second call should use cache
        category2 = self.classifier.classify_ifc_element("IfcWall")
        assert category1 == category2
        assert category1 == ElementCategory.WALL
    
    def test_clear_cache(self):
        """Test cache clearing functionality"""
        # Populate cache
        self.classifier.classify_ifc_element("IfcWall")
        # Clear cache
        self.classifier.clear_cache()
        # Should still work after clearing
        category = self.classifier.classify_ifc_element("IfcWall")
        assert category == ElementCategory.WALL
    
    def test_classify_by_name_patterns(self):
        """Test classification based on name patterns"""
        test_cases = [
            ("Exterior Wall", ElementCategory.WALL),
            ("Concrete Floor Slab", ElementCategory.FLOOR),
            ("Steel Column", ElementCategory.COLUMN),
            ("Roof Beam", ElementCategory.BEAM),
            ("Entry Door", ElementCategory.DOOR),
            ("Fixed Window", ElementCategory.WINDOW),
            ("Staircase", ElementCategory.STAIR),
            ("Handrail", ElementCategory.RAILING),
            ("Foundation Footing", ElementCategory.FOUNDATION),
        ]
        
        for name, expected_category in test_cases:
            category = self.classifier._classify_by_name(name)
            assert category == expected_category, f"Failed for name: {name}"
    
    def test_classify_curtain_wall(self):
        """Test classification of curtain wall as wall"""
        category = self.classifier.classify_ifc_element("IfcCurtainWall")
        assert category == ElementCategory.WALL
    
    def test_classify_stair_flight(self):
        """Test classification of stair flight as stair"""
        category = self.classifier.classify_ifc_element("IfcStairFlight")
        assert category == ElementCategory.STAIR
    
    def test_classify_pile_as_foundation(self):
        """Test classification of pile as foundation"""
        category = self.classifier.classify_ifc_element("IfcPile")
        assert category == ElementCategory.FOUNDATION


class TestClassificationIntegration:
    """Test classification integration with processors"""
    
    def test_ifc_processor_uses_classifier(self):
        """Test that IFC processor uses the classifier"""
        from processors.ifc_processor import IFCProcessor
        processor = IFCProcessor()
        assert processor.classifier is not None
    
    def test_classification_stored_in_element(self):
        """Test that classification is stored in Element model"""
        from models import Element, Geometry, GeometryType, BoundingBox
        from datetime import datetime, timezone
        
        element = Element(
            id="test-id",
            model_id="model-id",
            external_id="ext-id",
            category=ElementCategory.WALL,
            family_name="Basic Wall",
            type_name="Generic",
            level="Level 1",
            geometry=Geometry(
                type=GeometryType.SOLID,
                bounding_box=BoundingBox(
                    min={"x": 0.0, "y": 0.0, "z": 0.0},
                    max={"x": 1.0, "y": 1.0, "z": 1.0}
                )
            ),
            properties={},
            material_ids=[],
            created_at=datetime.now(timezone.utc)
        )
        
        assert element.category == ElementCategory.WALL
        assert element.category.value == "wall"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
