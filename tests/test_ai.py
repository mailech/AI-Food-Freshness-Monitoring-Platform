"""
Unit tests for AI Engine components.
Run with: python -m pytest tests/test_ai.py -v
"""

import pytest
import sys
import os
import numpy as np
import torch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ==========================================
# DATASET LOADER TESTS
# ==========================================

class TestDatasetLoader:
    def test_dataset_creates_expected_size(self):
        """Test synthetic dataset creates correct number of samples."""
        from ai.dataset_loader import SyntheticFoodDataset
        dataset = SyntheticFoodDataset(size=50)
        assert len(dataset) == 50

    def test_dataset_returns_image_and_labels(self):
        """Test each sample contains image tensor and label dict."""
        from ai.dataset_loader import SyntheticFoodDataset
        dataset = SyntheticFoodDataset(size=10)
        img, labels = dataset[0]

        assert isinstance(img, torch.Tensor)
        assert img.shape == (3, 128, 128)
        assert img.dtype == torch.float32

        assert "category" in labels
        assert "is_spoiled" in labels
        assert "freshness_score" in labels
        assert "shelf_life" in labels
        assert "env_factors" in labels

    def test_image_values_normalized(self):
        """Test pixel values are normalized to 0-1 range."""
        from ai.dataset_loader import SyntheticFoodDataset
        dataset = SyntheticFoodDataset(size=5)
        img, _ = dataset[0]
        assert float(img.min()) >= 0.0
        assert float(img.max()) <= 1.0

    def test_freshness_score_valid_range(self):
        """Test freshness scores are within 0-100 range."""
        from ai.dataset_loader import SyntheticFoodDataset
        dataset = SyntheticFoodDataset(size=50)
        for i in range(len(dataset)):
            _, labels = dataset[i]
            score = float(labels["freshness_score"])
            assert 0 <= score <= 100, f"Freshness score out of range: {score}"

    def test_category_labels_valid(self):
        """Test category indices are within valid class count."""
        from ai.dataset_loader import SyntheticFoodDataset, CATEGORIES
        dataset = SyntheticFoodDataset(size=30)
        for i in range(len(dataset)):
            _, labels = dataset[i]
            cat_idx = int(labels["category"])
            assert 0 <= cat_idx < len(CATEGORIES), f"Category index out of range: {cat_idx}"

    def test_spoilage_label_binary(self):
        """Test spoilage labels are binary (0 or 1)."""
        from ai.dataset_loader import SyntheticFoodDataset
        dataset = SyntheticFoodDataset(size=20)
        for i in range(len(dataset)):
            _, labels = dataset[i]
            spoil = int(labels["is_spoiled"])
            assert spoil in [0, 1]


# ==========================================
# PREPROCESSING TESTS
# ==========================================

class TestPreprocessing:
    def _make_bgr_image(self, h=128, w=128) -> np.ndarray:
        """Create a random BGR image for testing."""
        return np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)

    def test_color_analysis_returns_float(self):
        """Test color analysis returns a float score."""
        from ai.preprocess import analyze_color
        img = self._make_bgr_image()
        score = analyze_color(img, "Fruits")
        assert isinstance(score, float)

    def test_color_score_range(self):
        """Test color score is bounded within 0-100."""
        from ai.preprocess import analyze_color
        img = self._make_bgr_image()
        for category in ["Fruits", "Vegetables", "Meat", "Seafood", "Milk"]:
            score = analyze_color(img, category)
            assert 0.0 <= score <= 100.0, f"Color score out of range for {category}: {score}"

    def test_texture_analysis_returns_float(self):
        """Test texture analysis returns a float score."""
        from ai.preprocess import analyze_texture
        img = self._make_bgr_image()
        score = analyze_texture(img)
        assert isinstance(score, float)

    def test_texture_score_range(self):
        """Test texture score is bounded within 0-100."""
        from ai.preprocess import analyze_texture
        img = self._make_bgr_image()
        score = analyze_texture(img)
        assert 0.0 <= score <= 100.0, f"Texture score out of range: {score}"

    def test_mold_detection_returns_bool_and_float(self):
        """Test mold detection returns correct types."""
        from ai.preprocess import detect_mold_patches
        img = self._make_bgr_image()
        is_mold, prob = detect_mold_patches(img)
        assert isinstance(is_mold, bool)
        assert isinstance(prob, float)
        assert 0.0 <= prob <= 1.0

    def test_bruise_detection_returns_bool_and_float(self):
        """Test bruise detection returns correct types."""
        from ai.preprocess import detect_bruises
        img = self._make_bgr_image()
        is_bruised, score = detect_bruises(img, "Fruits")
        assert isinstance(is_bruised, bool)
        assert isinstance(score, float)

    def test_cnn_preprocessing_output_shape(self):
        """Test CNN preprocessing returns correct channel-first shape."""
        from ai.preprocess import preprocess_image_for_cnn
        img = self._make_bgr_image()
        output = preprocess_image_for_cnn(img, target_size=(128, 128))
        assert output.shape == (3, 128, 128)
        assert output.dtype == np.float32
        assert output.min() >= 0.0
        assert output.max() <= 1.0


# ==========================================
# MODEL ARCHITECTURE TESTS
# ==========================================

class TestModelArchitectures:
    def test_cnn_forward_pass(self):
        """Test FoodFreshnessCNN forward pass with batch of 4 images."""
        from ai.models import FoodFreshnessCNN
        model = FoodFreshnessCNN(num_categories=10)
        model.eval()

        batch = torch.randn(4, 3, 128, 128)  # 4 images, 3 channels, 128x128
        with torch.no_grad():
            cat_logits, spoil_logits, features = model(batch)

        assert cat_logits.shape == (4, 10), f"Expected (4, 10), got {cat_logits.shape}"
        assert spoil_logits.shape == (4, 2), f"Expected (4, 2), got {spoil_logits.shape}"
        assert features.shape == (4, 64), f"Expected (4, 64), got {features.shape}"

    def test_cnn_output_no_nan(self):
        """Test CNN outputs contain no NaN or Inf values."""
        from ai.models import FoodFreshnessCNN
        model = FoodFreshnessCNN()
        model.eval()

        batch = torch.randn(2, 3, 128, 128)
        with torch.no_grad():
            cat_logits, spoil_logits, features = model(batch)

        assert not torch.isnan(cat_logits).any(), "NaN in category logits"
        assert not torch.isinf(cat_logits).any(), "Inf in category logits"
        assert not torch.isnan(spoil_logits).any(), "NaN in spoilage logits"

    def test_regressor_forward_pass(self):
        """Test ShelfLifeRegressor returns positive predictions."""
        from ai.models import ShelfLifeRegressor
        model = ShelfLifeRegressor(input_dim=69)
        model.eval()

        features = torch.randn(4, 64)
        env_factors = torch.randn(4, 2)
        cv_scores = torch.randn(4, 3)

        with torch.no_grad():
            output = model(features, env_factors, cv_scores)

        assert output.shape == (4, 1), f"Expected (4, 1), got {output.shape}"
        # ReLU ensures non-negative
        assert (output >= 0).all(), "Regressor produced negative shelf-life values"

    def test_softmax_probabilities_sum_to_one(self):
        """Test softmax of CNN logits sums to 1 for each sample."""
        from ai.models import FoodFreshnessCNN
        model = FoodFreshnessCNN()
        model.eval()

        batch = torch.randn(3, 3, 128, 128)
        with torch.no_grad():
            cat_logits, _, _ = model(batch)
            probs = torch.softmax(cat_logits, dim=1)

        sums = probs.sum(dim=1)
        for i, s in enumerate(sums):
            assert abs(float(s) - 1.0) < 1e-5, f"Probabilities don't sum to 1 for sample {i}: {float(s)}"
