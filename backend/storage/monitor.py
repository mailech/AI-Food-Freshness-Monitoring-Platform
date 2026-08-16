from analysis.food_info import get_food_info

def check_compliance(food_name, temperature, humidity):
    info = get_food_info(food_name)
    temp_ok = abs(temperature - info["optimal_temp"]) <= 5
    humidity_ok = abs(humidity - info["optimal_humidity"]) <= 15
    return {
        "is_compliant": temp_ok and humidity_ok,
        "temperature_compliant": temp_ok,
        "humidity_compliant": humidity_ok,
        "optimal_temp": info["optimal_temp"],
        "optimal_humidity": info["optimal_humidity"],
        "current_temp": temperature,
        "current_humidity": humidity,
        "temp_deviation": round(temperature - info["optimal_temp"], 1),
        "humidity_deviation": round(humidity - info["optimal_humidity"], 1)
    }

def get_storage_recommendations(food_name, temperature, humidity, packaging_type="Open"):
    info = get_food_info(food_name)
    recs = []

    temp_diff = temperature - info["optimal_temp"]
    if abs(temp_diff) > 3:
        direction = "lower" if temp_diff > 0 else "raise"
        recs.append(f"Temperature is {abs(temp_diff):.1f}°C {'above' if temp_diff > 0 else 'below'} optimal. {direction.capitalize()} to {info['optimal_temp']}°C.")

    hum_diff = humidity - info["optimal_humidity"]
    if abs(hum_diff) > 10:
        direction = "reduce" if hum_diff > 0 else "increase"
        recs.append(f"Humidity is {abs(hum_diff):.0f}% {'above' if hum_diff > 0 else 'below'} optimal. {direction.capitalize()} to {info['optimal_humidity']}%.")

    if packaging_type == "Open" and info["packaging"] != "Open air":
        recs.append(f"Consider using {info['packaging']} for better preservation.")

    recs.append(f"Recommended storage: {info['storage']}")

    if not recs:
        recs.append("Storage conditions are within optimal range. Keep monitoring.")

    return {
        "recommendations": recs,
        "optimal_conditions": {
            "temperature": info["optimal_temp"],
            "humidity": info["optimal_humidity"],
            "storage_method": info["storage"],
            "packaging": info["packaging"]
        }
    }
