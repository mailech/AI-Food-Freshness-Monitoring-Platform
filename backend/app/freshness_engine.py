def calculate_freshness_score(
    visual_score: float,
    storage_score: float,
    shelf_life_score: float,
    product_age_score: float
):
    """
    Freshness Score Model

    Visual       = 40%
    Storage      = 25%
    Shelf-life   = 20%
    Product Age  = 15%
    """

    # Keep every input between 0 and 100
    visual_score = max(0, min(100, visual_score))
    storage_score = max(0, min(100, storage_score))
    shelf_life_score = max(0, min(100, shelf_life_score))
    product_age_score = max(0, min(100, product_age_score))

    final_score = (
        (visual_score * 0.40)
        + (storage_score * 0.25)
        + (shelf_life_score * 0.20)
        + (product_age_score * 0.15)
    )

    final_score = round(final_score, 2)

    classification = get_freshness_classification(final_score)

    return {
        "freshness_score": final_score,
        "classification": classification,
        "components": {
            "visual": round(visual_score, 2),
            "storage": round(storage_score, 2),
            "shelf_life": round(shelf_life_score, 2),
            "product_age": round(product_age_score, 2)
        },
        "weights": {
            "visual": 40,
            "storage": 25,
            "shelf_life": 20,
            "product_age": 15
        }
    }


def get_freshness_classification(score: float):

    if score >= 90:
        return "Fresh"

    elif score >= 75:
        return "Good"

    elif score >= 60:
        return "Acceptable"

    elif score >= 40:
        return "Near Spoilage"

    else:
        return "Spoiled"


def calculate_storage_score(
    temperature: float,
    humidity: float,
    air_circulation: str = "Good",
    light_exposure: str = "Low",
    packaging: str = "Proper"
):
    """
    Calculates storage condition score from
    temperature, humidity, air circulation,
    light exposure and packaging.
    """

    score = 100

    # Temperature
    if temperature < 2:
        score -= 15
    elif temperature <= 8:
        score -= 0
    elif temperature <= 12:
        score -= 10
    elif temperature <= 20:
        score -= 25
    else:
        score -= 40

    # Humidity
    if humidity < 30:
        score -= 10
    elif humidity <= 70:
        score -= 0
    elif humidity <= 85:
        score -= 15
    else:
        score -= 30

    # Air circulation
    air_scores = {
        "Good": 0,
        "Moderate": 8,
        "Poor": 18
    }

    score -= air_scores.get(air_circulation, 8)

    # Light exposure
    light_scores = {
        "Low": 0,
        "Medium": 5,
        "High": 15
    }

    score -= light_scores.get(light_exposure, 5)

    # Packaging
    packaging_scores = {
        "Proper": 0,
        "Damaged": 15,
        "Open": 20,
        "None": 25
    }

    score -= packaging_scores.get(packaging, 10)

    return round(max(0, min(100, score)), 2)


def calculate_product_age_score(
    age_days: int,
    expected_shelf_life_days: int
):
    """
    Product age score.
    Higher score = younger product.
    """

    if expected_shelf_life_days <= 0:
        return 0

    remaining_ratio = 1 - (
        age_days / expected_shelf_life_days
    )

    score = remaining_ratio * 100

    return round(max(0, min(100, score)), 2)


def calculate_shelf_life_score(
    remaining_days: int,
    expected_shelf_life_days: int
):
    """
    Converts remaining shelf life into a 0-100 score.
    """

    if expected_shelf_life_days <= 0:
        return 0

    score = (
        remaining_days / expected_shelf_life_days
    ) * 100

    return round(max(0, min(100, score)), 2)
# ============================================================
# VISUAL CONDITION ANALYSIS
# ============================================================

from PIL import Image
import numpy as np


def analyze_visual_condition(image_path):
    """
    Performs lightweight computer-vision analysis of a food image.

    The existing CNN remains responsible for Fresh/Rotten
    classification. These indicators provide additional
    visual-condition information for the freshness assessment.
    """

    try:
        image = Image.open(image_path).convert("RGB")
        image = image.resize((224, 224))

        img = np.asarray(image).astype(np.float32) / 255.0

        # ----------------------------------------------------
        # RGB channels
        # ----------------------------------------------------
        red = img[:, :, 0]
        green = img[:, :, 1]
        blue = img[:, :, 2]

        # ----------------------------------------------------
        # Brightness
        # ----------------------------------------------------
        brightness = (
            0.299 * red
            + 0.587 * green
            + 0.114 * blue
        )

        mean_brightness = float(np.mean(brightness))

        # ----------------------------------------------------
        # Color / saturation analysis
        # ----------------------------------------------------
        max_channel = np.max(img, axis=2)
        min_channel = np.min(img, axis=2)

        saturation = (
            (max_channel - min_channel)
            / (max_channel + 1e-6)
        )

        mean_saturation = float(np.mean(saturation))

        # ----------------------------------------------------
        # Texture analysis
        # Neighbor pixel variation
        # ----------------------------------------------------
        horizontal_difference = np.abs(
            img[:, 1:, :] - img[:, :-1, :]
        )

        vertical_difference = np.abs(
            img[1:, :, :] - img[:-1, :, :]
        )

        texture_variation = float(
            (
                np.mean(horizontal_difference)
                + np.mean(vertical_difference)
            )
            / 2
        )

        # ----------------------------------------------------
        # Dark-region analysis
        # ----------------------------------------------------
        dark_pixels = brightness < 0.22
        dark_ratio = float(np.mean(dark_pixels))

        # ----------------------------------------------------
        # Brown-region analysis
        # Useful as a heuristic for bruising/discoloration
        # ----------------------------------------------------
        brown_pixels = (
            (red > green * 1.05)
            & (green > blue * 1.10)
            & (red > 0.20)
            & (green > 0.10)
            & (blue < 0.30)
        )

        brown_ratio = float(np.mean(brown_pixels))

        # ----------------------------------------------------
        # Color condition score
        # ----------------------------------------------------
        color_score = 100.0

        if mean_brightness < 0.25:
            color_score -= 25
        elif mean_brightness < 0.35:
            color_score -= 12

        if mean_saturation < 0.12:
            color_score -= 15

        color_score = max(
            0,
            min(100, color_score)
        )

        # ----------------------------------------------------
        # Texture condition score
        # ----------------------------------------------------
        texture_score = 100.0

        if texture_variation > 0.16:
            texture_score -= 25
        elif texture_variation > 0.11:
            texture_score -= 12

        texture_score = max(
            0,
            min(100, texture_score)
        )

        # ----------------------------------------------------
        # Possible mold / dark spot indicator
        #
        # This is a visual heuristic, NOT a trained mold model.
        # ----------------------------------------------------
        mold_indicator = min(
            100,
            dark_ratio * 250
        )

        # ----------------------------------------------------
        # Bruising indicator
        # ----------------------------------------------------
        bruising_indicator = min(
            100,
            brown_ratio * 400
        )

        # ----------------------------------------------------
        # Physical damage indicator
        #
        # High local variation can indicate irregular surfaces
        # or visible physical damage.
        # ----------------------------------------------------
        damage_indicator = min(
            100,
            texture_variation * 450
        )

        # ----------------------------------------------------
        # Visual condition score
        # ----------------------------------------------------
        visual_condition_score = (
            (color_score * 0.30)
            + (texture_score * 0.30)
            + ((100 - mold_indicator) * 0.15)
            + ((100 - bruising_indicator) * 0.10)
            + ((100 - damage_indicator) * 0.15)
        )

        visual_condition_score = round(
            max(
                0,
                min(100, visual_condition_score)
            ),
            2
        )

        # ----------------------------------------------------
        # Human-readable conditions
        # ----------------------------------------------------
        if color_score >= 80:
            color_condition = "Good"
        elif color_score >= 60:
            color_condition = "Moderate"
        else:
            color_condition = "Poor"

        if texture_score >= 80:
            texture_condition = "Normal"
        elif texture_score >= 60:
            texture_condition = "Moderate"
        else:
            texture_condition = "Irregular"

        if mold_indicator < 20:
            mold_status = "Low"
        elif mold_indicator < 50:
            mold_status = "Possible"
        else:
            mold_status = "High"

        if bruising_indicator < 20:
            bruising_status = "Low"
        elif bruising_indicator < 50:
            bruising_status = "Possible"
        else:
            bruising_status = "High"

        if damage_indicator < 20:
            damage_status = "Low"
        elif damage_indicator < 50:
            damage_status = "Possible"
        else:
            damage_status = "High"

        return {
            "visual_condition_score": visual_condition_score,

            "color_analysis": {
                "score": round(color_score, 2),
                "condition": color_condition
            },

            "texture_analysis": {
                "score": round(texture_score, 2),
                "condition": texture_condition
            },

            "mold_detection": {
                "indicator": round(mold_indicator, 2),
                "status": mold_status
            },

            "bruising_detection": {
                "indicator": round(bruising_indicator, 2),
                "status": bruising_status
            },

            "physical_damage_detection": {
                "indicator": round(damage_indicator, 2),
                "status": damage_status
            }
        }

    except Exception as e:
        return {
            "visual_condition_score": 50.0,

            "color_analysis": {
                "score": 50.0,
                "condition": "Unknown"
            },

            "texture_analysis": {
                "score": 50.0,
                "condition": "Unknown"
            },

            "mold_detection": {
                "indicator": 50.0,
                "status": "Unknown"
            },

            "bruising_detection": {
                "indicator": 50.0,
                "status": "Unknown"
            },

            "physical_damage_detection": {
                "indicator": 50.0,
                "status": "Unknown"
            },

            "error": str(e)
        }