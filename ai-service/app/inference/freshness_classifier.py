"""
Freshness Classifier Model Handler (PyTorch EfficientNetB0)
"""
import os
import json
import time
import numpy as np
from typing import Dict, Any, Tuple, Optional
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
from torchvision import models

def build_efficientnet_model(num_classes: int = 6):
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(256, num_classes)
    )
    return model

class FreshnessClassifier:
    def __init__(self, model_path: Optional[str] = None, class_names_path: Optional[str] = None):
        self.model = None
        self.class_names = {}
        self.is_loaded = False
        self.model_path = model_path
        self.class_names_path = class_names_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Default model paths
        base_dir = Path(__file__).resolve().parent.parent / "models"
        if not self.model_path:
            for cand in ["freshness_model.pth", "best_model.pth"]:
                if (base_dir / cand).exists():
                    self.model_path = str(base_dir / cand)
                    break

        if not self.class_names_path:
            cand = base_dir / "class_names.json"
            if cand.exists():
                self.class_names_path = str(cand)

    def load_model(self) -> bool:
        if self.is_loaded and self.model is not None:
            return True

        if not self.model_path or not os.path.exists(self.model_path):
            # Check default path again
            base_dir = Path(__file__).resolve().parent.parent / "models"
            cand = base_dir / "freshness_model.pth"
            if cand.exists():
                self.model_path = str(cand)

        if self.model_path and os.path.exists(self.model_path):
            print(f"[*] Loading Trained Freshness Model (PyTorch) from: {self.model_path}")
            try:
                if self.class_names_path and os.path.exists(self.class_names_path):
                    with open(self.class_names_path, "r") as f:
                        self.class_names = json.load(f)
                else:
                    self.class_names = {
                        "0": "freshapples", "1": "freshbanana", "2": "freshoranges",
                        "3": "rottenapples", "4": "rottenbanana", "5": "rottenoranges"
                    }

                num_classes = len(self.class_names)
                self.model = build_efficientnet_model(num_classes)

                checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=False)
                state_dict = checkpoint["state_dict"] if "state_dict" in checkpoint else checkpoint
                self.model.load_state_dict(state_dict)
                self.model.to(self.device)
                self.model.eval()

                self.is_loaded = True
                print(f"[+] Freshness Model loaded successfully. Classes: {self.class_names}")
                return True
            except Exception as e:
                print(f"[!] Error loading trained PyTorch model: {e}")
                self.is_loaded = False
                return False
        else:
            print(f"[!] No model file found at '{self.model_path}'.")
            return False

    def predict(self, preprocessed_tensor: torch.Tensor) -> Dict[str, Any]:
        """
        Executes model inference on preprocessed tensor (1, 3, 224, 224).
        """
        start_time = time.perf_counter()

        if not self.is_loaded or self.model is None:
            success = self.load_model()
            if not success:
                raise RuntimeError("Freshness model is not loaded. Please train model first.")

        tensor = preprocessed_tensor.to(self.device)

        with torch.no_grad():
            outputs = self.model(tensor)
            probs_tensor = torch.softmax(outputs, dim=1)
            probs = probs_tensor.cpu().numpy()[0]

        inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        raw_probs = {}
        fresh_score_sum = 0.0
        rotten_score_sum = 0.0
        detected_food_type = None

        max_idx = int(np.argmax(probs))
        confidence = float(probs[max_idx])

        for idx, p in enumerate(probs):
            cls_name = self.class_names.get(str(idx), self.class_names.get(idx, f"class_{idx}")).lower()
            raw_probs[cls_name] = round(float(p), 4)

            if "fresh" in cls_name:
                fresh_score_sum += float(p)
                if idx == max_idx:
                    detected_food_type = cls_name.replace("fresh", "").replace("s", "").strip()
            elif "rotten" in cls_name:
                rotten_score_sum += float(p)
                if idx == max_idx:
                    detected_food_type = cls_name.replace("rotten", "").replace("s", "").strip()

        # Aggregate binary fresh vs rotten probabilities
        predicted_label = "fresh" if fresh_score_sum >= rotten_score_sum else "rotten"
        fresh_p = round(fresh_score_sum, 4)
        rotten_p = round(rotten_score_sum, 4)

        return {
            "predicted_class": self.class_names.get(str(max_idx), self.class_names.get(max_idx, "unknown")),
            "predicted_label": predicted_label,
            "detected_food_type": detected_food_type,
            "confidence": round(confidence, 4),
            "fresh_probability": fresh_p,
            "rotten_probability": rotten_p,
            "raw_probabilities": raw_probs,
            "inference_time_ms": inference_time_ms
        }
