"""
PyTorch Model Evaluation Pipeline for Food Freshness Classification
Calculates Accuracy, Precision, Recall, F1-score, and Confusion Matrix on held-out test split.
"""
import os
import json
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
from torchvision import datasets, transforms, models
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support

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

def evaluate(
    test_dir: Path,
    model_path: Path,
    output_dir: Path,
    img_size: int = 224,
    batch_size: int = 32
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Evaluating on device: {device}")

    # Load model bundle
    checkpoint = torch.load(str(model_path), map_location=device, weights_only=False)
    state_dict = checkpoint["state_dict"] if "state_dict" in checkpoint else checkpoint
    class_mapping = checkpoint.get("classes", {})
    num_classes = len(class_mapping) if class_mapping else 6

    model = build_model(num_classes)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    val_transform = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    test_dataset = datasets.ImageFolder(str(test_dir), transform=val_transform)
    test_loader = torch.utils.data.DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    class_names = test_dataset.classes
    y_true = []
    y_pred = []
    y_scores = []

    with torch.no_grad():
        for inputs, labels in test_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            probs = torch.softmax(outputs, dim=1)
            _, preds = torch.max(outputs, 1)

            y_true.extend(labels.cpu().numpy())
            y_pred.extend(preds.cpu().numpy())
            y_scores.extend(probs.cpu().numpy())

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    acc = float(accuracy_score(y_true, y_pred))
    precision, recall, f1, support = precision_recall_fscore_support(y_true, y_pred, average=None)
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(y_true, y_pred, average="macro")
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted")

    cm = confusion_matrix(y_true, y_pred)
    report_dict = classification_report(y_true, y_pred, target_names=class_names, output_dict=True)
    report_str = classification_report(y_true, y_pred, target_names=class_names)

    print("\n================== CLASSIFICATION REPORT ==================")
    print(report_str)
    print(f"Test Accuracy: {acc * 100:.2f}%")
    print(f"Macro F1-Score: {macro_f1:.4f}")
    print("===========================================================")

    # Plot & Save Confusion Matrix
    plt.figure(figsize=(8, 6))
    plt.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title("Confusion Matrix - EfficientNetB0 Freshness")
    plt.colorbar()
    tick_marks = np.arange(len(class_names))
    plt.xticks(tick_marks, class_names, rotation=45, ha="right")
    plt.yticks(tick_marks, class_names)

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(
                j, i, format(cm[i, j], "d"),
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black"
            )

    plt.ylabel("True Label")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    cm_path = output_dir / "confusion_matrix.png"
    plt.savefig(str(cm_path), dpi=300)
    plt.close()
    print(f"[+] Confusion matrix plot saved to {cm_path}")

    results = {
        "model": "EfficientNetB0 (PyTorch)",
        "test_samples": int(len(y_true)),
        "accuracy": round(acc, 4),
        "macro_precision": round(float(macro_p), 4),
        "macro_recall": round(float(macro_r), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "per_class": {
            cls: {
                "precision": round(float(precision[i]), 4),
                "recall": round(float(recall[i]), 4),
                "f1": round(float(f1[i]), 4),
                "support": int(support[i])
            } for i, cls in enumerate(class_names)
        },
        "confusion_matrix": cm.tolist(),
        "classification_report": report_dict
    }

    with open(output_dir / "evaluation_results.json", "w") as f:
        json.dump(results, f, indent=2)

    with open(output_dir / "classification_report.txt", "w") as f:
        f.write(report_str)

    print(f"[+] Evaluation results saved to {output_dir / 'evaluation_results.json'}")
    return results

if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent
    t_dir = base_dir / "datasets" / "processed" / "test"
    m_path = base_dir / "app" / "models" / "freshness_model.pth"
    out_dir = base_dir / "app" / "models"
    if t_dir.exists() and m_path.exists():
        evaluate(t_dir, m_path, out_dir)
