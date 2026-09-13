import os
import sys
import json
import time
import shutil
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from PIL import Image, ImageEnhance
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

DATASET_PATH = Path(r"C:\Users\Akshita\Downloads\food_freshness_dataset\dataset")
MODEL_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "models"
MODEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Pure PyTorch Modern CNN Architecture with Residual & Squeeze-and-Excitation Blocks
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
            nn.Conv2d(3, 32, kernel_size=3, stride=2, padding=1, bias=False), # 112x112
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True)
        )
        self.layer1 = ResidualConvBlock(32, 64, stride=2)   # 56x56
        self.layer2 = ResidualConvBlock(64, 128, stride=2)  # 28x28
        self.layer3 = ResidualConvBlock(128, 256, stride=2) # 14x14
        self.layer4 = ResidualConvBlock(256, 384, stride=2) # 7x7
        
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

class KaggleFruitDataset(Dataset):
    def __init__(self, samples, is_train=False):
        self.samples = samples
        self.is_train = is_train
        
    def __len__(self):
        return len(self.samples)
        
    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            img = Image.open(path).convert('RGB').resize((224, 224))
            
            if self.is_train:
                if np.random.rand() > 0.5:
                    img = img.transpose(Image.FLIP_LEFT_RIGHT)
                if np.random.rand() > 0.7:
                    angle = np.random.uniform(-15, 15)
                    img = img.rotate(angle, resample=Image.BILINEAR)
                if np.random.rand() > 0.6:
                    enhancer = ImageEnhance.Brightness(img)
                    img = enhancer.enhance(np.random.uniform(0.9, 1.1))
                    
            arr = np.array(img, dtype=np.float32) / 255.0
            # ImageNet mean & std
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            arr = (arr - mean) / std
            arr = np.transpose(arr, (2, 0, 1))
            return torch.from_numpy(arr), label
        except Exception:
            return torch.zeros(3, 224, 224, dtype=torch.float32), label

def load_kaggle_samples(dataset_dir):
    train_dir = dataset_dir / 'train'
    test_dir = dataset_dir / 'test'
    
    classes = sorted([d.name for d in train_dir.iterdir() if d.is_dir()])
    class_to_idx = {cls_name: i for i, cls_name in enumerate(classes)}
    
    train_samples = []
    val_samples = []
    
    for cls in classes:
        cls_folder = train_dir / cls
        files = list(cls_folder.glob("*.png")) + list(cls_folder.glob("*.jpg")) + list(cls_folder.glob("*.jpeg"))
        np.random.seed(42)
        np.random.shuffle(files)
        
        # Balance & limit to optimal batch sizes for speedy high-accuracy training
        split_idx = int(0.85 * len(files))
        for f in files[:split_idx]:
            train_samples.append((f, class_to_idx[cls]))
        for f in files[split_idx:]:
            val_samples.append((f, class_to_idx[cls]))
            
    test_samples = []
    for cls in classes:
        cls_folder = test_dir / cls
        if cls_folder.exists():
            files = list(cls_folder.glob("*.png")) + list(cls_folder.glob("*.jpg")) + list(cls_folder.glob("*.jpeg"))
            for f in files:
                test_samples.append((f, class_to_idx[cls]))
                
    return classes, class_to_idx, train_samples, val_samples, test_samples

def export_samples_to_frontend(dataset_dir, classes, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    test_dir = dataset_dir / 'test'
    for cls in classes:
        cls_folder = test_dir / cls
        files = list(cls_folder.glob("*.png")) + list(cls_folder.glob("*.jpg")) + list(cls_folder.glob("*.jpeg"))
        if files:
            for i, f in enumerate(files[:4]):
                dst = out_dir / f"{cls}_{i+1}.jpg"
                shutil.copyfile(f, dst)

def run_ml_pipeline(dataset_dir=DATASET_PATH, epochs=4, batch_size=64, lr=1e-3):
    print("==================================================")
    print("  FRUIT FRESHNESS CNN TRAINING & EVALUATION       ")
    print("==================================================")
    
    classes, class_to_idx, train_samples, val_samples, test_samples = load_kaggle_samples(dataset_dir)
    print(f"Target Dataset: {dataset_dir}")
    print(f"Found {len(classes)} classes: {classes}")
    print(f"Samples: Train={len(train_samples)}, Val={len(val_samples)}, Test={len(test_samples)}")
    
    # Export samples to frontend
    frontend_sample_dir = Path(__file__).resolve().parent.parent.parent / 'frontend' / 'public' / 'samples'
    export_samples_to_frontend(dataset_dir, classes, frontend_sample_dir)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")
    
    train_loader = DataLoader(KaggleFruitDataset(train_samples, is_train=True), batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(KaggleFruitDataset(val_samples, is_train=False), batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(KaggleFruitDataset(test_samples, is_train=False), batch_size=batch_size, shuffle=False, num_workers=0)
    
    model = FoodFreshnessCNN(num_classes=len(classes)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    
    best_val_acc = 0.0
    history = {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': []}
    start_time = time.time()
    
    for epoch in range(1, epochs + 1):
        model.train()
        r_loss, correct, total = 0.0, 0, 0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            r_loss += loss.item() * imgs.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)
            
        train_loss = r_loss / total
        train_acc = correct / total
        
        model.eval()
        v_loss, v_correct, v_total = 0.0, 0, 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                v_loss += loss.item() * imgs.size(0)
                _, preds = torch.max(outputs, 1)
                v_correct += torch.sum(preds == labels.data).item()
                v_total += labels.size(0)
                
        val_loss = v_loss / v_total
        val_acc = v_correct / v_total
        scheduler.step()
        
        history['train_loss'].append(round(train_loss, 4))
        history['val_loss'].append(round(val_loss, 4))
        history['train_acc'].append(round(train_acc, 4))
        history['val_acc'].append(round(val_acc, 4))
        
        print(f"Epoch {epoch}/{epochs} | Train Loss: {train_loss:.4f} Acc: {train_acc*100:.2f}% | Val Loss: {val_loss:.4f} Acc: {val_acc*100:.2f}%")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), MODEL_OUTPUT_DIR / "fruit_freshness_model.pt")

    duration = round(time.time() - start_time, 2)
    print(f"Training Finished in {duration}s. Best Val Accuracy: {best_val_acc*100:.2f}%")
    
    # Rigorous Test Set Evaluation
    model.load_state_dict(torch.load(MODEL_OUTPUT_DIR / "fruit_freshness_model.pt"))
    model.eval()
    
    all_preds = []
    all_targets = []
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs = imgs.to(device)
            outputs = model(imgs)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(labels.numpy())
            
    test_acc = accuracy_score(all_targets, all_preds)
    p_wt, r_wt, f_wt, _ = precision_recall_fscore_support(all_targets, all_preds, average='weighted')
    cm = confusion_matrix(all_targets, all_preds).tolist()
    
    p_per, r_per, f_per, _ = precision_recall_fscore_support(all_targets, all_preds, average=None)
    class_metrics = {}
    for idx, cls_name in enumerate(classes):
        class_metrics[cls_name] = {
            'precision': round(float(p_per[idx]), 4),
            'recall': round(float(r_per[idx]), 4),
            'f1_score': round(float(f_per[idx]), 4)
        }
        
    metrics = {
        'model_name': 'FoodFreshnessCNN-SE',
        'dataset': 'Kaggle Fruits Fresh and Rotten for Classification',
        'classes': classes,
        'class_to_idx': class_to_idx,
        'test_accuracy': round(float(test_acc), 4),
        'weighted_precision': round(float(p_wt), 4),
        'weighted_recall': round(float(r_wt), 4),
        'weighted_f1_score': round(float(f_wt), 4),
        'confusion_matrix': cm,
        'per_class_metrics': class_metrics,
        'training_history': history,
        'training_duration_seconds': duration,
        'trained_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    
    with open(MODEL_OUTPUT_DIR / "labels.json", "w") as f:
        json.dump({'classes': classes, 'class_to_idx': class_to_idx}, f, indent=2)
        
    with open(MODEL_OUTPUT_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
        
    print(f"Final Test Accuracy: {test_acc*100:.2f}% | F1-Score: {f_wt*100:.2f}%")
    print(f"Artifacts saved to {MODEL_OUTPUT_DIR}")
    return metrics

if __name__ == '__main__':
    run_ml_pipeline()
