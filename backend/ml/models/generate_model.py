import os
import numpy as np

def generate_weights(output_path: str):
    """
    Generates a simple, functional set of weights for the NumPyFreshnessNet
    that correlates with color degradation (browning) and texture roughness.
    Input size = 10 (extracted features).
    Hidden layer = 16 neurons.
    Output size = 5 (classes: 0: fresh, 1: spoiled, 2: mold, 3: bruised/damaged, 4: unknown/uncertain).
    """
    np.random.seed(42)
    
    # Input features shape: (10,)
    # w1 shape: (10, 16)
    # b1 shape: (16,)
    # w2 shape: (16, 5)
    # b2 shape: (5,)
    
    w1 = np.random.normal(0.0, 0.1, (10, 16)).astype(np.float32)
    b1 = np.zeros(16, dtype=np.float32)
    
    # We want to associate features:
    # Feature 3: browning, Feature 4: greenness, Feature 5: roughness
    # Let's map these onto hidden neurons and then onto output classes.
    # Hidden neurons 0-3: represent high browning / decay
    # Hidden neurons 4-7: represent high greenness / health
    # Hidden neurons 8-11: represent high roughness
    
    # High browning -> positive weights to neurons 0-3
    w1[3, 0:4] = 2.0
    w1[4, 0:4] = -1.0 # high greenness opposes decay
    
    # High greenness -> positive weights to neurons 4-7
    w1[4, 4:8] = 2.0
    w1[3, 4:8] = -1.0
    
    # High roughness -> positive weights to neurons 8-11
    w1[5, 8:12] = 2.0
    
    # w2 shape: (16, 5)
    w2 = np.random.normal(0.0, 0.1, (16, 5)).astype(np.float32)
    b2 = np.zeros(5, dtype=np.float32)
    
    # Neurons 0-3 (browning) map to Spoiled (Class 1) and Mold (Class 2)
    w2[0:4, 1] = 2.5 # Spoiled
    w2[0:4, 2] = 2.0 # Mold
    
    # Neurons 4-7 (greenness) map to Fresh (Class 0)
    w2[4:8, 0] = 3.0 # Fresh
    
    # Neurons 8-11 (roughness) map to Bruised/damaged (Class 3)
    w2[8:12, 3] = 2.5 # Bruised/damaged
    
    # Neurons 12-15 are random, mapping roughly to unknown
    w2[12:16, 4] = 1.0 # Unknown/uncertain
    
    # Save as compressed archive
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    np.savez_compressed(output_path, w1=w1, b1=b1, w2=w2, b2=b2)
    print(f"Model weights successfully generated at {output_path}")

if __name__ == "__main__":
    generate_weights("d:/FreshLens/backend/ml/models/freshness_model.npz")
