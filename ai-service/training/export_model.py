"""
PyTorch Model Export & Verification Utility
"""
import shutil
import json
import torch
from pathlib import Path
from torchvision import models
import torch.nn as nn

def build_model(num_classes: int):
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=False),
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=False),
        nn.Dropout(p=0.2, inplace=False),
        nn.Linear(256, num_classes)
    )
    return model

def export_and_verify(models_dir: Path):
    best_model = models_dir / "best_model.pth"
    final_model = models_dir / "freshness_model.pth"
    class_names_file = models_dir / "class_names.json"

    if best_model.exists() and not final_model.exists():
        shutil.copy2(best_model, final_model)
        print(f"[+] Copied best checkpoint to production model path: {final_model}")

    if not final_model.exists() and best_model.exists():
        shutil.copy2(best_model, final_model)

    print("[*] Verifying production PyTorch model loading...")
    with open(class_names_file, "r") as f:
        class_mapping = json.load(f)

    num_classes = len(class_mapping)
    model = build_model(num_classes)
    checkpoint = torch.load(str(final_model), map_location="cpu", weights_only=False)
    state_dict = checkpoint["state_dict"] if "state_dict" in checkpoint else checkpoint
    model.load_state_dict(state_dict)
    model.eval()

    # Dummy tensor inference verification
    dummy = torch.randn(1, 3, 224, 224)
    with torch.no_grad():
        out = model(dummy)
        probs = torch.softmax(out, dim=1).numpy()[0]

    print(f"[+] Model verified! Output tensor shape: {out.shape}, Output probabilities: {probs}")
    print(f"[+] Verified classes: {class_mapping}")
    return True

if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent / "app" / "models"
    export_and_verify(base_dir)
