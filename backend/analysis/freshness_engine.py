from analysis.food_info import get_food_info

def calculate_freshness_score(image_analysis, storage_data=None, product_age_days=0, food_name="Unknown"):
    visual_score = (image_analysis["color_score"] * 0.5 + image_analysis["texture_score"] * 0.5)

    if image_analysis["mold_detected"]:
        visual_score *= (1 - image_analysis["mold_confidence"] / 100 * 0.8)
    if image_analysis["bruising_detected"]:
        visual_score *= (1 - image_analysis["bruising_confidence"] / 100 * 0.4)
    if image_analysis["damage_detected"]:
        visual_score *= (1 - image_analysis["damage_confidence"] / 100 * 0.3)

    storage_score = 100.0
    if storage_data:
        food_info = get_food_info(food_name)
        temp_diff = abs(storage_data.get("temperature", food_info["optimal_temp"]) - food_info["optimal_temp"])
        humidity_diff = abs(storage_data.get("humidity", food_info["optimal_humidity"]) - food_info["optimal_humidity"])
        storage_score = max(0, 100 - temp_diff * 3 - humidity_diff * 0.5)

    food_info = get_food_info(food_name)
    max_shelf = food_info["fresh_shelf_life_days"]
    shelf_ratio = max(0, 1 - product_age_days / max_shelf) if max_shelf > 0 else 0.5
    shelf_score = shelf_ratio * 100

    age_score = max(0, 100 - (product_age_days / max_shelf * 100)) if max_shelf > 0 else 50

    weighted = visual_score * 0.40 + storage_score * 0.25 + shelf_score * 0.20 + age_score * 0.15
    final_score = max(0, min(100, weighted))

    quality_class = classify_freshness(final_score)
    spoilage_prob = max(0, min(100, 100 - final_score))
    confidence = calculate_confidence(image_analysis)
    risk_level = "High" if final_score < 30 else ("Medium" if final_score < 50 else "Low")

    return {
        "freshness_score": round(final_score, 1),
        "quality_class": quality_class,
        "spoilage_probability": round(spoilage_prob, 1),
        "confidence": round(confidence, 1),
        "risk_level": risk_level,
        "breakdown": {
            "visual_condition": round(visual_score, 1),
            "storage_conditions": round(storage_score, 1),
            "shelf_life": round(shelf_score, 1),
            "product_age": round(age_score, 1)
        }
    }

def classify_freshness(score):
    if score >= 85:
        return "Fresh"
    elif score >= 70:
        return "Good"
    elif score >= 50:
        return "Acceptable"
    elif score >= 30:
        return "Near Spoilage"
    return "Spoiled"

def calculate_confidence(image_analysis):
    scores = [image_analysis["color_score"], image_analysis["texture_score"]]
    mean_score = sum(scores) / len(scores)
    variance = sum((s - mean_score) ** 2 for s in scores) / len(scores)
    confidence = max(50, 100 - variance * 0.5)
    return min(100, confidence)
