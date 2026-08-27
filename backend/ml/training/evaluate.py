import os
import sys
import argparse
import logging
import numpy as np

try:
    import torch
    from torch.utils.data import DataLoader
    from torchvision import datasets, transforms
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

# Add parent directories to path to allow importing ml package
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ml.inference.freshness_model import FoodFreshnessCNN
from ml.evaluation.evaluate_model import evaluate_metrics

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ml_evaluate")

def parse_args():
    parser = argparse.ArgumentParser(description="FreshLens Custom CNN Evaluation Pipeline")
    parser.add_argument("--test-dir", type=str, required=True, help="Path to labeled test dataset directory containing class subfolders")
    parser.add_argument("--model-path", type=str, default="../models/freshness_model.pt", help="Path to the trained PyTorch state-dict checkpoint")
    parser.add_argument("--batch-size", type=int, default=32, help="DataLoader batch size")
    parser.add_argument("--device", type=str, default="cuda" if (HAS_TORCH and torch.cuda.is_available()) else "cpu", help="Device target ('cpu' or 'cuda')")
    return parser.parse_args()

def get_val_transform() -> transforms.Compose:
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

def evaluate_model(test_dir: str, model_path: str, batch_size: int, device: str):
    if not HAS_TORCH:
        logger.error("PyTorch and Torchvision libraries are required for evaluation.")
        sys.exit(1)

    if not os.path.exists(model_path):
        logger.error(f"Trained model checkpoint not found at: {model_path}")
        sys.exit(1)
        
    if not os.path.exists(test_dir):
        logger.error(f"Test directory not found at: {test_dir}")
        sys.exit(1)

    # 1. Load Data
    val_transform = get_val_transform()
    try:
        test_dataset = datasets.ImageFolder(test_dir, transform=val_transform)
    except Exception as e:
        logger.error(f"Failed to load test dataset. Details: {str(e)}")
        sys.exit(1)

    logger.info(f"Loaded test dataset: {len(test_dataset)} samples with classes {test_dataset.classes}")
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=2)

    # 2. Setup Model & Load Weights
    device_target = torch.device(device)
    model = FoodFreshnessCNN(num_classes=len(test_dataset.classes))
    
    try:
        state_dict = torch.load(model_path, map_location=device_target)
        model.load_state_dict(state_dict)
        model.to(device_target)
        model.eval()
        logger.info(f"Loaded model weights state-dict from {model_path}.")
    except Exception as e:
        logger.error(f"Failed to load state-dict: {str(e)}")
        sys.exit(1)

    # 3. Collect Predictions
    predictions = []
    ground_truth = []
    
    logger.info("Executing evaluation inference run...")
    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device_target)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            
            predictions.extend(probs.cpu().numpy())
            ground_truth.extend(labels.numpy())
            
    # 4. Calculate metrics using ml core evaluation module
    metrics = evaluate_metrics(predictions, ground_truth)
    
    print("\n==================================================")
    print("          FreshLens ML Evaluation Results         ")
    print("==================================================")
    print(f"Model File: {os.path.basename(model_path)}")
    print(f"Test split samples: {len(ground_truth)}")
    print(f"Accuracy:  {metrics.get('accuracy', 0.0):.4f}")
    print(f"Precision: {metrics.get('precision', 0.0):.4f}")
    print(f"Recall:    {metrics.get('recall', 0.0):.4f}")
    print(f"F1-Score:  {metrics.get('f1_score', 0.0):.4f}")
    print("\nConfusion Matrix:")
    matrix = np.array(metrics.get("confusion_matrix", []))
    print(matrix)
    print("==================================================")

if __name__ == "__main__":
    args = parse_args()
    evaluate_model(
        test_dir=args.test_dir,
        model_path=args.model_path,
        batch_size=args.batch_size,
        device=args.device
    )
