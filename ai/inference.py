import os
import torch
import numpy as np
from PIL import Image
import io

from .preprocess import (
    load_image_from_bytes,
    analyze_color,
    analyze_texture,
    detect_mold_patches,
    detect_bruises,
    preprocess_image_for_cnn
)
from .models import FoodFreshnessCNN, ShelfLifeRegressor
from .dataset_loader import CATEGORIES, IDX_TO_CAT

class AIInferencePipeline:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Paths
        base_dir = os.path.dirname(os.path.dirname(__file__))
        self.models_dir = os.path.join(base_dir, 'models')
        self.cnn_path = os.path.join(self.models_dir, 'food_freshness_cnn.pth')
        self.regressor_path = os.path.join(self.models_dir, 'shelf_life_regressor.pth')
        
        self.cnn = None
        self.regressor = None
        
        # Load models
        self.load_models()

    def load_models(self):
        """
        Loads models if the weight files exist, else initial models will be loaded.
        """
        # Initialize architecture
        self.cnn = FoodFreshnessCNN().to(self.device)
        self.regressor = ShelfLifeRegressor().to(self.device)
        
        if os.path.exists(self.cnn_path) and os.path.exists(self.regressor_path):
            try:
                self.cnn.load_state_dict(torch.load(self.cnn_path, map_location=self.device))
                self.regressor.load_state_dict(torch.load(self.regressor_path, map_location=self.device))
                print("AI inference models loaded successfully.")
            except Exception as e:
                print(f"Error loading model weights: {e}. Running with uninitialized weights.")
        else:
            print("Model weights not found. Running with uninitialized weights. Please train models.")
            
        self.cnn.eval()
        self.regressor.eval()

    def run_inference(self, image_bytes: bytes, temp: float = 20.0, humidity: float = 60.0) -> dict:
        """
        Runs full computer vision + deep learning inference on input image bytes.
        """
        # 1. Load image in OpenCV
        img = load_image_from_bytes(image_bytes)
        if img is None:
            raise ValueError("Failed to decode image bytes. Unsupported or corrupted file.")
            
        # 2. Extract CV features
        # Preliminary categorization from CNN is needed to specialize color analysis,
        # but since CNN depends on image, let's first run CNN step, then run CV specialized scores.
        
        # Prep for CNN
        cnn_input = preprocess_image_for_cnn(img)
        cnn_tensor = torch.tensor(cnn_input, dtype=torch.float32).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            cat_logits, spoil_logits, extracted_features = self.cnn(cnn_tensor)
            
            # Predict category
            cat_idx = int(cat_logits.argmax(dim=1).item())
            predicted_category = IDX_TO_CAT[cat_idx]
            
            # Predict spoilage probability (using softmax)
            spoil_probs = torch.softmax(spoil_logits, dim=1)[0]
            spoilage_probability = float(spoil_probs[1].item())
            
        # 3. Analyze OpenCV metrics using predicted category
        color_score = analyze_color(img, predicted_category)
        texture_score = analyze_texture(img)
        mold_detected, mold_prob = detect_mold_patches(img)
        bruise_detected, bruise_score = detect_bruises(img, predicted_category)
        
        # 4. Predict shelf-life regression
        env_factors_tensor = torch.tensor([[temp, humidity]], dtype=torch.float32).to(self.device)
        cv_scores_tensor = torch.tensor([[color_score, texture_score, mold_prob]], dtype=torch.float32).to(self.device)
        
        with torch.no_grad():
            pred_shelf_life_days = self.regressor(extracted_features, env_factors_tensor, cv_scores_tensor).item()
            
        # 5. Composite Freshness Score Calculation
        # Let's weigh CNN features + CV metrics
        # Base freshness score derived from Spoilage probability
        deep_learning_score = (1.0 - spoilage_probability) * 100.0
        
        # Modify based on CV features
        composite_score = (deep_learning_score * 0.4) + (color_score * 0.3) + (texture_score * 0.3)
        
        # Penalize for defects
        if mold_detected:
            # Mold drops score significantly
            composite_score = min(composite_score, 20.0)
        if bruise_detected:
            composite_score -= (bruise_score * 0.15)
            
        composite_score = max(0, min(100, int(composite_score)))
        
        # Double check status
        if mold_detected or spoilage_probability > 0.6 or composite_score < 40:
            status = "Spoiled"
        elif composite_score < 70:
            status = "Decaying"
        else:
            status = "Fresh"
            
        # Calculate remaining shelf life based on base category average shelf-life limits
        # standard limits:
        base_life_limits = {
            'Fruits': 10.0, 'Vegetables': 7.0, 'Meat': 4.0, 'Seafood': 3.0, 'Milk': 7.0,
            'Bakery': 5.0, 'Packaged Foods': 180.0, 'Beverages': 90.0, 'Eggs': 21.0, 'Frozen Foods': 120.0
        }
        max_life = base_life_limits.get(predicted_category, 7.0)
        remaining_days = min(max_life, float(pred_shelf_life_days))
        
        # Force remaining shelf life to 0 if status is spoiled
        if status == "Spoiled":
            remaining_days = 0.0
            
        return {
            "category": predicted_category,
            "status": status,
            "freshness_score": composite_score,
            "spoilage_probability": round(spoilage_probability, 4),
            "remaining_shelf_life_days": round(remaining_days, 2),
            "cv_metrics": {
                "color_score": round(color_score, 2),
                "texture_score": round(texture_score, 2),
                "mold_detected": mold_detected,
                "mold_probability": round(mold_prob, 4),
                "bruise_detected": bruise_detected,
                "bruise_score": round(bruise_score, 2)
            }
        }
