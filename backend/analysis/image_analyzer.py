import numpy as np
from PIL import Image
import io
import math

def analyze_image(image_path):
    img = Image.open(image_path).convert("RGB")
    img_resized = img.resize((224, 224))
    pixels = np.array(img_resized, dtype=np.float64)

    color_result = analyze_color(pixels)
    texture_result = analyze_texture(pixels)
    mold_result = detect_mold(pixels)
    bruising_result = detect_bruising(pixels)
    damage_result = detect_damage(pixels)

    return {
        "color_score": color_result["score"],
        "color_details": color_result,
        "texture_score": texture_result["score"],
        "texture_details": texture_result,
        "mold_detected": mold_result["detected"],
        "mold_confidence": mold_result["confidence"],
        "bruising_detected": bruising_result["detected"],
        "bruising_confidence": bruising_result["confidence"],
        "damage_detected": damage_result["detected"],
        "damage_confidence": damage_result["confidence"]
    }

def analyze_color(pixels):
    r, g, b = pixels[:,:,0], pixels[:,:,1], pixels[:,:,2]
    avg_r, avg_g, avg_b = np.mean(r), np.mean(g), np.mean(b)

    brightness = (avg_r + avg_g + avg_b) / 3.0
    saturation = np.std(pixels) / 128.0

    vibrancy = min(100, (saturation * 50) + (brightness / 2.55) * 0.5)

    brown_ratio = avg_r / (avg_g + 1) * (avg_r / (avg_b + 1))
    brown_penalty = max(0, min(40, (brown_ratio - 1.5) * 20))

    dark_pixels = np.sum(np.mean(pixels, axis=2) < 50)
    total_pixels = pixels.shape[0] * pixels.shape[1]
    dark_ratio = dark_pixels / total_pixels
    dark_penalty = dark_ratio * 30

    score = max(0, min(100, vibrancy - brown_penalty - dark_penalty))

    return {
        "score": round(score, 1),
        "brightness": round(brightness, 1),
        "avg_rgb": [round(avg_r, 1), round(avg_g, 1), round(avg_b, 1)],
        "saturation": round(saturation, 2),
        "brown_level": round(brown_penalty, 1),
        "dark_ratio": round(dark_ratio, 3)
    }

def analyze_texture(pixels):
    gray = np.mean(pixels, axis=2)

    dx = np.diff(gray, axis=1)
    dy = np.diff(gray, axis=0)
    edge_magnitude = np.sqrt(dx[:223, :]**2 + dy[:, :223]**2)
    edge_density = np.mean(edge_magnitude) / 128.0

    local_std = np.zeros((22, 22))
    for i in range(22):
        for j in range(22):
            patch = gray[i*10:(i+1)*10, j*10:(j+1)*10]
            local_std[i, j] = np.std(patch)

    smoothness = 1.0 - (1.0 / (1.0 + np.mean(local_std)**2 / 1000.0))

    histogram, _ = np.histogram(gray.flatten(), bins=256, range=(0, 256))
    histogram = histogram / histogram.sum()
    entropy = -np.sum(histogram[histogram > 0] * np.log2(histogram[histogram > 0]))
    norm_entropy = entropy / 8.0

    uniformity = max(0, 1.0 - abs(norm_entropy - 0.7) * 2)
    texture_score = min(100, (uniformity * 40 + smoothness * 30 + (1 - edge_density) * 30))

    return {
        "score": round(max(0, texture_score), 1),
        "edge_density": round(edge_density, 3),
        "smoothness": round(smoothness, 3),
        "entropy": round(entropy, 2),
        "uniformity": round(uniformity, 3)
    }

def detect_mold(pixels):
    r, g, b = pixels[:,:,0], pixels[:,:,1], pixels[:,:,2]

    white_fuzzy = (r > 200) & (g > 200) & (b > 200)
    gray_patches = (np.abs(r - g) < 20) & (np.abs(g - b) < 20) & (r > 100) & (r < 180)
    green_mold = (g > r * 1.2) & (g > b * 1.1) & (g > 80) & (g < 200)
    black_mold = (r < 40) & (g < 40) & (b < 40)

    total = pixels.shape[0] * pixels.shape[1]
    mold_pixels = np.sum(white_fuzzy) * 0.3 + np.sum(green_mold) * 1.0 + np.sum(black_mold) * 0.5
    mold_ratio = mold_pixels / total

    confidence = min(100, mold_ratio * 500)
    detected = confidence > 15

    return {"detected": bool(detected), "confidence": round(confidence, 1)}

def detect_bruising(pixels):
    r, g, b = pixels[:,:,0], pixels[:,:,1], pixels[:,:,2]
    brightness = (r + g + b) / 3.0

    dark_spots = brightness < 60
    brown_spots = (r > g) & (r > b) & (brightness < 100) & (brightness > 30)
    bruise_pixels = np.sum(dark_spots) * 0.5 + np.sum(brown_spots) * 0.5

    total = pixels.shape[0] * pixels.shape[1]
    bruise_ratio = bruise_pixels / total

    confidence = min(100, bruise_ratio * 300)
    detected = confidence > 20

    return {"detected": bool(detected), "confidence": round(confidence, 1)}

def detect_damage(pixels):
    gray = np.mean(pixels, axis=2)
    dx = np.abs(np.diff(gray, axis=1))
    dy = np.abs(np.diff(gray, axis=0))

    sharp_edges_x = np.sum(dx > 80)
    sharp_edges_y = np.sum(dy > 80)
    total = gray.shape[0] * gray.shape[1]
    edge_ratio = (sharp_edges_x + sharp_edges_y) / (total * 2)

    brightness_variance = np.std(gray)
    irregularity = min(1.0, brightness_variance / 80.0)

    confidence = min(100, (edge_ratio * 200 + irregularity * 30))
    detected = confidence > 25

    return {"detected": bool(detected), "confidence": round(confidence, 1)}
