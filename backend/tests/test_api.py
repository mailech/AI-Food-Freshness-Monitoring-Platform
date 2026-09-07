import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
import io
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.freshness_score_service import freshness_score_service
from app.services.storage_rules_service import storage_rules_service
from app.services.recommendation_engine import recommendation_engine
from app.services.food_service import food_service

class TestBackendAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["database"], "connected")

    def test_foods_crud(self):
        # 1. List foods
        res = self.client.get("/api/foods")
        self.assertEqual(res.status_code, 200)
        initial_count = len(res.json())
        self.assertGreater(initial_count, 0)

        # 2. Create food
        payload = {
            "name": "Test Crisp Apple",
            "category": "Fruits",
            "batch_id": "BATCH-TEST-99",
            "quantity": 10.0,
            "unit": "kg",
            "purchase_date": "2026-09-01",
            "expiry_date": "2026-09-10",
            "storage_temp": 4.0,
            "humidity": 85.0,
            "packaging_type": "Carton",
            "freshness_status": "Fresh",
            "freshness_score": 95
        }
        res_create = self.client.post("/api/foods", json=payload)
        self.assertEqual(res_create.status_code, 200)
        created_food = res_create.json()
        self.assertEqual(created_food["name"], "Test Crisp Apple")
        created_id = created_food["id"]

        # 3. Get food by ID
        res_get = self.client.get(f"/api/foods/{created_id}")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()["id"], created_id)

        # 4. Update food
        res_up = self.client.put(f"/api/foods/{created_id}", json={"quantity": 12.5})
        self.assertEqual(res_up.status_code, 200)
        self.assertEqual(res_up.json()["quantity"], 12.5)

        # 5. Delete food
        res_del = self.client.delete(f"/api/foods/{created_id}")
        self.assertEqual(res_del.status_code, 200)
        self.assertTrue(res_del.json()["success"])

    def test_freshness_scoring_formula(self):
        score, cat, risk = freshness_score_service.calculate_composite_score(
            visual_score=100.0,
            storage_score=90.0,
            shelf_life_days=10,
            base_shelf_life=14,
            storage_duration_days=2
        )
        self.assertGreaterEqual(score, 80)
        self.assertEqual(cat, "Fresh")
        self.assertEqual(risk, "Low")

    def test_storage_rules_service(self):
        score, status, issues = storage_rules_service.calculate_storage_score(
            category="Fruits",
            temperature=18.0, # High temperature
            humidity=50.0     # Low humidity
        )
        self.assertLess(score, 70.0)
        self.assertIn(status, ["Warning", "Critical"])
        self.assertGreater(len(issues), 0)

    def test_recommendation_engine(self):
        recs = recommendation_engine.generate_recommendations(
            food_type="Apple",
            category="Fruits",
            freshness_score=92,
            freshness_category="Fresh",
            spoilage_prob=0.02,
            shelf_life_days=10,
            storage_score=95.0
        )
        self.assertIn("recommendation", recs)
        self.assertIn("storage_recommendation", recs)
        self.assertIn("consumption_recommendation", recs)
        self.assertIn("waste_reduction_recommendation", recs)

    def test_analyze_endpoint(self):
        img = Image.new("RGB", (224, 224), color=(255, 120, 0))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        image_bytes = buf.getvalue()

        response = self.client.post(
            "/api/food/analyze",
            files={"file": ("test_fruit.jpg", image_bytes, "image/jpeg")},
            data={"food_type": "orange", "category": "Fruits"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("food_type", data)
        self.assertIn("freshness_score", data)
        self.assertIn("freshness_category", data)
        self.assertIn("spoilage_probability", data)
        self.assertIn("metrics", data)

if __name__ == "__main__":
    unittest.main()
