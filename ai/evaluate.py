import os
import torch
from torch.utils.data import DataLoader
from dataset_loader import SyntheticFoodDataset, CATEGORIES
from models import FoodFreshnessCNN, ShelfLifeRegressor

def evaluate_models():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Evaluating on device: {device}")
    
    # 1. Load weights
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
    cnn_path = os.path.join(models_dir, 'food_freshness_cnn.pth')
    regressor_path = os.path.join(models_dir, 'shelf_life_regressor.pth')
    
    if not os.path.exists(cnn_path) or not os.path.exists(regressor_path):
        print("Model weight files not found. Please run train.py first.")
        return
        
    cnn = FoodFreshnessCNN().to(device)
    cnn.load_state_dict(torch.load(cnn_path, map_location=device))
    cnn.eval()
    
    regressor = ShelfLifeRegressor().to(device)
    regressor.load_state_dict(torch.load(regressor_path, map_location=device))
    regressor.eval()
    
    # 2. Dataset loader
    dataset = SyntheticFoodDataset(size=100)
    loader = DataLoader(dataset, batch_size=32, shuffle=False)
    
    # Metrics
    total = 0
    cat_correct = 0
    spoil_correct = 0
    shelf_absolute_error = 0.0
    
    # Track classifications for detailed reports
    tp, fp, fn, tn = 0, 0, 0, 0
    
    with torch.no_grad():
        for images, targets in loader:
            images = images.to(device)
            cat_targets = targets['category'].to(device)
            spoil_targets = targets['is_spoiled'].to(device)
            env_factors = targets['env_factors'].to(device)
            shelf_life_targets = targets['shelf_life'].to(device)
            
            color_scores = (targets['freshness_score'].unsqueeze(1) * 0.9).to(device)
            texture_scores = (targets['freshness_score'].unsqueeze(1) * 0.85).to(device)
            mold_probs = targets['has_mold'].unsqueeze(1).float().to(device)
            cv_scores = torch.cat([color_scores, texture_scores, mold_probs], dim=1)
            
            cat_out, spoil_out, extracted_features = cnn(images)
            pred_shelf_life = regressor(extracted_features, env_factors, cv_scores).squeeze(1)
            
            # Category Acc
            cat_preds = cat_out.argmax(dim=1)
            cat_correct += (cat_preds == cat_targets).sum().item()
            
            # Spoilage Acc & F1 terms
            spoil_preds = spoil_out.argmax(dim=1)
            spoil_correct += (spoil_preds == spoil_targets).sum().item()
            
            for pred, target in zip(spoil_preds, spoil_targets):
                if pred == 1 and target == 1:
                    tp += 1
                elif pred == 1 and target == 0:
                    fp += 1
                elif pred == 0 and target == 1:
                    fn += 1
                else:
                    tn += 1
                    
            # Shelf life regression Mean Absolute Error
            shelf_absolute_error += torch.abs(pred_shelf_life - shelf_life_targets).sum().item()
            total += images.size(0)
            
    # Calculate performance rates
    cat_accuracy = (cat_correct / total) * 100.0
    spoil_accuracy = (spoil_correct / total) * 100.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    mae = shelf_absolute_error / total
    
    print("\n==========================================")
    print("AI MODEL EVALUATION PERFORMANCE RESULTS")
    print("==========================================")
    print(f"Total Evaluated Samples: {total}")
    print(f"Food Category Classification Accuracy: {cat_accuracy:.2f}%")
    print(f"Spoilage Detection Accuracy: {spoil_accuracy:.2f}%")
    print(f"Spoilage Classifier Precision: {precision:.4f}")
    print(f"Spoilage Classifier Recall: {recall:.4f}")
    print(f"Spoilage Classifier F1-Score: {f1_score:.4f}")
    print(f"Remaining Shelf Life Prediction MAE: {mae:.2f} days")
    print("==========================================\n")
    
    return {
        "cat_accuracy": cat_accuracy,
        "spoil_accuracy": spoil_accuracy,
        "f1_score": f1_score,
        "mae_days": mae
    }

if __name__ == '__main__':
    evaluate_models()
