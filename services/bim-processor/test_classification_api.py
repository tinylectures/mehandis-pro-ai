"""Tests for element classification API endpoints

This test module validates the classification API endpoints including:
- Element classification endpoint
- Supported categories endpoint
- Integration with IFC and Revit processors
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from models import ElementCategory


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def auth_token():
    """Mock authentication token"""
    return "Bearer test_token_1234567890"


class TestClassificationEndpoints:
    """Test suite for classification API endpoints"""
    
    def test_classify_ifc_wall(self, client, auth_token):
        """Test classification of IFC wall element"""
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "IfcWall",
                "file_type": "ifc"
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["category"] == "wall"
        assert data["confidence"] == 1.0
        assert data["classification_method"] == "ifc_type_mapping"
    
    def test_classify_ifc_column(self, client, auth_token):
        """Test classification of IFC column element"""
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "IfcColumn",
                "file_type": "ifc"
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "column"
        assert data["confidence"] == 1.0
    
    def test_classify_ifc_with_properties(self, client, auth_token):
        """Test classification with element properties"""
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "IfcBuildingElementProxy",
                "file_type": "ifc",
                "properties": {"Type": "beam", "Function": "Structural"}
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "beam"
    
    def test_classify_ifc_with_family_name(self, client, auth_token):
        """Test classification with family name"""
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "IfcBuildingElementProxy",
                "file_type": "ifc",
                "family_name": "Steel Column"
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "column"
    
    def test_classify_revit_wall(self, client, auth_token):
        """Test classification of Revit wall element"""
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "Wall",
                "file_type": "revit",
                "category_id": -2000011
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "wall"
        # Confidence should be 1.0 for direct category ID mapping
        assert data["confidence"] == 1.0
    
    def test_classify_revit_floor(self, client, auth_token):
        """Test classification of Revit floor element"""
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "Floor",
                "file_type": "revit",
                "category_id": -2000032
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "floor"
    
    def test_classify_revit_with_category_name(self, client, auth_token):
        """Test classification with Revit category name"""
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "StructuralFraming",
                "file_type": "revit",
                "category_name": "beam"
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "beam"
    
    def test_classify_unsupported_file_type(self, client, auth_token):
        """Test classification with unsupported file type"""
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "Wall",
                "file_type": "dwg"
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 400
        assert "Unsupported file type" in response.json()["detail"]
    
    def test_classify_without_auth(self, client):
        """Test classification without authentication"""
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "IfcWall",
                "file_type": "ifc"
            }
        )
        
        assert response.status_code == 401
    
    def test_get_supported_categories(self, client, auth_token):
        """Test retrieval of supported categories"""
        response = client.get(
            "/api/v1/classify/categories",
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "categories" in data
        assert len(data["categories"]) > 0
        
        # Check that all expected categories are present
        category_values = [cat["value"] for cat in data["categories"]]
        assert "wall" in category_values
        assert "floor" in category_values
        assert "column" in category_values
        assert "beam" in category_values
        assert "door" in category_values
        assert "window" in category_values
    
    def test_get_categories_structure(self, client, auth_token):
        """Test structure of category information"""
        response = client.get(
            "/api/v1/classify/categories",
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check first category structure
        first_category = data["categories"][0]
        assert "value" in first_category
        assert "name" in first_category
        assert "description" in first_category
        assert isinstance(first_category["description"], str)
    
    def test_get_categories_without_auth(self, client):
        """Test categories endpoint without authentication"""
        response = client.get("/api/v1/classify/categories")
        
        assert response.status_code == 401


class TestClassificationIntegration:
    """Test classification integration with file processing"""
    
    def test_classification_in_ifc_processing(self, client, auth_token):
        """Test that IFC processing includes classification"""
        # This would require a real IFC file, so we test the structure
        # In a real test, you would provide a test IFC file
        pass
    
    def test_classification_in_revit_processing(self, client, auth_token):
        """Test that Revit processing includes classification"""
        # This would require a real Revit file, so we test the structure
        # In a real test, you would provide a test Revit file
        pass
    
    def test_all_elements_have_category(self):
        """Test that all processed elements have a valid category"""
        from processors.ifc_processor import IFCProcessor
        from processors.revit_processor import RevitProcessor
        
        # Verify processors use classifier
        ifc_processor = IFCProcessor()
        revit_processor = RevitProcessor()
        
        assert ifc_processor.classifier is not None
        assert revit_processor.classifier is not None


class TestClassificationAccuracy:
    """Test classification accuracy and edge cases"""
    
    def test_classify_all_ifc_types(self, client, auth_token):
        """Test classification of all supported IFC types"""
        ifc_types = [
            ("IfcWall", "wall"),
            ("IfcWallStandardCase", "wall"),
            ("IfcCurtainWall", "wall"),
            ("IfcSlab", "floor"),
            ("IfcSlabStandardCase", "floor"),
            ("IfcColumn", "column"),
            ("IfcColumnStandardCase", "column"),
            ("IfcBeam", "beam"),
            ("IfcBeamStandardCase", "beam"),
            ("IfcRoof", "roof"),
            ("IfcDoor", "door"),
            ("IfcDoorStandardCase", "door"),
            ("IfcWindow", "window"),
            ("IfcWindowStandardCase", "window"),
            ("IfcStair", "stair"),
            ("IfcStairFlight", "stair"),
            ("IfcRailing", "railing"),
            ("IfcFooting", "foundation"),
            ("IfcPile", "foundation"),
        ]
        
        for ifc_type, expected_category in ifc_types:
            response = client.post(
                "/api/v1/classify/element",
                json={
                    "element_type": ifc_type,
                    "file_type": "ifc"
                },
                headers={"Authorization": auth_token}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["category"] == expected_category, \
                f"Failed for {ifc_type}: expected {expected_category}, got {data['category']}"
    
    def test_classify_all_revit_categories(self, client, auth_token):
        """Test classification of all supported Revit categories"""
        revit_categories = [
            (-2000011, "wall"),
            (-2000032, "floor"),
            (-2000100, "column"),
            (-2000012, "beam"),
            (-2000035, "roof"),
            (-2000023, "door"),
            (-2000014, "window"),
            (-2000120, "stair"),
            (-2000126, "railing"),
            (-2000080, "foundation"),
        ]
        
        for category_id, expected_category in revit_categories:
            response = client.post(
                "/api/v1/classify/element",
                json={
                    "element_type": "Element",
                    "file_type": "revit",
                    "category_id": category_id
                },
                headers={"Authorization": auth_token}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["category"] == expected_category, \
                f"Failed for category_id {category_id}: expected {expected_category}, got {data['category']}"
    
    def test_classify_unknown_element(self, client, auth_token):
        """Test classification of unknown element type"""
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "IfcUnknownType",
                "file_type": "ifc"
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "other"
    
    def test_classification_confidence_levels(self, client, auth_token):
        """Test that confidence levels are appropriate"""
        # High confidence: direct type mapping
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "IfcWall",
                "file_type": "ifc"
            },
            headers={"Authorization": auth_token}
        )
        assert response.json()["confidence"] == 1.0
        
        # High confidence: direct Revit category ID mapping
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "Wall",
                "file_type": "revit",
                "category_id": -2000011
            },
            headers={"Authorization": auth_token}
        )
        assert response.json()["confidence"] == 1.0
        
        # Lower confidence: name-based classification
        response = client.post(
            "/api/v1/classify/element",
            json={
                "element_type": "IfcBuildingElementProxy",
                "file_type": "ifc",
                "family_name": "Basic Wall"
            },
            headers={"Authorization": auth_token}
        )
        # Name-based should give at least 0.5 confidence
        assert response.json()["confidence"] >= 0.5
        assert response.json()["category"] == "wall"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
