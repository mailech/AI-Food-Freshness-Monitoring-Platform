import os
import json
import torch
import torch.nn as nn
from PIL import Image, ImageEnhance
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional

from app.core.config import settings
from app.ml.vision_engine import ComputerVisionFeatureExtractor
from app.ml.scoring_engine import FreshnessScoringEngine
from app.ml.shelf_life_engine import KineticShelfLifeEngine

# SEBlock and FoodFreshnessCNN model architecture for inference
class SEBlock(nn.Module):
    def __init__(self, channels, reduction=8):
        super().__init__()
        self.fc = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(channels, channels // reduction),
            nn.ReLU(inplace=True),
            nn.Linear(channels // reduction, channels),
            nn.Sigmoid()
        )
    def forward(self, x):
        b, c, _, _ = x.shape
        w = self.fc(x).view(b, c, 1, 1)
        return x * w

class ResidualConvBlock(nn.Module):
    def __init__(self, in_c, out_c, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_c, out_c, 3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_c)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv2d(out_c, out_c, 3, stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_c)
        self.se = SEBlock(out_c)
        
        self.shortcut = nn.Sequential()
        if stride != 1 or in_c != out_c:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_c, out_c, 1, stride=stride, bias=False),
                nn.BatchNorm2d(out_c)
            )
            
    def forward(self, x):
        residual = self.shortcut(x)
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = self.se(out)
        out += residual
        return self.relu(out)

class FoodFreshnessCNN(nn.Module):
    def __init__(self, num_classes=6):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True)
        )
        self.layer1 = ResidualConvBlock(32, 64, stride=2)
        self.layer2 = ResidualConvBlock(64, 128, stride=2)
        self.layer3 = ResidualConvBlock(128, 256, stride=2)
        self.layer4 = ResidualConvBlock(256, 384, stride=2)
        
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.3),
            nn.Linear(384, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )
        
    def forward(self, x):
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.pool(x)
        x = self.classifier(x)
        return x

class MLInferenceEngine:
    _instance = None
    
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.classes = ["freshapples", "freshbanana", "freshoranges", "rottenapples", "rottenbanana", "rottenoranges"]
        self.load_model()
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
        
    def load_model(self):
        labels_file = settings.ML_MODEL_DIR / "labels.json"
        weights_file = settings.ML_MODEL_DIR / "fruit_freshness_model.pt"
        
        if labels_file.exists():
            try:
                with open(labels_file, "r") as f:
                    data = json.load(f)
                    self.classes = data.get("classes", self.classes)
            except Exception:
                pass
                
        self.model = FoodFreshnessCNN(num_classes=len(self.classes)).to(self.device)
        
        if weights_file.exists():
            try:
                self.model.load_state_dict(torch.load(weights_file, map_location=self.device))
                print(f"Loaded trained PyTorch weights from {weights_file}")
            except Exception as e:
                print(f"Notice: Initializing model weights ({e})")
        self.model.eval()

    def preprocess_image(self, pil_img: Image.Image) -> torch.Tensor:
        if pil_img.mode != 'RGB':
            pil_img = pil_img.convert('RGB')
        pil_img = pil_img.resize((224, 224))
        arr = np.array(pil_img, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        arr = (arr - mean) / std
        arr = np.transpose(arr, (2, 0, 1))
        tensor = torch.from_numpy(arr).unsqueeze(0).to(self.device)
        return tensor

    def predict(
        self,
        image_input: Any,
        category: str = "Fruits",
        storage_temperature: Optional[float] = 3.0,
        storage_humidity: Optional[float] = 90.0,
        packaging_type: str = "Unpackaged",
        days_stored: int = 0
    ) -> Dict[str, Any]:
        # 1. Load image into PIL and OpenCV
        if isinstance(image_input, str) or isinstance(image_input, Path):
            pil_img = Image.open(image_input)
            cv_features = ComputerVisionFeatureExtractor.analyze_image(str(image_input))
        else:
            pil_img = Image.open(image_input)
            image_input.seek(0)
            cv_features = ComputerVisionFeatureExtractor.analyze_image(image_input)
            
        # 2. Deep Learning Classification
        tensor = self.preprocess_image(pil_img)
        with torch.no_grad():
            outputs = self.model(tensor)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()[0]
            pred_idx = int(np.argmax(probs))
            confidence = float(probs[pred_idx])
            pred_class = self.classes[pred_idx]
            
        is_fresh_class = 'fresh' in pred_class.lower()
        
        # 3. Visual condition score synthesis
        base_visual = cv_features['visual_condition_score']
        if not is_fresh_class:
            base_visual = min(base_visual, 30.0)
            cv_features['spoilage_probability'] = max(cv_features['spoilage_probability'], 0.75)
        else:
            cv_features['spoilage_probability'] = min(cv_features['spoilage_probability'], 0.20)
            
        # 4. Kinetic Shelf-Life Prediction
        shelf_life_res = KineticShelfLifeEngine.predict_shelf_life(
            category=category,
            current_freshness_score=base_visual,
            storage_temperature=storage_temperature or 3.0,
            storage_humidity=storage_humidity or 90.0,
            packaging_type=packaging_type,
            days_stored=days_stored
        )
        
        # 5. Exact 4-factor Weighted Freshness Scoring Model
        scoring_res = FreshnessScoringEngine.compute_weighted_freshness_score(
            visual_score=base_visual,
            category=category,
            temperature=storage_temperature,
            humidity=storage_humidity,
            remaining_shelf_life_days=shelf_life_res['adjusted_shelf_life_days'],
            days_stored=days_stored
        )
        
        return {
            'predicted_class': pred_class,
            'confidence': round(confidence, 4),
            'visual_condition_score': scoring_res['visual_condition_score'],
            'color_score': cv_features['color_score'],
            'texture_score': cv_features['texture_score'],
            'mold_detected': cv_features['mold_detected'],
            'bruising_detected': cv_features['bruising_detected'],
            'physical_damage_detected': cv_features['physical_damage_detected'],
            'spoilage_probability': cv_features['spoilage_probability'],
            'freshness_category': scoring_res['freshness_category'],
            'freshness_score': scoring_res['final_freshness_score'],
            'scoring_breakdown': scoring_res,
            'predicted_shelf_life_days': shelf_life_res['adjusted_shelf_life_days'],
            'expiry_forecast_date': shelf_life_res['predicted_expiry_date'],
            'shelf_life_details': shelf_life_res
        }
