"""Tests for BIM Processing Service main application"""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "bim-processor"
    assert "version" in data


def test_root_endpoint():
    """Test root endpoint returns service information"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert "endpoints" in data


def test_missing_auth_header():
    """Test that protected endpoints require authentication"""
    # This will be used when we add protected endpoints
    pass


def test_invalid_auth_header_format():
    """Test that invalid auth header format is rejected"""
    # This will be used when we add protected endpoints
    pass


def test_process_revit_endpoint_missing_auth():
    """Test that Revit processing endpoint requires authentication"""
    response = client.post(
        "/api/v1/process/revit",
        params={"file_path": "test.rvt", "model_id": "model-123"}
    )
    assert response.status_code == 401


def test_process_revit_endpoint_invalid_file():
    """Test that Revit processing endpoint validates file"""
    response = client.post(
        "/api/v1/process/revit",
        params={"file_path": "/nonexistent/file.rvt", "model_id": "model-123"},
        headers={"Authorization": "Bearer valid_token_here_12345"}
    )
    assert response.status_code == 400
    data = response.json()
    assert "Invalid Revit file" in data["detail"]
