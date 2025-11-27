"""Tests for BIM model upload and processing workflow

This test module validates the upload and processing workflow including:
- File upload endpoint
- Async processing status tracking
- Error handling
- Processing progress updates
"""
import pytest
from fastapi.testclient import TestClient
from main import app, processing_status_store
from models import ProcessingStatus


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def auth_token():
    """Mock authentication token"""
    return "Bearer test_token_1234567890"


@pytest.fixture(autouse=True)
def clear_processing_store():
    """Clear processing status store before each test"""
    processing_status_store.clear()
    yield
    processing_status_store.clear()


class TestUploadWorkflow:
    """Test suite for upload workflow"""
    
    def test_upload_nonexistent_file(self, client, auth_token):
        """Test upload with nonexistent file"""
        response = client.post(
            "/api/v1/upload",
            params={
                "project_id": "project-123",
                "file_path": "/nonexistent/file.ifc",
                "file_type": "ifc"
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_upload_unsupported_file_type(self, client, auth_token):
        """Test upload with unsupported file type"""
        response = client.post(
            "/api/v1/upload",
            params={
                "project_id": "project-123",
                "file_path": "test.dwg",
                "file_type": "dwg"
            },
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 400
        assert "Unsupported file type" in response.json()["detail"]
    
    def test_upload_without_auth(self, client):
        """Test upload without authentication"""
        response = client.post(
            "/api/v1/upload",
            params={
                "project_id": "project-123",
                "file_path": "test.ifc",
                "file_type": "ifc"
            }
        )
        
        assert response.status_code == 401


class TestProcessingStatus:
    """Test suite for processing status tracking"""
    
    def test_get_status_nonexistent_model(self, client, auth_token):
        """Test getting status for nonexistent model"""
        response = client.get(
            "/api/v1/status/nonexistent-model-id",
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_get_status_without_auth(self, client):
        """Test getting status without authentication"""
        response = client.get("/api/v1/status/model-123")
        
        assert response.status_code == 401
    
    def test_status_tracking(self, client, auth_token):
        """Test that status is tracked correctly"""
        # Create a mock processing job
        model_id = "test-model-123"
        processing_status_store[model_id] = {
            "model_id": model_id,
            "project_id": "project-123",
            "file_name": "test.ifc",
            "file_size": 1024,
            "file_type": "ifc",
            "file_path": "/path/to/test.ifc",
            "status": ProcessingStatus.PROCESSING.value,
            "progress": 50,
            "error_message": None,
            "elements_processed": 0,
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        # Get status
        response = client.get(
            f"/api/v1/status/{model_id}",
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["model_id"] == model_id
        assert data["processing_status"] == ProcessingStatus.PROCESSING.value
        assert data["progress"] == 50
        assert data["elements_processed"] == 0


class TestProcessingWorkflow:
    """Test suite for processing workflow"""
    
    def test_process_nonexistent_model(self, client, auth_token):
        """Test processing nonexistent model"""
        response = client.post(
            "/api/v1/process/nonexistent-model-id",
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_process_without_auth(self, client):
        """Test processing without authentication"""
        response = client.post("/api/v1/process/model-123")
        
        assert response.status_code == 401


class TestEndToEndWorkflow:
    """Test end-to-end workflow scenarios"""
    
    def test_workflow_structure(self, client, auth_token):
        """Test that workflow endpoints are available"""
        # Check root endpoint includes new endpoints
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        
        assert "upload_model" in data["endpoints"]
        assert "process_model" in data["endpoints"]
        assert "get_status" in data["endpoints"]
    
    def test_error_handling_in_status(self, client, auth_token):
        """Test error handling in status tracking"""
        # Create a mock processing job with error
        model_id = "error-model-123"
        processing_status_store[model_id] = {
            "model_id": model_id,
            "project_id": "project-123",
            "file_name": "test.ifc",
            "file_size": 1024,
            "file_type": "ifc",
            "file_path": "/path/to/test.ifc",
            "status": ProcessingStatus.ERROR.value,
            "progress": 30,
            "error_message": "Failed to parse IFC file",
            "elements_processed": 0,
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        # Get status
        response = client.get(
            f"/api/v1/status/{model_id}",
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["processing_status"] == ProcessingStatus.ERROR.value
        assert data["error_message"] == "Failed to parse IFC file"
        assert data["progress"] == 30
    
    def test_completed_processing_status(self, client, auth_token):
        """Test status for completed processing"""
        # Create a mock completed processing job
        model_id = "completed-model-123"
        processing_status_store[model_id] = {
            "model_id": model_id,
            "project_id": "project-123",
            "file_name": "test.ifc",
            "file_size": 1024,
            "file_type": "ifc",
            "file_path": "/path/to/test.ifc",
            "status": ProcessingStatus.READY.value,
            "progress": 100,
            "error_message": None,
            "elements_processed": 150,
            "created_at": "2024-01-01T00:00:00Z",
            "completed_at": "2024-01-01T00:05:00Z"
        }
        
        # Get status
        response = client.get(
            f"/api/v1/status/{model_id}",
            headers={"Authorization": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["processing_status"] == ProcessingStatus.READY.value
        assert data["progress"] == 100
        assert data["elements_processed"] == 150
        assert data["completed_at"] is not None


class TestProcessingStatusStore:
    """Test processing status store functionality"""
    
    def test_store_isolation(self):
        """Test that processing store is properly isolated"""
        # Store should be empty at start
        assert len(processing_status_store) == 0
        
        # Add a job
        processing_status_store["test-1"] = {"status": "processing"}
        assert len(processing_status_store) == 1
        
        # Clear store
        processing_status_store.clear()
        assert len(processing_status_store) == 0
    
    def test_multiple_jobs(self):
        """Test handling multiple processing jobs"""
        # Add multiple jobs
        for i in range(5):
            processing_status_store[f"model-{i}"] = {
                "model_id": f"model-{i}",
                "status": ProcessingStatus.PROCESSING.value,
                "progress": i * 20
            }
        
        assert len(processing_status_store) == 5
        
        # Verify each job
        for i in range(5):
            job = processing_status_store[f"model-{i}"]
            assert job["progress"] == i * 20


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
