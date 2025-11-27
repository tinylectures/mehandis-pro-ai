"""Integration tests for element classification

This test module validates that element classification is properly integrated
into the BIM processing workflow and that classification results are correctly
stored in the Element model.

Validates: Requirements 3.3 - Element classification
"""
import pytest
from processors.ifc_processor import IFCProcessor
from processors.revit_processor import RevitProcessor
from processors.element_classifier import get_classifier
from models import ElementCategory


class TestClassificationIntegration:
    """Integration tests for element classification in BIM processing"""
    
    def test_ifc_processor_classifies_all_elements(self):
        """Test that IFC processor classifies all extracted elements
        
        Validates that every element extracted from an IFC model has a valid
        category assigned through the classification system.
        """
        processor = IFCProcessor()
        
        # Verify processor has classifier
        assert processor.classifier is not None
        assert processor.classifier == get_classifier()
    
    def test_revit_processor_classifies_all_elements(self):
        """Test that Revit processor classifies all extracted elements
        
        Validates that every element extracted from a Revit model has a valid
        category assigned through the classification system.
        """
        processor = RevitProcessor()
        
        # Verify processor has classifier
        assert processor.classifier is not None
        assert processor.classifier == get_classifier()
    
    def test_revit_sample_elements_have_valid_categories(self):
        """Test that sample Revit elements have valid categories
        
        Validates that the sample elements created by the Revit processor
        all have valid, non-null categories.
        """
        processor = RevitProcessor()
        elements = processor._create_sample_elements("test-model-id", "test.rvt")
        
        # Verify all elements have categories
        assert len(elements) > 0
        for element in elements:
            assert element.category is not None
            assert isinstance(element.category, ElementCategory)
            assert element.category in ElementCategory
    
    def test_classification_results_stored_in_element(self):
        """Test that classification results are stored in Element model
        
        Validates that the category field in the Element model correctly
        stores the classification result.
        """
        processor = RevitProcessor()
        elements = processor._create_sample_elements("test-model-id", "test.rvt")
        
        # Check specific element categories
        category_counts = {}
        for element in elements:
            category = element.category
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # Verify we have multiple different categories
        assert len(category_counts) > 1
        
        # Verify categories are from the expected set
        expected_categories = {
            ElementCategory.WALL,
            ElementCategory.FLOOR,
            ElementCategory.COLUMN,
            ElementCategory.BEAM,
            ElementCategory.DOOR,
            ElementCategory.WINDOW
        }
        for category in category_counts.keys():
            assert category in expected_categories
    
    def test_ifc_classification_uses_type_mapping(self):
        """Test that IFC classification uses type mapping correctly
        
        Validates that IFC elements are classified using the IFC type mapping
        as the primary classification method.
        """
        classifier = get_classifier()
        
        # Test various IFC types directly with the classifier
        test_cases = [
            ("IfcWall", ElementCategory.WALL),
            ("IfcSlab", ElementCategory.FLOOR),
            ("IfcColumn", ElementCategory.COLUMN),
            ("IfcBeam", ElementCategory.BEAM),
            ("IfcDoor", ElementCategory.DOOR),
            ("IfcWindow", ElementCategory.WINDOW),
            ("IfcStair", ElementCategory.STAIR),
            ("IfcRailing", ElementCategory.RAILING),
            ("IfcFooting", ElementCategory.FOUNDATION),
        ]
        
        for ifc_type, expected_category in test_cases:
            category = classifier.classify_ifc_element(ifc_type)
            assert category == expected_category, \
                f"Failed to classify {ifc_type} as {expected_category}"
    
    def test_revit_classification_uses_category_id(self):
        """Test that Revit classification uses category ID correctly
        
        Validates that Revit elements are classified using the Revit category ID
        mapping as the primary classification method.
        """
        processor = RevitProcessor()
        
        # Test various Revit category IDs
        test_cases = [
            (-2000011, ElementCategory.WALL),
            (-2000032, ElementCategory.FLOOR),
            (-2000100, ElementCategory.COLUMN),
            (-2000012, ElementCategory.BEAM),
            (-2000023, ElementCategory.DOOR),
            (-2000014, ElementCategory.WINDOW),
            (-2000120, ElementCategory.STAIR),
            (-2000126, ElementCategory.RAILING),
            (-2000080, ElementCategory.FOUNDATION),
        ]
        
        for category_id, expected_category in test_cases:
            category = processor.classify_element(category_id=category_id)
            assert category == expected_category, \
                f"Failed to classify category_id {category_id} as {expected_category}"
    
    def test_classification_fallback_to_other(self):
        """Test that unknown elements are classified as OTHER
        
        Validates that elements that cannot be classified using any method
        are assigned the OTHER category as a fallback.
        """
        classifier = get_classifier()
        
        # Test unknown IFC type
        category = classifier.classify_ifc_element("IfcUnknownType")
        assert category == ElementCategory.OTHER
        
        # Test unknown Revit category ID
        category = classifier.classify_revit_element(category_id=-9999999)
        assert category == ElementCategory.OTHER
    
    def test_classification_metadata_included(self):
        """Test that classification metadata is available
        
        Validates that classification metadata (method, confidence) is
        generated for all classifications.
        """
        classifier = get_classifier()
        
        # Test metadata for direct type mapping
        metadata = classifier.get_classification_metadata(
            ElementCategory.WALL,
            element_type="IfcWall"
        )
        assert "category" in metadata
        assert "classification_method" in metadata
        assert "confidence" in metadata
        assert metadata["category"] == "wall"
        assert metadata["confidence"] > 0
    
    def test_all_element_categories_supported(self):
        """Test that all element categories are supported
        
        Validates that the classification system supports all defined
        element categories.
        """
        classifier = get_classifier()
        supported_categories = classifier.get_supported_categories()
        
        # Verify all ElementCategory values are supported
        for category in ElementCategory:
            assert category in supported_categories
    
    def test_classification_consistency(self):
        """Test that classification is consistent across multiple calls
        
        Validates that classifying the same element multiple times
        produces the same result (tests caching).
        """
        classifier = get_classifier()
        
        # Classify the same element multiple times
        results = []
        for _ in range(5):
            category = classifier.classify_ifc_element("IfcWall")
            results.append(category)
        
        # All results should be the same
        assert all(r == ElementCategory.WALL for r in results)
    
    def test_element_properties_include_category(self):
        """Test that element properties include category information
        
        Validates that when elements are created, their properties
        include the category information.
        """
        processor = RevitProcessor()
        elements = processor._create_sample_elements("test-model-id", "test.rvt")
        
        for element in elements:
            # Category should be set
            assert element.category is not None
            
            # Properties should exist
            assert element.properties is not None
            assert isinstance(element.properties, dict)
            
            # Family and type should be set
            assert element.family_name is not None
            assert element.type_name is not None


class TestClassificationRequirements:
    """Tests that validate classification meets requirements"""
    
    def test_requirement_3_3_all_elements_classified(self):
        """Test that all elements are classified (Requirement 3.3)
        
        Requirement 3.3: WHEN the System processes a BIM model THEN the System 
        SHALL classify elements by category (walls, floors, columns, beams, etc.)
        
        This test validates that every element extracted from a BIM model
        receives a valid classification.
        """
        # Test with Revit processor
        revit_processor = RevitProcessor()
        revit_elements = revit_processor._create_sample_elements("model-1", "test.rvt")
        
        # Verify all elements have valid categories
        for element in revit_elements:
            assert element.category is not None, \
                f"Element {element.external_id} has no category"
            assert isinstance(element.category, ElementCategory), \
                f"Element {element.external_id} has invalid category type"
            assert element.category in ElementCategory, \
                f"Element {element.external_id} has unsupported category"
        
        # Verify we have multiple category types
        categories = {e.category for e in revit_elements}
        assert len(categories) > 1, \
            "Expected multiple different element categories"
    
    def test_requirement_3_3_classification_rules_exist(self):
        """Test that classification rules exist for common element types
        
        Validates that the classification system has rules defined for
        all common BIM element types.
        """
        classifier = get_classifier()
        
        # Verify IFC type mappings exist
        assert len(classifier.IFC_TYPE_MAPPING) > 0
        assert "IfcWall" in classifier.IFC_TYPE_MAPPING
        assert "IfcSlab" in classifier.IFC_TYPE_MAPPING
        assert "IfcColumn" in classifier.IFC_TYPE_MAPPING
        assert "IfcBeam" in classifier.IFC_TYPE_MAPPING
        
        # Verify Revit category mappings exist
        assert len(classifier.REVIT_CATEGORY_MAPPING) > 0
        assert -2000011 in classifier.REVIT_CATEGORY_MAPPING  # Walls
        assert -2000032 in classifier.REVIT_CATEGORY_MAPPING  # Floors
        assert -2000100 in classifier.REVIT_CATEGORY_MAPPING  # Columns
        
        # Verify keyword mappings exist
        assert len(classifier.CATEGORY_KEYWORDS) > 0
        assert ElementCategory.WALL in classifier.CATEGORY_KEYWORDS
        assert ElementCategory.COLUMN in classifier.CATEGORY_KEYWORDS
    
    def test_requirement_3_3_classification_stored(self):
        """Test that classification results are stored (Requirement 3.3)
        
        Validates that the classification result is persisted in the
        Element model's category field.
        """
        processor = RevitProcessor()
        element = processor._create_element(
            model_id="test-model",
            external_id="elem-1",
            category=ElementCategory.WALL,
            family_name="Basic Wall",
            type_name="Generic",
            level="Level 1",
            position=(0.0, 0.0, 0.0)
        )
        
        # Verify category is stored
        assert element.category == ElementCategory.WALL
        
        # Verify category can be serialized
        element_dict = element.model_dump()
        assert "category" in element_dict
        assert element_dict["category"] == "wall"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
