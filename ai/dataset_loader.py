import torch
from torch.utils.data import Dataset
import numpy as np
from PIL import Image

# Food categories mapping
CATEGORIES = [
    'Fruits', 'Vegetables', 'Meat', 'Seafood', 'Milk', 
    'Bakery', 'Packaged Foods', 'Beverages', 'Eggs', 'Frozen Foods'
]

CAT_TO_IDX = {cat: i for i, cat in enumerate(CATEGORIES)}
IDX_TO_CAT = {i: cat for i, cat in enumerate(CATEGORIES)}

class SyntheticFoodDataset(Dataset):
    """
    A PyTorch dataset that generates synthetic food images in-memory.
    Simulates variations in colors, textures, bruises, and mold based on category and status.
    """
    def __init__(self, size=200, transform=None):
        self.size = size
        self.transform = transform
        self.data = []
        
        # Pre-generate synthetic sample attributes
        for _ in range(size):
            category_idx = np.random.randint(0, len(CATEGORIES))
            is_spoiled = np.random.choice([0, 1], p=[0.7, 0.3]) # 70% fresh, 30% spoiled
            
            # Generate simulated features
            # Bruise: more common in fruits/vegetables
            has_bruise = 0
            if category_idx in [0, 1] and np.random.rand() > 0.5:
                has_bruise = 1
                
            # Mold: more common in spoiled bakery/fruits/vegetables
            has_mold = 0
            if is_spoiled == 1 and category_idx in [0, 1, 5] and np.random.rand() > 0.6:
                has_mold = 1
                
            # Damage: general physical damage
            has_damage = int(np.random.rand() > 0.8)
            
            # Generate environmental factors for shelf life
            # Higher temp + humidity = lower shelf life
            temperature = np.random.uniform(0.0, 30.0)
            humidity = np.random.uniform(30.0, 95.0)
            
            # Compute a base shelf life in days
            base_life = {
                'Fruits': 10, 'Vegetables': 7, 'Meat': 4, 'Seafood': 3, 'Milk': 7,
                'Bakery': 5, 'Packaged Foods': 180, 'Beverages': 90, 'Eggs': 21, 'Frozen Foods': 120
            }[CATEGORIES[category_idx]]
            
            # Decay factor based on temperature, spoilage status, and defects
            temp_stress = max(0, temperature - 10) / 20.0 # higher temp = faster decay
            defect_penalty = (has_bruise * 0.2) + (has_mold * 0.6) + (has_damage * 0.2)
            freshness_score = 100
            
            if is_spoiled:
                freshness_score = np.random.randint(10, 39)
            else:
                freshness_score = np.random.randint(40, 100) - int(defect_penalty * 30) - int(temp_stress * 20)
                freshness_score = max(40, min(100, freshness_score))
                
            # Remaining shelf life percentage
            remaining_life = base_life * (freshness_score / 100.0) * (1.0 - (temp_stress * 0.5))
            remaining_life = max(0.0, round(remaining_life, 2))
            
            self.data.append({
                'category': category_idx,
                'is_spoiled': is_spoiled,
                'has_bruise': has_bruise,
                'has_mold': has_mold,
                'has_damage': has_damage,
                'freshness_score': freshness_score,
                'temperature': temperature,
                'humidity': humidity,
                'remaining_shelf_life': remaining_life
            })

    def __len__(self):
        return self.size

    def __getitem__(self, idx):
        meta = self.data[idx]
        
        # Create a synthetic 3-channel image using NumPy
        # Size is 128x128 pixels (RGB)
        img = np.zeros((128, 128, 3), dtype=np.uint8)
        
        # Set base background color depending on food category
        # e.g., Fruits = reddish/yellowish, Vegetables = greenish, Meat = reddish, Milk = whiteish
        base_colors = {
            0: [200, 50, 50],   # Fruits: Red
            1: [50, 180, 50],   # Vegetables: Green
            2: [180, 50, 80],   # Meat: Dark Pink
            3: [150, 180, 200], # Seafood: Light Blue/Gray
            4: [240, 240, 240], # Milk: White
            5: [210, 160, 100], # Bakery: Brown
            6: [100, 100, 200], # Packaged: Blue box
            7: [200, 200, 50],  # Beverages: Yellow liquid
            8: [245, 222, 179], # Eggs: Wheat/Beige
            9: [100, 200, 255]  # Frozen: Cyan ice
        }
        
        cat = meta['category']
        img[:, :] = base_colors[cat]
        
        # Add random noise to simulate texture
        noise = np.random.randint(-15, 15, img.shape)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        
        # If item has bruise, draw a brown spot in the center
        if meta['has_bruise']:
            # center coordinates
            img[48:80, 48:80] = [100, 70, 40]
            
        # If item has mold, draw greenish-white spot patches
        if meta['has_mold']:
            img[20:45, 20:45] = [120, 150, 120]
            img[80:105, 80:105] = [120, 150, 120]
            
        # If item is spoiled, darken the entire image and shift color to brown/gray
        if meta['is_spoiled']:
            img = (img * 0.6).astype(np.uint8)
            # Add some dark blemishes
            img[60:90, 30:60] = [50, 50, 50]
            
        # Convert to PIL Image for transformations
        pil_img = Image.fromarray(img)
        
        if self.transform:
            pil_img = self.transform(pil_img)
        else:
            # Simple conversion to PyTorch Tensor
            img_tensor = torch.from_numpy(np.array(pil_img)).permute(2, 0, 1).float() / 255.0
            
        # Compile output labels
        # Classification labels
        cat_label = torch.tensor(meta['category'], dtype=torch.long)
        spoil_label = torch.tensor(meta['is_spoiled'], dtype=torch.long)
        bruise_label = torch.tensor(meta['has_bruise'], dtype=torch.long)
        mold_label = torch.tensor(meta['has_mold'], dtype=torch.long)
        damage_label = torch.tensor(meta['has_damage'], dtype=torch.long)
        
        # Regression labels
        freshness_label = torch.tensor(meta['freshness_score'], dtype=torch.float32)
        env_factors = torch.tensor([meta['temperature'], meta['humidity']], dtype=torch.float32)
        shelf_life_label = torch.tensor(meta['remaining_shelf_life'], dtype=torch.float32)
        
        return (
            img_tensor, 
            {
                'category': cat_label,
                'is_spoiled': spoil_label,
                'has_bruise': bruise_label,
                'has_mold': mold_label,
                'has_damage': damage_label,
                'freshness_score': freshness_label,
                'env_factors': env_factors,
                'shelf_life': shelf_life_label
            }
        )
