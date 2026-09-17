import os
import requests

# Docker Container Endpoint URL (Ports & IP onujayi update kero)
DOCKER_AI_SERVICE_URL = os.getenv("DOCKER_AI_SERVICE_URL", "http://localhost:8000/predict")

# Storage Recommendations Mapping
STORAGE_RECOMMENDATIONS = {
    'freshapples': {
        'category': 'Fruits',
        'shelf_life_days': 7,
        'recommended_temp': '1°C – 4°C (34°F – 40°F)',
        'advice': 'Store in refrigerator produce drawer to maintain crispness.'
    },
    'freshoranges': {
        'category': 'Fruits',
        'shelf_life_days': 8,
        'recommended_temp': '4°C – 8°C (39°F – 46°F)',
        'advice': 'Store in the crisper drawer or a cool room temperature space.'
    },
    'freshbananas': {
        'category': 'Fruits',
        'shelf_life_days': 5,
        'recommended_temp': '12°C – 15°C (53°F – 59°F)',
        'advice': 'Keep at room temperature. Avoid direct sunlight.'
    },
    'freshtomato': {
        'category': 'Vegetables',
        'shelf_life_days': 7,
        'recommended_temp': '10°C – 13°C (50°F – 55°F)',
        'advice': 'Store stem-side down at cool room temperature.'
    },
    'rottenapples': {
        'category': 'Fruits',
        'shelf_life_days': 0,
        'recommended_temp': 'N/A (Dispose)',
        'advice': 'Discard immediately to prevent spreading spoilage.'
    },
    'rottenoranges': {
        'category': 'Fruits',
        'shelf_life_days': 0,
        'recommended_temp': 'N/A (Dispose)',
        'advice': 'Dispose immediately and clean storage area.'
    },
    'rottenbananas': {
        'category': 'Fruits',
        'shelf_life_days': 0,
        'recommended_temp': 'N/A (Dispose)',
        'advice': 'Discard immediately.'
    },
    'rottentomato': {
        'category': 'Vegetables',
        'shelf_life_days': 0,
        'recommended_temp': 'N/A (Dispose)',
        'advice': 'Discard immediately.'
    }
}


def get_fallback_metadata(name_lower):
    """Fallback metadata logic based on search keywords."""
    if any(k in name_lower for k in ["banana", "apple", "orange", "mango", "fruit"]):
        return {
            'category': "Fruits",
            'shelf_life_days': 7,
            'recommended_temp': "10°C – 15°C",
            'advice': "Keep in a cool, ventilated area away from direct sunlight."
        }
    elif any(k in name_lower for k in ["tomato", "potato", "onion", "carrot", "vegetable"]):
        return {
            'category': "Vegetables",
            'shelf_life_days': 10,
            'recommended_temp': "4°C – 8°C",
            'advice': "Refrigerate in a crisp drawer or store in a dark, dry place."
        }
    elif any(k in name_lower for k in ["milk", "cheese", "yogurt", "dairy"]):
        return {
            'category': "Dairy",
            'shelf_life_days': 5,
            'recommended_temp': "1°C – 4°C",
            'advice': "Keep strictly refrigerated and close container tightly after use."
        }
    elif any(k in name_lower for k in ["chicken", "beef", "fish", "meat"]):
        return {
            'category': "Meat & Seafood",
            'shelf_life_days': 3,
            'recommended_temp': "-1°C – 2°C",
            'advice': "Store in the coldest part of the fridge or freeze for long storage."
        }
    else:
        return {
            'category': "General",
            'shelf_life_days': 5,
            'recommended_temp': "1°C – 5°C",
            'advice': "Store in a cool, dry place away from heat."
        }


def predict_image(image_path, item_hint=None):
    if not image_path or not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found at path: {image_path}")

    predicted_class = "Unknown"
    confidence = 0.95

    # Sending Request to Docker Model Service
    try:
        with open(image_path, 'rb') as img_file:
            files = {'image': img_file}
            response = requests.post(DOCKER_AI_SERVICE_URL, files=files, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                predicted_class = data.get("class", data.get("predicted_class", "freshapples"))
                confidence = float(data.get("confidence", 0.95))
            else:
                print(f"Docker AI Service error status: {response.status_code}")
                predicted_class = item_hint if item_hint else "freshapples"

    except Exception as e:
        print(f"Failed to connect to Docker AI Service: {e}")
        predicted_class = item_hint if item_hint else "freshapples"

    # Process predictions
    class_key = str(predicted_class).lower().replace(" ", "").replace("_", "")

    if class_key in STORAGE_RECOMMENDATIONS:
        storage_info = STORAGE_RECOMMENDATIONS[class_key]
    else:
        search_key = item_hint.lower() if item_hint else class_key
        storage_info = get_fallback_metadata(search_key)

    status = "Spoiled" if "rotten" in class_key else "Fresh"
    display_name = item_hint.strip() if item_hint and item_hint.strip() else predicted_class.title()

    return {
        "food_name": display_name,
        "category": storage_info['category'],
        "status": status,
        "confidence": confidence,
        "ai_confidence": round(confidence * 100, 2),
        "shelf_life_days": storage_info['shelf_life_days'],
        "recommended_temp": storage_info['recommended_temp'],
        "storage_advice": storage_info['advice']
    }