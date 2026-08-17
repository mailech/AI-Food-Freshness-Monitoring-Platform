import os
import pytest
import numpy as np
from PIL import Image
from unittest.mock import patch, MagicMock

from app.core.config import settings
from ml.preprocessing import preprocess_image
from ml.postprocessing import process_prediction
from ml.evaluation import evaluate_metrics
from ml.inference import get_device, check_model_availability, load_global_model
from app.modules.image_analysis.cv_pipeline import FoodFreshnessModel, ModelUnavailableError
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_image_preprocessing_valid_invalid():
    # Write a temporary valid image
    temp_img_path = "test_temp_img.jpg"
    img = Image.new("RGB", (100, 100), color="red")
    img.save(temp_img_path)
    
    try:
        # Valid preprocessing
        tensor = preprocess_image(temp_img_path)
        assert tensor is not None
        assert len(tensor.shape) == 4 # (1, C, H, W)
        
        # Invalid small image dimension check
        small_img_path = "test_small_img.jpg"
        small_img = Image.new("RGB", (10, 10), color="blue")
        small_img.save(small_img_path)
        try:
            with pytest.raises(ValueError):
                preprocess_image(small_img_path)
        finally:
            if os.path.exists(small_img_path):
                os.remove(small_img_path)
                
    finally:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

    # Invalid path
    with pytest.raises(FileNotFoundError):
        preprocess_image("nonexistent_path.png")

def test_prediction_output_parsing():
    # Mock high confidence FRESH
    probs = np.array([0.90, 0.05, 0.02, 0.02, 0.01])
    res = process_prediction(probs, confidence_threshold=0.60)
    assert res["class"] == "FRESH"
    assert res["confidence"] == 0.90
    assert "fresh" in res["status_message"].lower()

    # Mock low confidence leading to UNKNOWN
    probs_low = np.array([0.40, 0.35, 0.15, 0.05, 0.05])
    res_low = process_prediction(probs_low, confidence_threshold=0.60)
    assert res_low["class"] == "UNKNOWN"
    assert "uncertain" in res_low["status_message"].lower()

def test_model_loading_and_unavailability():
    # Force loading a nonexistent path should raise FileNotFoundError or ModelUnavailableError
    with patch("app.core.config.settings.MODEL_PATH", "/nonexistent/path/weights.pt"):
        # Reset loader cache
        import ml.inference.model_loader
        ml.inference.model_loader._GLOBAL_MODEL_INSTANCE = None
        
        available, reason = check_model_availability()
        assert available is False
        assert "not found" in reason.lower() or "not installed" in reason.lower()

        # Ingesting with unavailable model must raise ModelUnavailableError
        model = FoodFreshnessModel(model_path="/nonexistent/path/weights.pt")
        temp_img_path = "test_temp_check.jpg"
        img = Image.new("RGB", (100, 100), color="green")
        img.save(temp_img_path)
        try:
            with pytest.raises(ModelUnavailableError):
                model.analyze_image(temp_img_path)
        finally:
            if os.path.exists(temp_img_path):
                os.remove(temp_img_path)

def test_evaluation_metrics():
    # Mock predictions list
    predictions = [
        np.array([0.9, 0.0, 0.1, 0.0, 0.0]),
        np.array([0.1, 0.8, 0.1, 0.0, 0.0]),
        np.array([0.0, 0.1, 0.7, 0.2, 0.0])
    ]
    ground_truth = [0, 1, 2] # 100% correct
    
    metrics = evaluate_metrics(predictions, ground_truth)
    assert metrics["accuracy"] == 1.0
    assert metrics["precision"] == 1.0
    assert metrics["f1_score"] == 1.0

    # Test unavailable check
    metrics_empty = evaluate_metrics([], [])
    assert "MODEL EVALUATION NOT AVAILABLE" in metrics_empty["status"]

@pytest.mark.asyncio
async def test_model_status_endpoint(client: AsyncClient):
    # Retrieve user authentication header
    await client.post(
        "/api/v1/auth/register",
        json={"email": "status@example.com", "password": "pass123", "full_name": "Status Mgr", "role": "RETAIL_MANAGER"}
    )
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": "status@example.com", "password": "pass123"}
    )
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Retrieve status
    res_status = await client.get("/api/v1/image-analysis/model-status", headers=headers)
    assert res_status.status_code == 200
    data = res_status.json()
    assert "available" in data
    if data["available"]:
        assert data["model_name"] == settings.MODEL_NAME
        assert data["device"] in ("cpu", "cuda")
    else:
        assert "reason" in data
