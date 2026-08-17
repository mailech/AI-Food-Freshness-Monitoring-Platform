import os
import numpy as np
from PIL import Image

try:
    import cv2
except ImportError:
    cv2 = None

def extract_features(image_path: str) -> np.ndarray:
    """
    Extracts a 10-dimensional feature vector from an image:
    0: Mean Hue
    1: Mean Saturation
    2: Mean Value
    3: Browning index (ratio of brown-yellow pixels)
    4: Greenness index (ratio of green/healthy pixels)
    5: Texture roughness (Laplacian variance normalized)
    6: Mean Red channel
    7: Mean Green channel
    8: Mean Blue channel
    9: Standard deviation of gray image
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image path {image_path} does not exist.")
    
    # Defaults
    features = np.zeros(10, dtype=np.float32)
    
    try:
        # Load image via PIL for basic RGB channel stats
        img_pil = Image.open(image_path).convert("RGB")
        img_arr = np.array(img_pil)
        
        features[6] = float(np.mean(img_arr[:, :, 0])) / 255.0
        features[7] = float(np.mean(img_arr[:, :, 1])) / 255.0
        features[8] = float(np.mean(img_arr[:, :, 2])) / 255.0
        
        # Load via OpenCV for advanced color/texture features
        if cv2 is not None:
            img = cv2.imread(image_path)
            if img is not None:
                hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
                features[0] = float(np.mean(hsv[:, :, 0])) / 180.0
                features[1] = float(np.mean(hsv[:, :, 1])) / 255.0
                features[2] = float(np.mean(hsv[:, :, 2])) / 255.0
                
                # Browning/greenness pigments mask calculation
                lower_brown = np.array([10, 40, 40])
                upper_brown = np.array([25, 255, 230])
                brown_mask = cv2.inRange(hsv, lower_brown, upper_brown)
                brown_pixels = np.sum(brown_mask > 0)
                
                lower_green = np.array([35, 40, 40])
                upper_green = np.array([85, 255, 255])
                green_mask = cv2.inRange(hsv, lower_green, upper_green)
                green_pixels = np.sum(green_mask > 0)
                
                total_color_pixels = brown_pixels + green_pixels + 1
                features[3] = float(brown_pixels / total_color_pixels)
                features[4] = float(green_pixels / total_color_pixels)
                
                # Texture
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                laplacian = cv2.Laplacian(gray, cv2.CV_64F)
                variance = float(np.var(laplacian))
                features[5] = float(min(max(1.0 - (variance / 1500.0), 0.0), 1.0))
                features[9] = float(np.std(gray)) / 128.0
    except Exception:
        # Graceful fallback to default values on failure
        pass
        
    return features
