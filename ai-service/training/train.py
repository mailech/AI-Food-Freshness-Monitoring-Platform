"""
PyTorch Training Pipeline for Food Freshness Classification
Uses Pretrained EfficientNetB0 with Transfer Learning for state-of-the-art accuracy.
"""
import os
import time
import json
import random
import copy
import numpy as np
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def get_transforms(img_size: int = 224):
    train_transform = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    return train_transform, val_transform

def build_model(num_classes: int):
    # Load pretrained EfficientNet-B0
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
    
    # Freeze feature extractor
    for param in model.features.parameters():
        param.requires_grad = False

    # Replace classifier head (all non-inplace)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=False),
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=False),
        nn.Dropout(p=0.2, inplace=False),
        nn.Linear(256, num_classes)
    )
    return model

def train_model(
    dataset_dir: Path,
    output_dir: Path,
    epochs: int = 5,
    batch_size: int = 32,
    lr: float = 1e-3
):
    set_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Training on device: {device}")
    output_dir.mkdir(parents=True, exist_ok=True)

    train_tf, val_tf = get_transforms()

    train_dataset = datasets.ImageFolder(str(dataset_dir / "train"), transform=train_tf)
    val_dataset = datasets.ImageFolder(str(dataset_dir / "val"), transform=val_tf)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    class_names = train_dataset.classes
    num_classes = len(class_names)
    print(f"[+] Loaded {len(train_dataset)} training samples, {len(val_dataset)} validation samples across {num_classes} classes: {class_names}")

    # Save class names JSON
    class_mapping = {str(i): name for i, name in enumerate(class_names)}
    with open(output_dir / "class_names.json", "w") as f:
        json.dump(class_mapping, f, indent=2)

    model = build_model(num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.3, patience=2)

    best_val_acc = 0.0
    best_model_wts = copy.deepcopy(model.state_dict())
    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    print("\n--- Starting Training Loop ---")
    start_time = time.time()

    for epoch in range(epochs):
        ep_start = time.time()
        # Train phase
        model.train()
        running_loss = 0.0
        running_corrects = 0

        for inputs, labels in train_loader:
            inputs = inputs.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            _, preds = torch.max(outputs, 1)

            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)
            running_corrects += torch.sum(preds == labels.data)

        epoch_train_loss = running_loss / len(train_dataset)
        epoch_train_acc = running_corrects.double().item() / len(train_dataset)

        # Val phase
        model.eval()
        val_loss = 0.0
        val_corrects = 0

        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs = inputs.to(device)
                labels = labels.to(device)

                outputs = model(inputs)
                loss = criterion(outputs, labels)
                _, preds = torch.max(outputs, 1)

                val_loss += loss.item() * inputs.size(0)
                val_corrects += torch.sum(preds == labels.data)

        epoch_val_loss = val_loss / len(val_dataset)
        epoch_val_acc = val_corrects.double().item() / len(val_dataset)
        scheduler.step(epoch_val_loss)

        history["train_loss"].append(epoch_train_loss)
        history["train_acc"].append(epoch_train_acc)
        history["val_loss"].append(epoch_val_loss)
        history["val_acc"].append(epoch_val_acc)

        ep_duration = time.time() - ep_start
        print(f"Epoch [{epoch+1}/{epochs}] ({ep_duration:.1f}s) - Train Loss: {epoch_train_loss:.4f}, Train Acc: {epoch_train_acc*100:.2f}% | Val Loss: {epoch_val_loss:.4f}, Val Acc: {epoch_val_acc*100:.2f}%")

        if epoch_val_acc > best_val_acc:
            best_val_acc = epoch_val_acc
            best_model_wts = copy.deepcopy(model.state_dict())
            torch.save(best_model_wts, str(output_dir / "best_model.pth"))
            print(f"  [+] Saved new best model checkpoint (Val Acc: {best_val_acc*100:.2f}%)")

    total_time = time.time() - start_time
    print(f"\n[+] Training complete in {total_time // 60:.0f}m {total_time % 60:.0f}s. Best Val Acc: {best_val_acc*100:.2f}%")

    # Load best weights and save final model
    model.load_state_dict(best_model_wts)
    final_pth = output_dir / "freshness_model.pth"
    torch.save({
        "state_dict": model.state_dict(),
        "classes": class_mapping,
        "num_classes": num_classes,
        "best_val_acc": best_val_acc
    }, str(final_pth))
    print(f"[+] Final production model bundle saved to: {final_pth}")

    # Training metadata
    with open(output_dir / "training_metadata.json", "w") as f:
        json.dump({
            "architecture": "EfficientNetB0 Transfer Learning (PyTorch)",
            "num_classes": num_classes,
            "classes": class_mapping,
            "epochs": epochs,
            "final_val_acc": round(best_val_acc, 4),
            "training_time_seconds": round(total_time, 2)
        }, f, indent=2)

    return model, class_mapping

if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent
    ds_dir = base_dir / "datasets" / "processed"
    out_dir = base_dir / "app" / "models"
    if (ds_dir / "train").exists():
        train_model(ds_dir, out_dir, epochs=5)
