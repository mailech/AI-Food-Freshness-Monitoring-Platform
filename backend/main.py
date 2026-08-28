from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.food import FoodAnalysis


app = FastAPI(
    title="AI Food Freshness Monitoring Platform",
    description="Backend API for food freshness monitoring and prediction",
    version="1.0.0"
)


# Allow requests from our React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Food Freshness Monitoring API is running!"
    }


@app.post("/analyze")
def analyze_food(food: FoodAnalysis):

    # Preliminary rule-based assessment
    score = 100

    # Temperature check
    if food.temperature > 8:
        score -= 20
    elif food.temperature > 5:
        score -= 10

    # Humidity check
    if food.humidity > 80:
        score -= 15
    elif food.humidity > 70:
        score -= 8

    # Storage duration check
    if food.storage_duration > 7:
        score -= 20
    elif food.storage_duration > 5:
        score -= 10

    # Keep score within 0–100
    score = max(0, min(100, score))

    # Determine freshness category
    if score >= 70:
        freshness_category = "Fresh"
    elif score >= 40:
        freshness_category = "Warning"
    else:
        freshness_category = "Spoiled"

    # Preliminary shelf-life estimate
    shelf_life_days = max(0, round(score / 15))

    # Preliminary confidence
    confidence = min(98, max(60, score + 8))

    # Recommendation
    if freshness_category == "Fresh":
        recommendation = "Food appears suitable for continued storage. Follow recommended storage conditions."
    elif freshness_category == "Warning":
        recommendation = "Check the food condition carefully and consider consuming it soon."
    else:
        recommendation = "Do not rely on this preliminary assessment for safety. Inspect the food and follow food-safety guidance."

    return {
        "product_type": food.product_type,
        "temperature": food.temperature,
        "humidity": food.humidity,
        "storage_duration": food.storage_duration,
        "freshness_category": freshness_category,
        "freshness_score": score,
        "shelf_life_days": shelf_life_days,
        "confidence": confidence,
        "recommendation": recommendation
    }