import torch
import torch.nn as nn
import torch.nn.functional as F

class FoodFreshnessCNN(nn.Module):
    """
    Multi-task convolutional neural network.
    Predicts:
    1. Food category (10 classes)
    2. Spoilage status (2 classes: Fresh / Spoiled)
    Also extracts rich semantic feature embeddings for downstream tasks.
    """
    def __init__(self, num_categories=10):
        super(FoodFreshnessCNN, self).__init__()
        
        # Conv Block 1
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(16)
        
        # Conv Block 2
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(32)
        
        # Conv Block 3
        self.conv3 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(64)
        
        self.pool = nn.MaxPool2d(2, 2)
        self.dropout = nn.Dropout(0.25)
        
        # Shared Embedding Feature layer
        # Output after pooling 128x128 through three pools of 2x2 is 16x16.
        # 64 channels * 16 * 16 = 16384
        self.fc_shared = nn.Linear(64 * 16 * 16, 128)
        self.bn_shared = nn.BatchNorm1d(128)
        
        # Head 1: Food Category Classifier
        self.fc_category = nn.Linear(128, num_categories)
        
        # Head 2: Spoilage Classifier (binary: 0 = Fresh, 1 = Spoiled)
        self.fc_spoiled = nn.Linear(128, 2)
        
        # Head 3: Feature extractor head for shelf-life regressor
        self.fc_features = nn.Linear(128, 64)

    def forward(self, x):
        # Input shape: (Batch, 3, 128, 128)
        x = self.pool(F.relu(self.bn1(self.conv1(x))))
        x = self.pool(F.relu(self.bn2(self.conv2(x))))
        x = self.pool(F.relu(self.bn3(self.conv3(x))))
        x = self.dropout(x)
        
        # Flatten
        x = x.view(x.size(0), -1)
        
        # Shared representations
        shared_out = F.relu(self.bn_shared(self.fc_shared(x)))
        shared_out = self.dropout(shared_out)
        
        # Individual heads
        category_logits = self.fc_category(shared_out)
        spoil_logits = self.fc_spoiled(shared_out)
        extracted_features = F.relu(self.fc_features(shared_out))
        
        return category_logits, spoil_logits, extracted_features


class ShelfLifeRegressor(nn.Module):
    """
    Multilayer Perceptron for predicting remaining shelf-life.
    Inputs:
    - CNN Extracted Features (64 dimensions)
    - Environmental Factors: Temperature, Humidity (2 dimensions)
    - CV Physical Indicators: Color Score, Texture Score, Mold Probability (3 dimensions)
    Total input dimension = 69
    """
    def __init__(self, input_dim=69):
        super(ShelfLifeRegressor, self).__init__()
        self.fc1 = nn.Linear(input_dim, 32)
        self.bn1 = nn.BatchNorm1d(32)
        self.fc2 = nn.Linear(32, 16)
        self.bn2 = nn.BatchNorm1d(16)
        self.fc3 = nn.Linear(16, 1) # Output represents days of remaining shelf life

    def forward(self, features, env_factors, cv_scores):
        # Concatenate features
        # shapes: features=(N, 64), env_factors=(N, 2), cv_scores=(N, 3)
        x = torch.cat([features, env_factors, cv_scores], dim=1)
        
        x = F.relu(self.bn1(self.fc1(x)))
        x = F.relu(self.bn2(self.fc2(x)))
        out = self.fc3(x)
        
        # Re-bound prediction: remaining shelf-life cannot be negative
        return F.relu(out)
