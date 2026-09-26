from pathlib import Path
from io import BytesIO
from datetime import datetime, date

import numpy as np
import tensorflow as tf
import io
from PIL import Image
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, Integer, String, Float, DateTime

from models.history import FoodHistory
from models.user import User
from models.notification import Notification
from database import Base, engine, SessionLocal
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
)


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




class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    food_name = Column(String(120), nullable=False)
    category = Column(String(80), nullable=False)
    batch_number = Column(String(80), nullable=False)
    quantity = Column(Float, nullable=False, default=0)
    unit = Column(String(30), nullable=False, default="kg")
    expiry_date = Column(String(20), nullable=False)
    location = Column(String(120), nullable=False, default="Main Storage")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(40), nullable=False, default="Active")


class InventoryCreateRequest(BaseModel):
    food_name: str
    category: str
    batch_number: str
    quantity: float
    unit: str
    expiry_date: str
    location: str = "Main Storage"


def inventory_status(expiry_date: str, quantity: float) -> str:
    if quantity <= 0:
        return "Out of stock"
    try:
        expiry = date.fromisoformat(expiry_date)
        days_left = (expiry - date.today()).days
        if days_left < 0:
            return "Expired"
        if days_left <= 3:
            return "Expiring soon"
    except ValueError:
        return "Active"
    return "Active"


Base.metadata.create_all(bind=engine)



# =========================================
# AUTHENTICATION / USER SCHEMAS
# =========================================

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class AdminUserCreateRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


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

# Lightweight food-name recognition using ImageNet-pretrained MobileNetV2.
# This is separate from the trained Fresh/Rotten model and requires no training.
name_model = MobileNetV2(weights="imagenet")

FOOD_LABELS = {
    "Granny Smith": "Apple", "banana": "Banana", "orange": "Orange",
    "lemon": "Lemon", "pineapple": "Pineapple", "strawberry": "Strawberry",
    "pomegranate": "Pomegranate", "fig": "Fig", "head cabbage": "Cabbage",
    "broccoli": "Broccoli", "cauliflower": "Cauliflower", "cucumber": "Cucumber",
    "bell pepper": "Bell pepper", "zucchini": "Zucchini", "acorn squash": "Squash",
    "butternut squash": "Squash", "spaghetti squash": "Squash", "potpie": "Prepared food",
    "mushroom": "Mushroom", "ear": "Corn", "corn": "Corn", "potato": "Potato",
    "tomato": "Tomato", "carrot": "Carrot", "meat loaf": "Meat",
    "cheeseburger": "Burger", "pizza": "Pizza", "hotdog": "Hot dog",
    "bagel": "Bagel", "pretzel": "Pretzel", "ice cream": "Ice cream",
    "custard apple": "Custard apple", "espresso": "Beverage", "cup": "Beverage"
}

def detect_food_name(image_bytes: bytes, filename: str = ""):
    """Prefer food class in dataset-style filenames; otherwise use ImageNet."""
    source = (filename or "").lower().replace("_", " ").replace("-", " ")
    filename_food_map = [
        (("apple",), "Apple"),
        (("banana",), "Banana"),
        (("bell pepper", "bellpepper", "capsicum"), "Bell pepper"),
        (("bitter gourd", "bittergourd"), "Bitter gourd"),
        (("carrot",), "Carrot"),
        (("cucumber",), "Cucumber"),
        (("mango",), "Mango"),
        (("okra", "lady finger", "ladyfinger"), "Okra"),
        (("orange",), "Orange"),
        (("potato",), "Potato"),
        (("strawberry",), "Strawberry"),
        (("tomato",), "Tomato"),
    ]
    for keys, food_name in filename_food_map:
        if any(key in source for key in keys):
            return food_name, 99.0

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((224, 224))
    arr = np.asarray(image).astype("float32")
    arr = preprocess_input(arr)
    arr = np.expand_dims(arr, axis=0)
    predictions = name_model.predict(arr, verbose=0)
    decoded = decode_predictions(predictions, top=100)[0]

    mapped_candidates = []
    for _, label, probability in decoded:
        clean = label.replace("_", " ")
        if clean in FOOD_LABELS:
            mapped_candidates.append((FOOD_LABELS[clean], float(probability)))

    if mapped_candidates:
        food_name, probability = max(mapped_candidates, key=lambda x: x[1])
        return food_name, round(probability * 100, 2)

    return "Food item", round(float(decoded[0][2]) * 100, 2)


# =========================================
# AUTHENTICATION APIs
# =========================================

@app.post("/auth/register")
def register_user(request: RegisterRequest):
    if len(request.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters."
        )

    db = SessionLocal()

    try:
        existing_username = (
            db.query(User)
            .filter(User.username == request.username)
            .first()
        )

        if existing_username:
            raise HTTPException(
                status_code=400,
                detail="Username already exists."
            )

        existing_email = (
            db.query(User)
            .filter(User.email == request.email)
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Email already exists."
            )

        user = User(
            username=request.username,
            email=str(request.email),
            password_hash=hash_password(request.password),
            role="consumer",
            is_active=1,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "message": "Registration successful.",
            "username": user.username,
            "role": user.role,
        }

    finally:
        db.close()


@app.post("/auth/login", response_model=TokenResponse)
def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    db = SessionLocal()

    try:
        user = (
            db.query(User)
            .filter(User.username == form_data.username)
            .first()
        )

        if (
            user is None
            or not user.is_active
            or not verify_password(form_data.password, user.password_hash)
        ):
            raise HTTPException(
                status_code=401,
                detail="Incorrect username or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = create_access_token(user)

        return {
            "access_token": token,
            "token_type": "bearer",
            "role": user.role,
            "username": user.username,
        }

    finally:
        db.close()


@app.get("/auth/me")
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
    }


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
# COLOR ANALYSIS (COMPUTER VISION)
# =========================================

def analyze_color(image_bytes: bytes):
    """
    Lightweight computer-vision color analysis.
    This is a visual indicator, not a food-safety certification.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((160, 160))
    arr = np.asarray(image).astype("float32")

    # Average RGB/HSV statistics.
    mean_rgb = arr.mean(axis=(0, 1))
    hsv = np.asarray(image.convert("HSV")).astype("float32")
    mean_h = float(hsv[:, :, 0].mean() * 2.0)
    mean_s = float(hsv[:, :, 1].mean() / 255.0 * 100.0)
    mean_v = float(hsv[:, :, 2].mean() / 255.0 * 100.0)

    r, g, b = [float(x) for x in mean_rgb]
    dominant = "Gray"
    if max(r, g, b) < 55:
        dominant = "Black / very dark"
    elif min(r, g, b) > 215:
        dominant = "White / very light"
    elif max(r, g, b) - min(r, g, b) < 18:
        dominant = "Gray / neutral"
    elif r > g * 1.35 and r > b * 1.25:
        dominant = "Red / reddish"
    elif r > 145 and g > 80 and b < 90 and r > b * 1.5:
        dominant = "Orange / brown"
    elif r > 150 and g > 125 and b < 100:
        dominant = "Yellow / golden"
    elif g > r * 1.18 and g > b * 1.10:
        dominant = "Green"
    elif b > r * 1.20 and b > g * 1.10:
        dominant = "Blue / purple"
    elif r > b * 1.25 and g > b * 1.15:
        dominant = "Warm / yellow-red"
    else:
        dominant = "Mixed"

    # Generic visual flag only; thresholds intentionally avoid claiming spoilage.
    if mean_v < 25:
        condition = "Very dark"
    elif mean_s < 12 and mean_v < 70:
        condition = "Low-color / possibly faded"
    elif mean_s > 88 and mean_v > 90:
        condition = "Highly saturated"
    else:
        condition = "No obvious color anomaly"

    return {
        "dominant_color": dominant,
        "brightness": round(mean_v, 1),
        "saturation": round(mean_s, 1),
        "color_condition": condition,
    }


def analyze_visual_condition(image_bytes: bytes):
    """
    Lightweight computer-vision screening for visible mold/damage-like
    indicators. This is heuristic image analysis, not a trained mold detector.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((160, 160))
    arr = np.asarray(image).astype("float32")

    # Focus on the central area to reduce background influence.
    h, w = arr.shape[:2]
    y1, y2 = int(h * 0.10), int(h * 0.90)
    x1, x2 = int(w * 0.10), int(w * 0.90)
    roi = arr[y1:y2, x1:x2]

    hsv = np.asarray(Image.fromarray(roi.astype("uint8")).convert("HSV")).astype("float32")
    sat = hsv[:, :, 1] / 255.0
    val = hsv[:, :, 2] / 255.0
    r, g, b = roi[:, :, 0], roi[:, :, 1], roi[:, :, 2]

    # Ignore near-white/neutral background pixels where possible.
    foreground = (sat > 0.10) | (val < 0.92)
    if int(foreground.sum()) < 500:
        foreground = np.ones_like(sat, dtype=bool)

    dark_mask = (val < 0.22) & foreground
    green_mask = (g > r * 1.12) & (g > b * 1.05) & (sat > 0.25) & (val > 0.20) & foreground

    dark_ratio = float(dark_mask.mean() * 100.0)
    green_ratio = float(green_mask.mean() * 100.0)

    # Simple edge-density proxy for surface irregularity.
    gray = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
    dx = np.abs(np.diff(gray, axis=1))
    dy = np.abs(np.diff(gray, axis=0))
    edge_density = float(((dx > 0.16).mean() + (dy > 0.16).mean()) / 2.0)

    if edge_density > 0.22 or dark_ratio > 12:
        texture = "High"
    elif edge_density > 0.12 or dark_ratio > 5:
        texture = "Moderate"
    else:
        texture = "Normal"

    mold_signal = dark_ratio * 0.55 + green_ratio * 1.20
    if mold_signal >= 12:
        mold_indicator = "High"
    elif mold_signal >= 5:
        mold_indicator = "Moderate"
    else:
        mold_indicator = "Low"

    damage_signal = dark_ratio * 0.70 + edge_density * 35.0
    if damage_signal >= 18:
        damage_indicator = "High"
    elif damage_signal >= 9:
        damage_indicator = "Moderate"
    else:
        damage_indicator = "Low"

    if mold_indicator == "High" or damage_indicator == "High":
        overall = "Visible irregularities detected — inspect carefully"
    elif mold_indicator == "Moderate" or damage_indicator == "Moderate":
        overall = "Some visual irregularities detected"
    else:
        overall = "No obvious visual damage detected"

    return {
        "mold_indicator": mold_indicator,
        "damage_indicator": damage_indicator,
        "dark_patch_ratio": round(dark_ratio, 2),
        "green_patch_ratio": round(green_ratio, 2),
        "texture_irregularity": texture,
        "overall_status": overall,
    }


# =========================================
# ANALYZE FOOD
# =========================================

@app.post("/analyze")
async def analyze_food(
    image: UploadFile = File(...),
    product_type: str = Form(""),
    temperature: float = Form(0),
    humidity: float = Form(0),
    packaging: str = Form(""),
    storage_duration: int = Form(0),
    current_user: User = Depends(get_current_user),
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

    # Detect the actual food name from the uploaded image.
    try:
        detected_food_name, food_name_confidence = detect_food_name(image_bytes, image.filename or "")
        product_type = detected_food_name
    except Exception:
        detected_food_name, food_name_confidence = "Food item", 0.0
        product_type = detected_food_name


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
    # COLOR ANALYSIS
    # =====================================

    try:
        color_analysis = analyze_color(image_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not analyze image colors: {str(e)}"
        )


    # =====================================
    # VISUAL CONDITION ASSESSMENT
    # =====================================

    try:
        visual_assessment = analyze_visual_condition(image_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not assess visible mold/damage indicators: {str(e)}"
        )


    # =====================================
    # FINAL FRESHNESS DECISION
    # ---------------------------------------------------------

    # The existing model directly supplies the freshness score.
    # The food name is supplied by the separate pretrained classifier above.
    ai_supported = True

    final_score = max(
        0,
        min(100, round(ai_result["fresh_probability"]))
    )

    displayed_ai_prediction = ai_result["ai_category"]
    displayed_ai_confidence = round(ai_result["ai_confidence"], 2)


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

    confidence = displayed_ai_confidence


    # =====================================
    # RECOMMENDATION
    # =====================================

    if freshness_category == "Fresh":
        recommendation = (
            f"AI analysis indicates the uploaded image appears to be {product_type} and looks fresh. "
            "Continue following appropriate food-storage guidance."
        )

    elif freshness_category == "Warning":
        recommendation = (
            "The uploaded food image shows warning signs based on AI analysis. "
            "Check its condition carefully before consumption."
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
        "food_name": detected_food_name,
        "food_name_confidence": food_name_confidence,
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
        "color_analysis": color_analysis,
        "visual_assessment": visual_assessment
    }


# =========================================
# FOOD INVENTORY MANAGEMENT API
# =========================================

def inventory_access(current_user: User):
    if current_user.role not in {"retail_manager", "warehouse_operator"}:
        raise HTTPException(status_code=403, detail="Inventory management is available to Retail Managers and Warehouse Operators.")


@app.get("/inventory")
def get_inventory(current_user: User = Depends(get_current_user)):
    inventory_access(current_user)
    db = SessionLocal()
    try:
        rows = db.query(InventoryItem).filter(InventoryItem.user_id == current_user.id).order_by(InventoryItem.id.desc()).all()
        for row in rows:
            row.status = inventory_status(row.expiry_date, row.quantity)
        db.commit()
        return [
            {
                "id": row.id, "food_name": row.food_name, "category": row.category,
                "batch_number": row.batch_number, "quantity": row.quantity, "unit": row.unit,
                "expiry_date": row.expiry_date, "location": row.location,
                "created_at": row.created_at.isoformat(), "status": row.status
            } for row in rows
        ]
    finally:
        db.close()


@app.post("/inventory")
def create_inventory_item(request: InventoryCreateRequest, current_user: User = Depends(get_current_user)):
    inventory_access(current_user)
    if request.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
    try:
        date.fromisoformat(request.expiry_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Expiry date must use YYYY-MM-DD format.")
    db = SessionLocal()
    try:
        item = InventoryItem(
            user_id=current_user.id, food_name=request.food_name.strip(), category=request.category.strip(),
            batch_number=request.batch_number.strip(), quantity=request.quantity, unit=request.unit.strip(),
            expiry_date=request.expiry_date, location=request.location.strip() or "Main Storage",
            status=inventory_status(request.expiry_date, request.quantity)
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return {
            "id": item.id, "food_name": item.food_name, "category": item.category,
            "batch_number": item.batch_number, "quantity": item.quantity, "unit": item.unit,
            "expiry_date": item.expiry_date, "location": item.location,
            "created_at": item.created_at.isoformat(), "status": item.status
        }
    finally:
        db.close()


@app.delete("/inventory/{item_id}")
def delete_inventory_item(item_id: int, current_user: User = Depends(get_current_user)):
    inventory_access(current_user)
    db = SessionLocal()
    try:
        item = db.query(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.user_id == current_user.id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found.")
        db.delete(item)
        db.commit()
        return {"message": "Inventory item removed."}
    finally:
        db.close()


# =========================================
# HISTORY API
# =========================================

@app.get("/history")
def get_history(current_user: User = Depends(get_current_user)):
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
def get_statistics(current_user: User = Depends(get_current_user)):
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


# =========================================
# RBAC DEMO ENDPOINT
# =========================================
