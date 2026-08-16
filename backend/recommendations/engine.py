from analysis.food_info import get_food_info

def generate_recommendations(food_name, freshness_score, quality_class, shelf_life_days, storage_data=None):
    info = get_food_info(food_name)
    recs = {"storage": [], "consumption": [], "rotation": [], "waste_reduction": [], "quality_improvement": []}

    recs["storage"].append(f"Store at {info['optimal_temp']}°C with {info['optimal_humidity']}% humidity")
    recs["storage"].append(f"Recommended: {info['storage']}")
    recs["storage"].append(f"Packaging: {info['packaging']}")

    if quality_class == "Fresh":
        recs["consumption"].append("Product is fresh and ready to consume")
        recs["consumption"].append(f"Best consumed within {shelf_life_days:.0f} days")
    elif quality_class == "Good":
        recs["consumption"].append("Quality is good — consume within the next few days")
        recs["consumption"].append("Prioritize this item in meal planning")
    elif quality_class == "Acceptable":
        recs["consumption"].append("Quality is acceptable but declining — use soon")
        recs["consumption"].append("Consider using in cooked dishes rather than raw")
    elif quality_class == "Near Spoilage":
        recs["consumption"].append("Product is near spoilage — use immediately if safe")
        recs["consumption"].append("Cook thoroughly before consuming")
        recs["consumption"].append("Consider composting if smell or texture is off")
    else:
        recs["consumption"].append("Product appears spoiled — do not consume")
        recs["consumption"].append("Dispose of safely and replace")

    if freshness_score < 70:
        recs["rotation"].append("Move to front of shelf for priority consumption")
        recs["rotation"].append("Apply FIFO (First In, First Out) principle")
    if shelf_life_days < 3:
        recs["rotation"].append("Flag for immediate use or markdown")

    if freshness_score < 50:
        recs["waste_reduction"].append("Consider donating to food banks if still safe")
        recs["waste_reduction"].append("Use in smoothies, soups, or sauces to minimize waste")
    recs["waste_reduction"].append("Track consumption patterns to optimize purchase quantities")
    recs["waste_reduction"].append("Set up expiry alerts for proactive management")

    if storage_data:
        temp = storage_data.get("temperature", info["optimal_temp"])
        if abs(temp - info["optimal_temp"]) > 3:
            recs["quality_improvement"].append(f"Adjust temperature to {info['optimal_temp']}°C for better preservation")
        humidity = storage_data.get("humidity", info["optimal_humidity"])
        if abs(humidity - info["optimal_humidity"]) > 10:
            recs["quality_improvement"].append(f"Adjust humidity to {info['optimal_humidity']}% for optimal freshness")

    recs["quality_improvement"].append("Ensure proper air circulation in storage area")
    recs["quality_improvement"].append("Minimize light exposure during storage")

    return recs

def get_waste_reduction_tips():
    return [
        {"tip": "Plan meals weekly to buy only what you need", "impact": "High", "category": "Planning"},
        {"tip": "Use FIFO method — place newer items behind older ones", "impact": "High", "category": "Organization"},
        {"tip": "Store fruits and vegetables separately to prevent ethylene damage", "impact": "Medium", "category": "Storage"},
        {"tip": "Freeze items approaching expiry for later use", "impact": "High", "category": "Preservation"},
        {"tip": "Use clear containers to see food before it spoils", "impact": "Medium", "category": "Organization"},
        {"tip": "Set temperature zones in your refrigerator correctly", "impact": "High", "category": "Storage"},
        {"tip": "Check inventory before shopping to avoid duplicates", "impact": "Medium", "category": "Planning"},
        {"tip": "Compost unusable food scraps instead of landfill disposal", "impact": "Medium", "category": "Sustainability"},
        {"tip": "Batch cook near-expiry items into freezable meals", "impact": "High", "category": "Preservation"},
        {"tip": "Monitor storage conditions regularly with sensors", "impact": "High", "category": "Technology"}
    ]
