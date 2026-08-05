import cv2
import numpy as np

def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """
    Decodes raw image bytes into an OpenCV BGR image.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def analyze_color(img: np.ndarray, category: str) -> float:
    """
    Computes a color score (0 to 100) indicating color freshness.
    100 means ideal fresh color. Lower means discolored, brown, or gray.
    """
    # Convert BGR to HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    
    # Calculate average hue, saturation, value
    avg_h = np.mean(h)
    avg_s = np.mean(s)
    avg_v = np.mean(v)
    
    # Analyze discoloration based on food category
    # E.g., for green vegetables, a shift to yellow/brown (lower hue or low saturation) indicates decay.
    # For fruits like apples/bananas, brown spots or darkening indicate bruising/spoilage.
    score = 100.0
    
    if category == 'Vegetables':
        # Green hue is typically around 35-85 in OpenCV HSV. Yellow is 20-30. Brown/grey is lower.
        # Check percentage of green pixels
        green_mask = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
        green_ratio = np.sum(green_mask > 0) / green_mask.size
        score = green_ratio * 100.0
        # If there's high yellowing
        yellow_mask = cv2.inRange(hsv, (15, 40, 40), (34, 255, 255))
        yellow_ratio = np.sum(yellow_mask > 0) / yellow_mask.size
        score -= (yellow_ratio * 50.0)
        
    elif category == 'Fruits':
        # Brown/grey spots analysis
        # Brown in HSV is roughly Hue 10-20, Saturation 50-150, Value 50-150
        brown_mask = cv2.inRange(hsv, (10, 40, 30), (25, 200, 150))
        brown_ratio = np.sum(brown_mask > 0) / brown_mask.size
        score = 100.0 - (brown_ratio * 120.0)
        
    elif category == 'Meat':
        # Red hue is at the edges: 0-10 or 170-180. Grey/brown indicates stale meat.
        red_mask1 = cv2.inRange(hsv, (0, 50, 50), (10, 255, 255))
        red_mask2 = cv2.inRange(hsv, (170, 50, 50), (180, 255, 255))
        red_ratio = (np.sum(red_mask1 > 0) + np.sum(red_mask2 > 0)) / red_mask1.size
        score = red_ratio * 100.0
        # Check grey/brown ratio
        grey_mask = cv2.inRange(hsv, (0, 0, 40), (180, 40, 150))
        grey_ratio = np.sum(grey_mask > 0) / grey_mask.size
        score -= (grey_ratio * 60.0)
        
    else:
        # Generic color check: extreme dark values or low saturation indicate spoilage
        dark_pixels = np.sum(v < 40) / v.size
        pale_pixels = np.sum(s < 30) / s.size
        score = 100.0 - (dark_pixels * 50.0) - (pale_pixels * 50.0)
        
    return max(0.0, min(100.0, float(score)))

def analyze_texture(img: np.ndarray) -> float:
    """
    Computes a texture index (0 to 100).
    Lower scores represent high blurriness or flat mushiness (soft spots).
    Higher scores represent crisp, solid textures with defined edges.
    Uses Laplacian variance as a proxy for sharp physical texture.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Calculate Laplacian variance
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Normalize to 0-100 score
    # A crisp image typically has a variance above 100.
    score = (lap_var / 150.0) * 100.0
    
    # Check spatial intensity variance (mushiness or decay spots have smooth gradients)
    # Get standard deviation of local block variances
    h, w = gray.shape
    blocks = [gray[i:i+32, j:j+32] for i in range(0, h-32, 32) for j in range(0, w-32, 32)]
    if blocks:
        block_vars = [np.var(b) for b in blocks]
        avg_block_var = np.mean(block_vars)
        # Low block variance means smooth/mushy spots
        if avg_block_var < 50:
            score -= 30.0
            
    return max(0.0, min(100.0, float(score)))

def detect_mold_patches(img: np.ndarray) -> tuple[bool, float]:
    """
    Detects greenish/greyish mold spots.
    Returns: (is_mold_detected, mold_probability)
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Mold colors (fuzzy white, green, grey, bluish)
    # Define a range for greenish-grey mold
    lower_mold = np.array([30, 10, 40])
    upper_mold = np.array([90, 80, 180])
    
    mask = cv2.inRange(hsv, lower_mold, upper_mold)
    
    # Perform morphological operations to filter noise
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    mold_area = 0.0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 15: # filter out minor noise
            mold_area += area
            
    total_area = img.shape[0] * img.shape[1]
    mold_ratio = mold_area / total_area
    
    # If mold covers > 0.5% of the image surface
    mold_detected = mold_ratio > 0.005
    mold_probability = min(1.0, mold_ratio * 40.0) # Scale probability up
    
    return mold_detected, float(mold_probability)

def detect_bruises(img: np.ndarray, category: str) -> tuple[bool, float]:
    """
    Detects physical bruising or dark compression spots.
    Returns: (is_bruise_detected, bruise_score)
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Use thresholding to find dark spots relative to average image brightness
    avg_brightness = np.mean(gray)
    
    # A bruise is generally darker than the rest of the item
    # Threshold at 70% of average brightness
    _, thresholded = cv2.threshold(gray, int(avg_brightness * 0.75), 255, cv2.THRESH_BINARY_INV)
    
    # Clean up threshold
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    thresholded = cv2.morphologyEx(thresholded, cv2.MORPH_OPEN, kernel)
    
    # Find contours of dark spots
    contours, _ = cv2.findContours(thresholded, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bruise_area = 0
    large_bruises = 0
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 50:
            bruise_area += area
            large_bruises += 1
            
    total_area = img.shape[0] * img.shape[1]
    bruise_ratio = bruise_area / total_area
    
    is_bruised = large_bruises > 0 and bruise_ratio > 0.01
    bruise_score = min(100.0, bruise_ratio * 1000.0) # normalize to 0-100
    
    return is_bruised, float(bruise_score)

def preprocess_image_for_cnn(img: np.ndarray, target_size=(128, 128)) -> np.ndarray:
    """
    Resizes, normalizes, and reshapes the image for deep learning model input.
    Returns channel-first float32 array normalized to [0, 1].
    """
    # Resize
    resized = cv2.resize(img, target_size)
    # Convert BGR to RGB
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    # Scale to 0-1
    normalized = rgb.astype(np.float32) / 255.0
    # Channel-first format: (C, H, W)
    channel_first = np.transpose(normalized, (2, 0, 1))
    return channel_first
