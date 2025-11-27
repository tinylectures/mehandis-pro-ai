import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-ml"
    # Check that models are loaded
    assert "models" in data
    assert "anomaly_detector" in data["models"]
    assert "cost_predictor" in data["models"]
    assert "progress_analyzer" in data["models"]
