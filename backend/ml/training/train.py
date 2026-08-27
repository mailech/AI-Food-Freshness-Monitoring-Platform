import os
import sys
import argparse
import logging
from typing import Tuple

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader
    from torchvision import datasets, transforms
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

# Add parent directories to path to allow importing ml package
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ml.inference.freshness_model import FoodFreshnessCNN

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ml_train")

def parse_args():
    parser = argparse.ArgumentParser(description="FreshLens Custom CNN Training Pipeline")
    parser.add_argument("--data-dir", type=str, required=True, help="Path to labeled dataset root directory containing train/ and val/ subfolders")
    parser.add_argument("--output-path", type=str, default="../models/freshness_model.pt", help="Path to save the best trained PyTorch state-dict checkpoint")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="DataLoader batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Optimizer learning rate")
    parser.add_argument("--device", type=str, default="cuda" if (HAS_TORCH and torch.cuda.is_available()) else "cpu", help="Device target ('cpu' or 'cuda')")
    return parser.parse_args()

def get_transforms() -> Tuple[transforms.Compose, transforms.Compose]:
    """
    Standard preprocessing and data augmentations matching ImageNet normalization.
    """
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return train_transform, val_transform

def train_model(data_dir: str, output_path: str, epochs: int, batch_size: int, lr: float, device: str):
    if not HAS_TORCH:
        logger.error("PyTorch and Torchvision libraries are required for training. Please run: pip install torch torchvision")
        sys.exit(1)

    train_path = os.path.join(data_dir, "train")
    val_path = os.path.join(data_dir, "val")
    
    if not os.path.exists(train_path) or not os.path.exists(val_path):
        logger.error(f"Dataset directory structure invalid. Expected subfolders 'train' and 'val' inside: {data_dir}")
        sys.exit(1)

    # 1. Load Data
    train_transform, val_transform = get_transforms()
    try:
        train_dataset = datasets.ImageFolder(train_path, transform=train_transform)
        val_dataset = datasets.ImageFolder(val_path, transform=val_transform)
    except Exception as e:
        logger.error(f"Failed to load image datasets from subfolders. Details: {str(e)}")
        sys.exit(1)

    logger.info(f"Loaded train dataset: {len(train_dataset)} samples with classes {train_dataset.classes}")
    logger.info(f"Loaded validation dataset: {len(val_dataset)} samples with classes {val_dataset.classes}")
    
    # Check classes compatibility
    expected_classes = ["FRESH", "SPOILED", "MOLD", "BRUISED_DAMAGED", "UNKNOWN"]
    logger.info(f"Target application expects model output shape mapping to these classes: {expected_classes}")

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=2)

    # 2. Setup Model, Loss and Optimizer
    device_target = torch.device(device)
    model = FoodFreshnessCNN(num_classes=len(expected_classes))
    model.to(device_target)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    best_val_loss = float("inf")
    
    logger.info(f"Beginning training on device: {device_target}...")
    
    # 3. Epoch Loop
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        correct_train = 0
        total_train = 0
        
        for images, labels in train_loader:
            images, labels = images.to(device_target), labels.to(device_target)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs, 1)
            total_train += labels.size(0)
            correct_train += (predicted == labels).sum().item()
            
        epoch_train_loss = train_loss / total_train
        epoch_train_acc = correct_train / total_train
        
        # Validation pass
        model.eval()
        val_loss = 0.0
        correct_val = 0
        total_val = 0
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device_target), labels.to(device_target)
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item() * images.size(0)
                _, predicted = torch.max(outputs, 1)
                total_val += labels.size(0)
                correct_val += (predicted == labels).sum().item()
                
        epoch_val_loss = val_loss / total_val
        epoch_val_acc = correct_val / total_val
        
        logger.info(f"Epoch {epoch+1:02d}/{epochs:02d} | Train Loss: {epoch_train_loss:.4f} Acc: {epoch_train_acc:.4f} | Val Loss: {epoch_val_loss:.4f} Acc: {epoch_val_acc:.4f}")
        
        # 4. Checkpoint saving
        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            torch.save(model.state_dict(), output_path)
            logger.info(f"  → Saved new best validation checkpoint to {output_path}")
            
    logger.info("Training complete.")

if __name__ == "__main__":
    args = parse_args()
    train_model(
        data_dir=args.data_dir,
        output_path=args.output_path,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        device=args.device
    )
