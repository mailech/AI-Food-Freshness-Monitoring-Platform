import numpy as np
from PIL import Image


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
    brightness = np.mean(pixels)

    saturation = (
        np.max(pixels, axis=2) -
        np.min(pixels, axis=2)
    )

    avg_saturation = np.mean(saturation)

    brightness_score = min(100, brightness / 2.55)
    saturation_score = min(100, avg_saturation / 2.55)

    score = (
        brightness_score * 0.55 +
        saturation_score * 0.45
    )

    score = max(45, min(100, score))

    return {
        "score": round(score, 1),
        "brightness": round(brightness, 1),
        "saturation": round(avg_saturation, 1)
    }


def analyze_texture(pixels):
    gray = np.mean(pixels, axis=2)

    dx = np.abs(np.diff(gray, axis=1))
    dy = np.abs(np.diff(gray, axis=0))

    h = min(dx.shape[0], dy.shape[0])
    w = min(dx.shape[1], dy.shape[1])

    dx = dx[:h, :w]
    dy = dy[:h, :w]

    edge_magnitude = np.sqrt(dx ** 2 + dy ** 2)

    edge_density = np.mean(edge_magnitude) / 128.0

    texture_score = 100 - (edge_density * 40)
    texture_score = max(50, min(100, texture_score))

    return {
        "score": round(texture_score, 1),
        "edge_density": round(edge_density, 3)
    }


def detect_mold(pixels):
    r = pixels[:, :, 0]
    g = pixels[:, :, 1]
    b = pixels[:, :, 2]

    total = pixels.shape[0] * pixels.shape[1]

    green_mold = (
        (g > r * 1.35) &
        (g > b * 1.20) &
        (g > 90) &
        (g < 170)
    )

    dark_mold = (
        (r < 25) &
        (g < 25) &
        (b < 25)
    )

    mold_pixels = (
        np.sum(green_mold) +
        np.sum(dark_mold) * 0.3
    )

    mold_ratio = mold_pixels / total

    confidence = min(100, mold_ratio * 800)

    detected = confidence >= 35

    return {
        "detected": bool(detected),
        "confidence": round(confidence, 1)
    }


def detect_bruising(pixels):
    r = pixels[:, :, 0]
    g = pixels[:, :, 1]
    b = pixels[:, :, 2]

    brightness = np.mean(pixels, axis=2)

    brown_spots = (
        (r > g * 1.15) &
        (r > b * 1.15) &
        (brightness > 35) &
        (brightness < 90)
    )

    total = pixels.shape[0] * pixels.shape[1]

    bruise_ratio = np.sum(brown_spots) / total

    confidence = min(100, bruise_ratio * 500)

    detected = confidence >= 35

    return {
        "detected": bool(detected),
        "confidence": round(confidence, 1)
    }


def detect_damage(pixels):
    gray = np.mean(pixels, axis=2)

    dx = np.abs(np.diff(gray, axis=1))
    dy = np.abs(np.diff(gray, axis=0))

    sharp_edges = (
        np.sum(dx > 100) +
        np.sum(dy > 100)
    )

    total = gray.shape[0] * gray.shape[1]

    edge_ratio = sharp_edges / (total * 2)

    confidence = min(100, edge_ratio * 150)

    detected = confidence >= 35

    return {
        "detected": bool(detected),
        "confidence": round(confidence, 1)
    }