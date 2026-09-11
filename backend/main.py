from pathlib import Path
from io import BytesIO

import numpy as np
import tensorflow as tf
import io
from PIL import Image

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.history import FoodHistory
from database import Base, engine, SessionLocal


# =========================================
# APPLICATION SETUP
# =========================================

app = FastAPI(
    title="AI Food Freshness Monitoring Platform",
    description="Backend API for food freshness monitoring and AI prediction",
    version="1.0.0"
)


# =========================================
# DATABASE
# =========================================

Base.metadata.create_all(bind=engine)


# =========================================
# CORS
# =========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================
# LOAD TRAINED AI MODEL
# =========================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    BASE_DIR
    / "ml"
    / "models"
    / "food_freshness_model.keras"
)

print("Loading AI model...")
print("Model path:", MODEL_PATH)

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"AI model not found at: {MODEL_PATH}"
    )

model = tf.keras.models.load_model(MODEL_PATH)

print("AI model loaded successfully!")


# =========================================
# HOME API
# =========================================

@app.get("/")
def home():
    return {
        "message": "Food Freshness Monitoring API is running!",
        "ai_model": "MobileNetV2",
        "model_status": "loaded"
    }


# =========================================
# IMAGE PREPROCESSING
# =========================================

def prepare_image(image_bytes: bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize((224, 224))

    # IMPORTANT:
    # Keep pixels in the 0-255 range.
    # MobileNetV2 preprocess_input() is already inside the model.
    image_array = np.array(image).astype("float32")

    image_array = np.expand_dims(image_array, axis=0)

    return image_array

# =========================================
# AI FRESHNESS PREDICTION
# =========================================

def predict_freshness(image_bytes: bytes):

    image_array = prepare_image(
        image_bytes
    )

    prediction = model.predict(
        image_array,
        verbose=0
    )

    rotten_probability = float(
        prediction[0][0]
    )

    fresh_probability = (
        1.0 - rotten_probability
    )

    if rotten_probability >= 0.5:

        ai_category = "Rotten"

        ai_confidence = (
            rotten_probability * 100
        )

    else:

        ai_category = "Fresh"

        ai_confidence = (
            fresh_probability * 100
        )

    return {
        "ai_category": ai_category,
        "fresh_probability": (
            fresh_probability * 100
        ),
        "rotten_probability": (
            rotten_probability * 100
        ),
        "ai_confidence": ai_confidence
    }


# =========================================
# ANALYZE FOOD
# =========================================

@app.post("/analyze")
async def analyze_food(
    image: UploadFile = File(...),
    product_type: str = Form(...),
    temperature: float = Form(...),
    humidity: float = Form(...),
    packaging: str = Form(...),
    storage_duration: int = Form(...)
):

    # =====================================
    # VALIDATE IMAGE
    # =====================================

    if (
        image.content_type is None
        or not image.content_type.startswith("image/")
    ):

        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file."
        )


    # =====================================
    # READ IMAGE
    # =====================================

    image_bytes = await image.read()

    if not image_bytes:

        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty."
        )


    # =====================================
    # AI PREDICTION
    # =====================================

    try:

        ai_result = predict_freshness(
            image_bytes
        )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=f"Could not process image: {str(e)}"
        )


    # =====================================
    # ENVIRONMENTAL / STORAGE SCORE
    # =====================================

    score = 100


    # =====================================
    # FOOD-SPECIFIC TEMPERATURE RULES
    # =====================================

    if product_type == "fruit":

        if temperature > 10:
            score -= 20

        elif temperature > 7:
            score -= 10


    elif product_type == "vegetable":

        if temperature > 10:
            score -= 20

        elif temperature > 7:
            score -= 10


    elif product_type == "dairy":

        if temperature > 8:
            score -= 30

        elif temperature > 5:
            score -= 15


    elif product_type == "meat":

        if temperature > 5:
            score -= 35

        elif temperature > 3:
            score -= 20


    elif product_type == "seafood":

        if temperature > 4:
            score -= 35

        elif temperature > 2:
            score -= 20


    elif product_type == "bakery":

        if temperature > 25:
            score -= 10


    elif product_type == "packaged":

        if temperature > 30:
            score -= 15

        elif temperature > 25:
            score -= 5


    elif product_type == "beverage":

        if temperature > 10:
            score -= 10


    # =====================================
    # HUMIDITY CHECK
    # =====================================

    if humidity > 90:

        score -= 20

    elif humidity > 80:

        score -= 15

    elif humidity > 70:

        score -= 8


    # =====================================
    # STORAGE DURATION
    # =====================================

    if product_type == "meat":

        if storage_duration > 3:
            score -= 30

        elif storage_duration > 2:
            score -= 15


    elif product_type == "seafood":

        if storage_duration > 2:
            score -= 35

        elif storage_duration > 1:
            score -= 20


    elif product_type == "dairy":

        if storage_duration > 7:
            score -= 25

        elif storage_duration > 5:
            score -= 12


    elif product_type == "fruit":

        if storage_duration > 7:
            score -= 20

        elif storage_duration > 5:
            score -= 10


    elif product_type == "vegetable":

        if storage_duration > 7:
            score -= 20

        elif storage_duration > 5:
            score -= 10


    elif product_type == "bakery":

        if storage_duration > 5:
            score -= 20

        elif storage_duration > 3:
            score -= 10


    elif product_type == "packaged":

        if storage_duration > 30:
            score -= 20

        elif storage_duration > 14:
            score -= 10


    elif product_type == "beverage":

        if storage_duration > 7:
            score -= 15

        elif storage_duration > 5:
            score -= 8


    # =====================================
    # PACKAGING CHECK
    # =====================================

    if packaging == "open":

        score -= 5

    elif packaging == "plastic":

        score -= 2

    elif packaging == "sealed":

        score += 2

    elif packaging == "vacuum":

        score += 3

    elif packaging == "container":

        score += 1


    # =====================================
    # ENVIRONMENTAL SCORE
    # =====================================

    environmental_score = max(
        0,
        min(100, score)
    )


    # =====================================
    # COMBINE AI + ENVIRONMENTAL SCORE
    # =====================================

   # ---------------------------------------------------------
    # ---------------------------------------------------------
    # FINAL FRESHNESS DECISION
    # ---------------------------------------------------------

    # The current ML model was trained on fresh/rotten
    # fruits and vegetables. Its prediction should not be
    # treated as reliable for other food categories.

    ai_supported = product_type in [
        "fruit",
        "vegetable"
    ]

    if ai_supported:
        # For supported food categories, combine:
        # 70% AI image prediction
        # 30% environmental/storage conditions

        ai_score = ai_result["fresh_probability"]

        final_score = (
            (ai_score * 0.70)
            + (environmental_score * 0.30)
        )

        final_score = max(
            0,
            min(
                100,
                round(final_score)
            )
        )

        displayed_ai_prediction = ai_result["ai_category"]

        displayed_ai_confidence = round(
            ai_result["ai_confidence"],
            2
        )

    else:
        # The current model has not been trained on this food
        # category. Do not report its image prediction as reliable.

        final_score = environmental_score

        # Conservative safety cap for unsupported food categories.
        if final_score >= 70:
            final_score = 69

        displayed_ai_prediction = "Not validated"
        displayed_ai_confidence = 0.0


    # =====================================
    # FINAL FRESHNESS CATEGORY
    # =====================================

    if final_score >= 70:
        freshness_category = "Fresh"
    elif final_score >= 40:
        freshness_category = "Warning"
    else:
        freshness_category = "Spoiled"


    # =====================================
    # SHELF LIFE ESTIMATE
    # =====================================

    shelf_life_days = max(
        0,
        round(final_score / 15)
    )


    # =====================================
    # AI CONFIDENCE
    # =====================================

    if ai_supported:
        confidence = displayed_ai_confidence
        confidence = min(
            98,
            max(
                60,
                confidence
            )
        )
    else:
        confidence = 0.0


    # =====================================
    # RECOMMENDATION
    # =====================================

    if not ai_supported:
        recommendation = (
            "The current AI image model was trained on fruits "
            "and vegetables and is not validated for this food type. "
            "The result is therefore based primarily on storage "
            "conditions. Inspect the food carefully and follow "
            "appropriate food-safety guidance."
        )

    elif freshness_category == "Fresh":
        recommendation = (
            "AI analysis indicates the food appears fresh. "
            "Continue following recommended storage conditions."
        )

    elif freshness_category == "Warning":
        recommendation = (
            "The food shows warning signs based on AI analysis "
            "and storage conditions. Check its condition carefully "
            "and consider consuming it soon."
        )

    else:
        recommendation = (
            "AI analysis indicates the food may be spoiled. "
            "Do not rely on this assessment alone for food safety. "
            "Inspect the food and follow food-safety guidance."
        )


    # =====================================
    # SAVE ANALYSIS TO DATABASE
    # =====================================

    db = SessionLocal()

    try:
        history = FoodHistory(
            product_type=product_type,
            temperature=temperature,
            humidity=humidity,
            packaging=packaging,
            storage_duration=storage_duration,
            freshness_category=freshness_category,
            freshness_score=final_score,
            shelf_life_days=shelf_life_days,
            confidence=confidence,
            recommendation=recommendation
        )

        db.add(history)
        db.commit()
        db.refresh(history)

    finally:
        db.close()


    # =====================================
    # RETURN RESULT
    # =====================================

    return {
        "product_type": product_type,
        "temperature": temperature,
        "humidity": humidity,
        "storage_duration": storage_duration,
        "freshness_category": freshness_category,
        "freshness_score": final_score,
        "shelf_life_days": shelf_life_days,
        "confidence": confidence,
        "recommendation": recommendation,
        "ai_prediction": displayed_ai_prediction,
        "ai_confidence": displayed_ai_confidence,
        "fresh_probability": round(
            ai_result["fresh_probability"],
            2
        ),
        "rotten_probability": round(
            ai_result["rotten_probability"],
            2
        ),
        "environmental_score": environmental_score
    }


# =========================================
# HISTORY API
# =========================================

@app.get("/history")
def get_history():
    db = SessionLocal()

    try:
        history = (
            db.query(FoodHistory)
            .order_by(FoodHistory.id.desc())
            .all()
        )

        return history

    finally:
        db.close()


# =========================================
# STATISTICS API
# =========================================

@app.get("/statistics")
def get_statistics():
    db = SessionLocal()

    try:
        total = db.query(FoodHistory).count()

        fresh = (
            db.query(FoodHistory)
            .filter(
                FoodHistory.freshness_category == "Fresh"
            )
            .count()
        )

        warning = (
            db.query(FoodHistory)
            .filter(
                FoodHistory.freshness_category == "Warning"
            )
            .count()
        )

        spoiled = (
            db.query(FoodHistory)
            .filter(
                FoodHistory.freshness_category == "Spoiled"
            )
            .count()
        )

        return {
            "total": total,
            "fresh": fresh,
            "warning": warning,
            "spoiled": spoiled
        }

    finally:
        db.close()
