import unittest
import io
import numpy as np
from PIL import Image
from pathlib import Path
import torch

from app.inference.preprocessing import load_and_preprocess_image, validate_image_bytes
from app.inference.freshness_classifier import FreshnessClassifier
from app.inference.food_classifier import FoodClassifier
from app.inference.shelf_life_predictor import ShelfLifePredictor
from app.inference.predictor import predictor_pipeline

class TestAIServiceInference(unittest.TestCase):
    def setUp(self):
        predictor_pipeline.initialize()

    def test_preprocessing_valid_image(self):
        img = Image.new("RGB", (300, 300), color=(255, 0, 0))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        image_bytes = buf.getvalue()

        tensor = load_and_preprocess_image(image_bytes)
        self.assertEqual(tensor.shape, (1, 3, 224, 224))
        self.assertIsInstance(tensor, torch.Tensor)

    def test_preprocessing_invalid_bytes(self):
        with self.assertRaises(ValueError):
            load_and_preprocess_image(b"not_an_image")

    def test_model_loading_and_prediction(self):
        img = Image.new("RGB", (224, 224), color=(0, 255, 0))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        image_bytes = buf.getvalue()

        result = predictor_pipeline.predict(
            image_bytes=image_bytes,
            food_type="apple",
            category="Fruits"
        )
        self.assertIn("analysis_id", result)
        self.assertIn("freshness", result)
        self.assertIn(result["freshness"]["label"], ["fresh", "rotten"])
        self.assertGreaterEqual(result["freshness_score"], 0)
        self.assertLessEqual(result["freshness_score"], 100)
        self.assertIn(result["freshness_category"], ["Fresh", "Good", "Acceptable", "Near Spoilage", "Spoiled"])

    def test_shelf_life_predictor_status(self):
        predictor = ShelfLifePredictor()
        res = predictor.predict(food_type="apple", freshness_prob=0.95)
        self.assertIn("remaining_days", res)
        self.assertEqual(res["status"], "model_not_available")

    def test_food_classifier_resolution(self):
        classifier = FoodClassifier()
        res = classifier.resolve_food_type("freshapples", "apple")
        self.assertEqual(res["label"], "Apple")
        self.assertEqual(res["category"], "Fruits")

if __name__ == "__main__":
    unittest.main()
