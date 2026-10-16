import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.ml.inference import CLASS_NAMES, predict_freshness
from app.ml.model import get_freshness_model, resolve_model_path
from app.ml.preprocessing import ImageValidationError, preprocess_image
from app.services.scan_service import analyze_food_scan

client = TestClient(app)


def create_test_image(color=(220, 40, 40), size=(300, 300), format_name="JPEG") -> bytes:
    """Helper to create test image bytes of specified color and format."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format_name)
    return buf.getvalue()


def test_model_loading_and_architecture():
    """Verify that the food freshness CNN model loads safely as a singleton

    with the expected 6-class output and layers.
    """
    model_path = resolve_model_path()
    assert model_path.exists(), f"Model file must exist at {model_path}"

    model = get_freshness_model()
    assert model is not None
    # Output layer must have 6 units corresponding to the 6 classes
    assert model.output_shape[-1] == 6
    assert len(CLASS_NAMES) == 6


def test_preprocessing_pipeline():
    """Verify image preprocessing resizes to 224x224, converts to float32, and normalizes to [0, 1]."""
    raw_bytes = create_test_image(color=(50, 180, 50), size=(640, 480))
    tensor = preprocess_image(raw_bytes)

    assert tensor.shape == (1, 224, 224, 3)
    assert tensor.dtype.name == "float32"
    assert tensor.min() >= 0.0
    assert tensor.max() <= 1.0


def test_preprocessing_corrupted_image_handling():
    """Verify ImageValidationError is raised when passing corrupted image bytes."""
    corrupted_bytes = b"GIF89a;not_a_valid_image_payload"
    with pytest.raises(ImageValidationError):
        preprocess_image(corrupted_bytes)

    empty_bytes = b""
    with pytest.raises(ImageValidationError):
        preprocess_image(empty_bytes)


def test_inference_class_names_and_structure():
    """Verify inference output dictionary structure and valid probability distribution."""
    test_bytes = create_test_image(color=(255, 225, 50))  # Yellowish tone
    result = predict_freshness(test_bytes)

    assert "food" in result
    assert result["food"] in ["Apple", "Banana", "Orange"]
    assert "status" in result
    assert result["status"] in ["Fresh", "Rotten"]
    assert "confidence" in result
    assert 0.0 <= result["confidence"] <= 100.0
    assert "predicted_class" in result
    assert result["predicted_class"] in CLASS_NAMES
    assert "probabilities" in result

    # Check softmax probabilities sum to ~1.0
    prob_sum = sum(result["probabilities"].values())
    assert abs(prob_sum - 1.0) < 0.01


def test_scan_service_integration():
    """Verify that scan_service combines CNN inference with Q10 shelf-life math."""
    test_bytes = create_test_image(color=(255, 140, 0))  # Orange tone

    result = analyze_food_scan(
        image_input=test_bytes,
        storage_temperature=4.0,
        humidity=85.0,
        selected_food="Orange"
    )

    assert "prediction" in result
    assert "analysis" in result

    pred = result["prediction"]
    analysis = result["analysis"]

    assert pred["food"] in ["Apple", "Banana", "Orange"]
    assert pred["status"] in ["Fresh", "Rotten"]
    assert 0.0 <= pred["confidence"] <= 100.0

    assert 0.0 <= analysis["freshness_score"] <= 100.0
    assert analysis["freshness_status"] in ["Fresh", "Good", "Acceptable", "Near Spoilage", "Spoiled"]
    assert analysis["spoilage_risk"] in ["Low", "Medium", "High"]
    assert analysis["estimated_expiry_days"] >= 0
    assert "storage_tip" in analysis
    assert "consumption_suggestion" in analysis


def test_api_scan_supported_foods():
    """Verify GET /scan/supported-foods endpoint returns the 3 supported foods and 6 classes."""
    res = client.get("/scan/supported-foods")
    assert res.status_code == 200
    data = res.json()
    assert data["supported_foods"] == ["Apple", "Banana", "Orange"]
    assert data["classes"] == CLASS_NAMES


def test_api_scan_model_status():
    """Verify GET /scan/model-status returns ready status."""
    res = client.get("/scan/model-status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["classes_count"] == 6
    assert data["supported_foods"] == ["Apple", "Banana", "Orange"]


def test_api_scan_analyze_success():
    """Verify POST /scan/analyze endpoint with a valid uploaded image file."""
    img_bytes = create_test_image(color=(210, 30, 30), size=(250, 250), format_name="PNG")

    files = {
        "image": ("fresh_apple_test.png", img_bytes, "image/png")
    }
    data = {
        "storage_temperature": "4.0",
        "humidity": "85.0",
        "selected_food": "Apple"
    }

    res = client.post("/scan/analyze", files=files, data=data)
    assert res.status_code == 200
    payload = res.json()

    assert "prediction" in payload
    assert "analysis" in payload
    assert payload["prediction"]["food"] in ["Apple", "Banana", "Orange"]
    assert payload["prediction"]["status"] in ["Fresh", "Rotten"]
    assert payload["analysis"]["storage_temperature"] == 4.0
    assert payload["analysis"]["humidity"] == 85.0


def test_api_scan_analyze_invalid_file_handling():
    """Verify POST /scan/analyze returns 400 for bad or corrupted uploads."""
    # Corrupted / invalid image bytes
    bad_files = {
        "image": ("corrupted.jpg", b"bad_corrupted_image_content", "image/jpeg")
    }
    res = client.post("/scan/analyze", files=bad_files)
    assert res.status_code == 400
    assert "Invalid or corrupted image" in res.json()["detail"]

    # Unsupported content-type
    txt_files = {
        "image": ("notes.txt", b"plain text notes", "text/plain")
    }
    res2 = client.post("/scan/analyze", files=txt_files)
    assert res2.status_code == 400
    assert "Unsupported file format" in res2.json()["detail"]


def test_q10_temperature_variation_in_scan():
    """Verify that changing temperature affects shelf life according to Q10 physics in scan analysis."""
    img_bytes = create_test_image(color=(200, 200, 50))

    # Test at cold storage 4°C
    res_cold = client.post(
        "/scan/analyze",
        files={"image": ("test.jpg", img_bytes, "image/jpeg")},
        data={"storage_temperature": "4.0", "humidity": "85.0", "selected_food": "Apple"}
    )
    # Test at warm storage 24°C
    res_warm = client.post(
        "/scan/analyze",
        files={"image": ("test.jpg", img_bytes, "image/jpeg")},
        data={"storage_temperature": "24.0", "humidity": "85.0", "selected_food": "Apple"}
    )

    assert res_cold.status_code == 200
    assert res_warm.status_code == 200

    data_cold = res_cold.json()["analysis"]
    data_warm = res_warm.json()["analysis"]

    if data_cold["freshness_status"] in ["Fresh", "Good"]:
        # Cold storage should result in longer shelf-life than warm storage
        assert data_cold["estimated_expiry_days"] >= data_warm["estimated_expiry_days"]
