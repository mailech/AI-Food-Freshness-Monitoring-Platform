import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from dataset_loader import SyntheticFoodDataset
from models import FoodFreshnessCNN, ShelfLifeRegressor

def train_models():
    # Set seed for reproducibility
    torch.manual_seed(42)
    
    # Check GPU availability
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on device: {device}")
    
    # 1. Load Dataset
    print("Loading synthetic food dataset...")
    full_dataset = SyntheticFoodDataset(size=300)
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    
    # 2. Instantiate Models
    cnn_model = FoodFreshnessCNN().to(device)
    regressor_model = ShelfLifeRegressor().to(device)
    
    # 3. Loss Functions & Optimizers
    criterion_category = nn.CrossEntropyLoss()
    criterion_spoiled = nn.CrossEntropyLoss()
    criterion_shelf_life = nn.MSELoss()
    
    optimizer_cnn = optim.Adam(cnn_model.parameters(), lr=0.001)
    optimizer_regressor = optim.Adam(regressor_model.parameters(), lr=0.005)
    
    # 4. Training Loop (epochs set to 5 for speed during deployment, fully functional)
    epochs = 5
    print("Starting training...")
    
    for epoch in range(epochs):
        cnn_model.train()
        regressor_model.train()
        
        epoch_cnn_loss = 0.0
        epoch_reg_loss = 0.0
        
        for batch_idx, (images, targets) in enumerate(train_loader):
            images = images.to(device)
            
            # Ground truth labels
            cat_targets = targets['category'].to(device)
            spoil_targets = targets['is_spoiled'].to(device)
            env_factors = targets['env_factors'].to(device)
            shelf_life_targets = targets['shelf_life'].unsqueeze(1).to(device)
            
            # Setup CV feature variables
            # For simplicity, we can extract from target metadata (color_score, texture_score, mold_prob)
            color_scores = (targets['freshness_score'].unsqueeze(1) * 0.9).to(device)
            texture_scores = (targets['freshness_score'].unsqueeze(1) * 0.85).to(device)
            mold_probs = targets['has_mold'].unsqueeze(1).float().to(device)
            cv_scores = torch.cat([color_scores, texture_scores, mold_probs], dim=1)
            
            # --- Train CNN ---
            optimizer_cnn.zero_grad()
            cat_out, spoil_out, extracted_features = cnn_model(images)
            
            loss_cat = criterion_category(cat_out, cat_targets)
            loss_spoil = criterion_spoiled(spoil_out, spoil_targets)
            cnn_loss = loss_cat + loss_spoil
            
            cnn_loss.backward()
            optimizer_cnn.step()
            epoch_cnn_loss += cnn_loss.item()
            
            # --- Train Regressor ---
            # We detach features so we don't backprop through CNN for regressor optimizer
            optimizer_regressor.zero_grad()
            pred_shelf_life = regressor_model(extracted_features.detach(), env_factors, cv_scores)
            reg_loss = criterion_shelf_life(pred_shelf_life, shelf_life_targets)
            
            reg_loss.backward()
            optimizer_regressor.step()
            epoch_reg_loss += reg_loss.item()
            
        # Validation Phase
        cnn_model.eval()
        regressor_model.eval()
        val_cat_correct = 0
        val_spoil_correct = 0
        val_reg_mse = 0.0
        total_samples = 0
        
        with torch.no_grad():
            for images, targets in val_loader:
                images = images.to(device)
                cat_targets = targets['category'].to(device)
                spoil_targets = targets['is_spoiled'].to(device)
                env_factors = targets['env_factors'].to(device)
                shelf_life_targets = targets['shelf_life'].unsqueeze(1).to(device)
                
                color_scores = (targets['freshness_score'].unsqueeze(1) * 0.9).to(device)
                texture_scores = (targets['freshness_score'].unsqueeze(1) * 0.85).to(device)
                mold_probs = targets['has_mold'].unsqueeze(1).float().to(device)
                cv_scores = torch.cat([color_scores, texture_scores, mold_probs], dim=1)
                
                cat_out, spoil_out, extracted_features = cnn_model(images)
                pred_shelf_life = regressor_model(extracted_features, env_factors, cv_scores)
                
                val_cat_correct += (cat_out.argmax(dim=1) == cat_targets).sum().item()
                val_spoil_correct += (spoil_out.argmax(dim=1) == spoil_targets).sum().item()
                val_reg_mse += criterion_shelf_life(pred_shelf_life, shelf_life_targets).item() * images.size(0)
                total_samples += images.size(0)
                
        val_cat_acc = (val_cat_correct / total_samples) * 100
        val_spoil_acc = (val_spoil_correct / total_samples) * 100
        val_reg_rmse = (val_reg_mse / total_samples) ** 0.5
        
        print(f"Epoch {epoch+1}/{epochs} | "
              f"CNN Loss: {epoch_cnn_loss/len(train_loader):.4f} | "
              f"Reg Loss: {epoch_reg_loss/len(train_loader):.4f} | "
              f"Val Cat Acc: {val_cat_acc:.2f}% | "
              f"Val Spoil Acc: {val_spoil_acc:.2f}% | "
              f"Val Shelf RMSE: {val_reg_rmse:.4f} days")

    # 5. Save Model Weights
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    cnn_path = os.path.join(models_dir, 'food_freshness_cnn.pth')
    regressor_path = os.path.join(models_dir, 'shelf_life_regressor.pth')
    
    torch.save(cnn_model.state_dict(), cnn_path)
    torch.save(regressor_model.state_dict(), regressor_path)
    
    print(f"Models successfully trained and saved:\n - {cnn_path}\n - {regressor_path}")

if __name__ == '__main__':
    train_models()
