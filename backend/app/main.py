from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status
from app.mqtt_sensor import start_mqtt, get_sensor_data
from app.auth import (
    ALLOWED_ROLES,
    find_user,
    create_user,
    verify_password,
    create_access_token,
    verify_token,
    has_permission
)
from fastapi import Body
from app.database import get_db
from sqlalchemy.orm import Session
from app.models import FoodAnalysis, InventoryItem, FoodBatch
from dotenv import load_dotenv
from datetime import datetime, timezone
from fastapi import Form
import shutil
import uuid
import os
import smtplib
import json

import numpy as np
import tensorflow as tf

from PIL import Image
from email.message import EmailMessage

from app.freshness_engine import (
    calculate_freshness_score,
    calculate_storage_score,
    calculate_product_age_score,
    calculate_shelf_life_score,
    analyze_visual_condition,
    calculate_adjusted_shelf_life,
)


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    
    title="Food Freshness Monitoring Platform",
    description="AI-powered food freshness monitoring and shelf-life prediction platform",
    version="1.0.0"
)
mqtt_client = start_mqtt()
# =========================================================
# JWT AUTHENTICATION
# =========================================================
security = HTTPBearer()

# =========================================================
# CURRENT USER / RBAC
# =========================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Validate JWT token and return the logged-in user.
    """

    token = credentials.credentials

    user_data = verify_token(token)

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )

    user = find_user(user_data["email"], db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    return {
        "id": user.id,
        "name": user.username,
        "email": user.email,
        "role": user.role
    }

def require_permission(permission: str):
    """
    Check whether the logged-in user's role
    has the required permission.
    """

    def permission_checker(
        current_user: dict = Depends(get_current_user)
    ):

        role = current_user["role"]

        if not has_permission(role, permission):

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. "
                    f"The {role} role does not have "
                    f"permission for {permission}."
                )
            )

        return current_user

    return permission_checker

# =========================================================
# CORS
# =========================================================

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


# =========================================================
# DIRECTORIES
# =========================================================

# main.py is inside:
# backend/app/main.py
#
# parent       = backend/app
# parent.parent = backend

BASE_DIR = Path(__file__).resolve().parent.parent

RAW_DATASET_DIR = BASE_DIR / "dataset" / "raw"

MODEL_DIR = BASE_DIR / "model"

MODEL_PATH = MODEL_DIR / "food_freshness_model.keras"

CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"


RAW_DATASET_DIR.mkdir(
    parents=True,
    exist_ok=True
)

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# =========================================================
# LOAD ML MODEL
# =========================================================

model = None
class_names = []


def load_ml_model():

    global model
    global class_names

    # -----------------------------------------------------
    # LOAD MODEL
    # -----------------------------------------------------

    if not MODEL_PATH.exists():

        print("WARNING: ML model not found.")

        print(
            f"Expected model: {MODEL_PATH}"
        )

        return

    try:

        model = tf.keras.models.load_model(
            MODEL_PATH
        )

        print(
            "ML model loaded successfully."
        )

    except Exception as e:

        print(
            "MODEL LOAD ERROR:",
            str(e)
        )

        model = None

    # -----------------------------------------------------
    # LOAD CLASS NAMES
    # -----------------------------------------------------

    if CLASS_NAMES_PATH.exists():

        try:

            with open(
                CLASS_NAMES_PATH,
                "r"
            ) as file:

                class_names = json.load(
                    file
                )

            print(
                "Class names loaded successfully."
            )

            print(
                f"Classes: {class_names}"
            )

        except Exception as e:

            print(
                "CLASS NAMES ERROR:",
                str(e)
            )

            class_names = []


# =========================================================
# LOAD MODEL ON STARTUP
# =========================================================

load_ml_model()

# =========================================================
# AUTHENTICATION MODELS
# =========================================================

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str
    role: str


# =========================================================
# REGISTER
# =========================================================

@app.post("/register")
def register_user(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):

    email = data.email.lower().strip()
    role = data.role.lower().strip()

    # Validate role
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Invalid account role."
        )

    # Validate name
    if not data.name.strip():
        raise HTTPException(
            status_code=400,
            detail="Name is required."
        )

    # Validate password
    if len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters."
        )

    # Check existing email
    existing_user = find_user(email, db)

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists."
        )

    # Create PostgreSQL user
    new_user = create_user(
        username=data.name.strip(),
        email=email,
        password=data.password,
        role=role,
        db=db
    )

    if not new_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists."
        )

    return {
        "success": True,
        "message": "Account created successfully.",
        "user": {
            "name": new_user.username,
            "email": new_user.email,
            "role": new_user.role
        }
    }
# =========================================================
# LOGIN
# =========================================================

@app.post("/login")
def login_user(
    data: LoginRequest,
    db: Session = Depends(get_db)
):

    email = data.email.lower().strip()
    role = data.role.lower().strip()

    user = find_user(email, db)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    # Verify password
    if not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    # Verify selected role
    if user.role != role:
        raise HTTPException(
            status_code=403,
            detail="Selected account type does not match this account."
        )

    # Create JWT
    access_token = create_access_token(
        {
            "sub": user.email,
            "role": user.role
        }
    )

    return {
        "success": True,
        "message": "Login successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "name": user.username,
            "email": user.email,
            "role": user.role
        }
    }
# =========================================================
# CURRENT USER
# =========================================================
@app.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "user": current_user
    }

    
# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message":
            "Food Freshness Monitoring Platform API is running"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy"
    }


# =========================================================
# MODEL STATUS
# =========================================================

@app.get("/model-status")
def model_status():

    return {

        "model_loaded":
            model is not None,

        "classes_loaded":
            len(class_names) > 0,

        "number_of_classes":
            len(class_names),

        "model_path":
            str(MODEL_PATH)

    }


# =========================================================
# UPLOAD FOOD IMAGE
# =========================================================

@app.post("/upload")
async def upload_food_image(
    file: UploadFile = File(...)
):

    # -----------------------------------------------------
    # VALIDATE FILE
    # -----------------------------------------------------

    if (
        not file.content_type
        or not file.content_type.startswith("image/")
    ):

        return {

            "success": False,

            "message":
                "Please upload a valid image file."

        }


    # -----------------------------------------------------
    # CREATE UNIQUE FILE NAME
    # -----------------------------------------------------

    file_extension = Path(
        file.filename
    ).suffix


    unique_filename = (
        f"{uuid.uuid4()}{file_extension}"
    )


    # -----------------------------------------------------
    # SAVE IMAGE
    # -----------------------------------------------------

    file_path = (
        RAW_DATASET_DIR /
        unique_filename
    )


    with file_path.open("wb") as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )


    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {

        "success": True,

        "message":
            "Food image uploaded successfully",

        "original_filename":
            file.filename,

        "saved_filename":
            unique_filename,

        "content_type":
            file.content_type

    }


# =========================================================
# FORGOT PASSWORD REQUEST MODEL
# =========================================================

class ForgotPasswordRequest(BaseModel):

    email: str


# =========================================================
# FORGOT PASSWORD
# =========================================================

@app.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest
):

    # -----------------------------------------------------
    # CHECK EMAIL CONFIGURATION
    # -----------------------------------------------------

    if (
        not EMAIL_ADDRESS
        or not EMAIL_PASSWORD
    ):

        return {

            "success": False,

            "message":
                "Email configuration is missing."

        }


    try:

        # -------------------------------------------------
        # RESET PASSWORD LINK
        # -------------------------------------------------

        reset_link = (
            "http://localhost:5173/reset-password"
        )


        # -------------------------------------------------
        # CREATE EMAIL
        # -------------------------------------------------

        message = EmailMessage()


        message["Subject"] = (
            "FoodFresh - Password Reset"
        )


        message["From"] = EMAIL_ADDRESS


        message["To"] = data.email


        # -------------------------------------------------
        # PLAIN TEXT VERSION
        # -------------------------------------------------

        message.set_content(
            f"""
Hello,

We received a request to reset your FoodFresh password.

Click the link below to reset your password:

{reset_link}

If you did not request this password reset,
you can safely ignore this email.

Regards,
FoodFresh AI Platform
"""
        )


        # -------------------------------------------------
        # HTML VERSION
        # -------------------------------------------------

        message.add_alternative(
            f"""
<html>

<body
style="
font-family: Arial, sans-serif;
background-color: #f5f7f5;
padding: 30px;
"
>

<div
style="
max-width: 600px;
margin: auto;
background: white;
padding: 35px;
border-radius: 12px;
"
>

<h2
style="
color: #2e7d32;
margin-bottom: 25px;
"
>
FoodFresh
</h2>

<p>
Hello,
</p>

<p>
We received a request to reset your
FoodFresh account password.
</p>

<p>
Click the button below to reset your password:
</p>

<div
style="
margin: 30px 0;
"
>

<a
href="{reset_link}"
style="
display: inline-block;
padding: 14px 28px;
background-color: #2e7d32;
color: white;
text-decoration: none;
border-radius: 8px;
font-weight: bold;
font-size: 16px;
"
>
Reset Password
</a>

</div>

<p
style="
font-size: 14px;
color: #666;
"
>
If the button does not work, copy and paste
the following link into your browser:
</p>

<p
style="
font-size: 13px;
color: #2e7d32;
"
>
{reset_link}
</p>

<p>
If you did not request this password reset,
you can safely ignore this email.
</p>

<p>
Regards,<br>
<strong>FoodFresh AI Platform</strong>
</p>

</div>

</body>

</html>
""",
            subtype="html"
        )


        # -------------------------------------------------
        # SEND EMAIL THROUGH GMAIL
        # -------------------------------------------------

        with smtplib.SMTP(
            "smtp.gmail.com",
            587
        ) as server:

            server.starttls()

            server.login(
                EMAIL_ADDRESS,
                EMAIL_PASSWORD
            )

            server.send_message(
                message
            )


        return {

            "success": True,

            "message":
                "Password reset email sent successfully."

        }


    except Exception as e:

        print(
            "EMAIL ERROR:",
            str(e)
        )


        return {

            "success": False,

            "message":
                "Unable to send email."

        }


# =========================================================
# RESET PASSWORD REQUEST MODEL
# =========================================================

class ResetPasswordRequest(BaseModel):

    password: str

    confirm_password: str


# =========================================================
# RESET PASSWORD
# =========================================================

@app.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest
):

    # -----------------------------------------------------
    # CHECK PASSWORD
    # -----------------------------------------------------

    if not data.password:

        return {

            "success": False,

            "message":
                "Password is required."

        }


    # -----------------------------------------------------
    # PASSWORD LENGTH
    # -----------------------------------------------------

    if len(data.password) < 6:

        return {

            "success": False,

            "message":
                "Password must be at least 6 characters."

        }


    # -----------------------------------------------------
    # CONFIRM PASSWORD
    # -----------------------------------------------------

    if data.password != data.confirm_password:

        return {

            "success": False,

            "message":
                "Passwords do not match."

        }


    return {

        "success": True,

        "message":
            "Password updated successfully."

    }


# =========================================================
# PREPROCESS IMAGE
# =========================================================

def preprocess_image(
    image_path
):

    # -----------------------------------------------------
    # OPEN IMAGE
    # -----------------------------------------------------

    image = Image.open(
        image_path
    ).convert("RGB")


    # -----------------------------------------------------
    # RESIZE
    # -----------------------------------------------------

    image = image.resize(
        (224, 224)
    )


    # -----------------------------------------------------
    # CONVERT TO NUMPY
    # -----------------------------------------------------

    image_array = np.array(
        image,
        dtype=np.float32
    )


    # -----------------------------------------------------
    # ADD BATCH DIMENSION
    # -----------------------------------------------------

    image_array = np.expand_dims(
        image_array,
        axis=0
    )


    # -----------------------------------------------------
    # MOBILE NET V2 PREPROCESSING
    # -----------------------------------------------------

    image_array = (
        tf.keras.applications
        .mobilenet_v2
        .preprocess_input(
            image_array
        )
    )


    return image_array


# =========================================================
# EXPECTED SHELF LIFE
# =========================================================

EXPECTED_SHELF_LIFE = {

    "apple": 7,

    "banana": 4,

    "bellpepper": 7,

    "carrot": 14,

    "cucumber": 5,

    "grape": 7,

    "guava": 5,

    "jujube": 7,

    "mango": 5,

    "orange": 10,

    "pomegranate": 14,

    "potato": 21,

    "strawberry": 3,

    "tomato": 6

}


# =========================================================
# GET EXPECTED SHELF LIFE
# =========================================================

def get_expected_shelf_life(
    food_name
):

    food_key = (
        food_name
        .lower()
        .replace(" ", "")
    )

    return EXPECTED_SHELF_LIFE.get(
        food_key,
        7
    )


# =========================================================
# FOOD ANALYSIS
# =========================================================

@app.post("/analyze")
async def analyze_food(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),

    # -----------------------------------------------------
    # STORAGE INFORMATION
    # -----------------------------------------------------

    temperature: float = Form(6.0),

    humidity: float = Form(65.0),

    storage_duration: int = Form(0),

    product_age_days: int = Form(0),

    air_circulation: str = Form("Good"),

    light_exposure: str = Form("Low"),

    packaging: str = Form("Proper")

):

    # =====================================================
    # VALIDATE IMAGE
    # =====================================================

    if (
        not file.content_type
        or not file.content_type.startswith("image/")
    ):

        return {

            "success": False,

            "message":
                "Please upload a valid food image."

        }


    # =====================================================
    # CHECK MODEL
    # =====================================================

    if model is None:

        return {

            "success": False,

            "message":
                "AI model is not loaded. Please train the model first."

        }


    if not class_names:

        return {

            "success": False,

            "message":
                "Class names are not available."

        }


    # =====================================================
    # SAVE UPLOADED IMAGE
    # =====================================================

    file_extension = Path(
        file.filename
    ).suffix


    unique_filename = (
        f"{uuid.uuid4()}{file_extension}"
    )


    file_path = (
        RAW_DATASET_DIR /
        unique_filename
    )


    with file_path.open("wb") as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )


    # =====================================================
    # PREPROCESS IMAGE
    # =====================================================

    try:

        processed_image = preprocess_image(
            file_path
        )

    except Exception as e:

        print(
            "IMAGE PROCESSING ERROR:",
            str(e)
        )


        return {

            "success": False,

            "message":
                "Unable to process the uploaded image."

        }


    # =====================================================
    # MODEL PREDICTION
    # =====================================================

    try:

        predictions = model.predict(
            processed_image,
            verbose=0
        )


        probabilities = predictions[0]


        predicted_index = int(
            np.argmax(
                probabilities
            )
        )


        confidence = float(
            probabilities[predicted_index]
        ) * 100


    except Exception as e:

        print(
            "PREDICTION ERROR:",
            str(e)
        )


        return {

            "success": False,

            "message":
                "Unable to analyze the image."

        }


    # =====================================================
    # CHECK CLASS INDEX
    # =====================================================

    if predicted_index >= len(
        class_names
    ):

        return {

            "success": False,

            "message":
                "Invalid model class prediction."

        }


    # =====================================================
    # GET CLASS NAME
    # =====================================================

    predicted_class = class_names[
        predicted_index
    ]


    # =====================================================
    # SPLIT FOOD + FRESHNESS
    # =====================================================

    if predicted_class.endswith(
        "_fresh"
    ):

        freshness = "Fresh"

        food_name = predicted_class[
            :-len("_fresh")
        ]


    elif predicted_class.endswith(
        "_rotten"
    ):

        freshness = "Rotten"

        food_name = predicted_class[
            :-len("_rotten")
        ]


    else:

        food_name = predicted_class

        freshness = "Unknown"


    # =====================================================
    # FORMAT FOOD NAME
    # =====================================================

    food_name = (
        food_name
        .replace("_", " ")
        .title()
    )


    # =====================================================
    # EXPECTED SHELF LIFE
    # =====================================================

    expected_days = get_expected_shelf_life(
        food_name
    )


    # =====================================================
    # VISUAL SCORE
    # =====================================================
    #
    # Current MobileNetV2 model provides the visual
    # classification confidence.
    #
    # Fresh prediction:
    # confidence is used as visual quality.
    #
    # Rotten prediction:
    # confidence is inverted so a strong rotten
    # prediction gives a low visual score.
    #
    # Later we will extend this with:
    # - color
    # - texture
    # - mold
    # - bruising
    # - physical damage
    #
    # =====================================================

    if freshness == "Fresh":

        visual_score = confidence

    elif freshness == "Rotten":

        visual_score = 100 - confidence

    else:

        visual_score = 50


    visual_score = round(
        max(
            0,
            min(
                100,
                visual_score
            )
        ),
        2
    )
    visual_analysis = analyze_visual_condition(file_path)
    


    # =====================================================
    # STORAGE SCORE
    # =====================================================

    storage_score = calculate_storage_score(

        temperature=temperature,

        humidity=humidity,

        air_circulation=air_circulation,

        light_exposure=light_exposure,

        packaging=packaging

    )


    # =====================================================
    # PRODUCT AGE SCORE
    # =====================================================

    product_age_score = calculate_product_age_score(

        age_days=product_age_days,

        expected_shelf_life_days=expected_days

    )


    # =====================================================
    # REMAINING SHELF LIFE
    # =====================================================
    #
    # Product age + storage duration are considered.
    #
    # Example:
    #
    # Expected shelf life = 7 days
    # Product age = 2 days
    # Storage duration = 1 day
    #
    # Remaining = 7 - 2 - 1
    #           = 4 days
    #
    # =====================================================

    remaining_days = calculate_adjusted_shelf_life(
    expected_days=expected_days,
    visual_score=visual_score,
    temperature=temperature,
    humidity=humidity,
    packaging=packaging,
    storage_duration=storage_duration,
    product_age_days=product_age_days
    )
    if freshness == "Rotten":
        remaining_days = 0

    # =====================================================
    # SHELF LIFE SCORE
    # =====================================================

    shelf_life_score = calculate_shelf_life_score(

        remaining_days=remaining_days,

        expected_shelf_life_days=expected_days

    )


    # =====================================================
    # FINAL FRESHNESS SCORE
    # =====================================================
    #
    # Required model:
    #
    # Visual       = 40%
    # Storage      = 25%
    # Shelf-life   = 20%
    # Product Age  = 15%
    #
    # =====================================================

    freshness_analysis = calculate_freshness_score(

        visual_score=visual_score,

        storage_score=storage_score,

        shelf_life_score=shelf_life_score,

        product_age_score=product_age_score

    )


    freshness_score = (
        freshness_analysis[
            "freshness_score"
        ]
    )


    freshness_classification = (
        freshness_analysis[
            "classification"
        ]
    )


    # =====================================================
    # SHELF LIFE DISPLAY
    # =====================================================

    if remaining_days == 0:

        shelf_life = "0 Days"

    elif remaining_days == 1:

        shelf_life = "~1 Day"

    else:

        shelf_life = (
            f"~{remaining_days} Days"
        )


    # =====================================================
    # RECOMMENDATION
    # =====================================================

    if freshness_classification == "Fresh":

        recommendation = (

            "The food appears fresh. "
            "Maintain the current storage "
            "conditions to preserve quality."

        )


    elif freshness_classification == "Good":

        recommendation = (

            "The food is in good condition. "
            "Continue proper storage and "
            "monitor its remaining shelf life."

        )


    elif freshness_classification == "Acceptable":

        recommendation = (

            "The food is acceptable but should "
            "be consumed soon and stored under "
            "suitable conditions."

        )


    elif freshness_classification == "Near Spoilage":

        recommendation = (

            "The food is approaching spoilage. "
            "Prioritize consumption and improve "
            "storage conditions."

        )


    else:

        recommendation = (

            "The food appears spoiled. "
            "Avoid consuming it and remove "
            "it from usable inventory."

        )


    # =====================================================
    # STORAGE WARNING
    # =====================================================

    storage_warning = None


    if storage_score < 60:

        storage_warning = (

            "Storage conditions are poor. "
            "Check temperature, humidity, "
            "packaging and storage environment."

        )

    elif storage_score < 80:

        storage_warning = (

            "Storage conditions could be improved "
            "to preserve food quality."

        )


    # =====================================================
    # RESULT
    # =====================================================

    result = {

        # -------------------------------------------------
        # FOOD
        # -------------------------------------------------

        "food":
            food_name,


        # -------------------------------------------------
        # AI IMAGE RESULT
        # -------------------------------------------------

        "freshness":
            freshness,

        "confidence":
            round(
                confidence,
                2
            ),


        # -------------------------------------------------
        # REQUIRED FRESHNESS RESULT
        # -------------------------------------------------

        "freshness_score":
            freshness_score,

        "classification":
            freshness_classification,


        # -------------------------------------------------
        # FRESHNESS COMPONENTS
        # -------------------------------------------------

        "visual_score":
            freshness_analysis[
                "components"
            ]["visual"],

        "storage_score":
            freshness_analysis[
                "components"
            ]["storage"],

        "shelf_life_score":
            freshness_analysis[
                "components"
            ]["shelf_life"],

        "product_age_score":
            freshness_analysis[
                "components"
            ]["product_age"],
        "visual_analysis":
            visual_analysis,


        # -------------------------------------------------
        # WEIGHTS
        # -------------------------------------------------

        "weights":
            freshness_analysis[
                "weights"
            ],


        # -------------------------------------------------
        # SHELF LIFE
        # -------------------------------------------------

        "expected_shelf_life_days":
            expected_days,

        "remaining_days":
            remaining_days,

        "shelf_life":
            shelf_life,


        # -------------------------------------------------
        # STORAGE
        # -------------------------------------------------

        "storage": {

            "temperature":
                temperature,

            "humidity":
                humidity,

            "storage_duration":
                storage_duration,

            "air_circulation":
                air_circulation,

            "light_exposure":
                light_exposure,

            "packaging":
                packaging

        },


        # -------------------------------------------------
        # ALERT / WARNING
        # -------------------------------------------------

        "storage_warning":
            storage_warning,


        # -------------------------------------------------
        # RECOMMENDATION
        # -------------------------------------------------

        "recommendation":
            recommendation

    }
    
        # =====================================================
    # SAVE ANALYSIS TO POSTGRESQL
    # =====================================================

    analysis_record = FoodAnalysis(
        user_id=current_user["id"],
        food=food_name,
        freshness=freshness,
        confidence=round(confidence, 2),
        freshness_score=freshness_score,
        classification=freshness_classification,
        visual_score=visual_score,
        expected_shelf_life_days=expected_days,
        remaining_days=remaining_days,
        temperature=temperature,
        humidity=humidity,
        packaging=packaging,
        storage_duration=storage_duration,
        recommendation=recommendation
    )

    db.add(analysis_record)
    db.commit()
    db.refresh(analysis_record)

    # =====================================================
    # FINAL API RESPONSE
    # =====================================================

    return {

        "success": True,

        "message":
            "Food image analyzed successfully",

        "filename":
            unique_filename,

        "result":
            result

    }
    
# =========================================================
# FRESHNESS HISTORY
# =========================================================

@app.get("/history")
def get_freshness_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    records = (
        db.query(FoodAnalysis)
        .filter(FoodAnalysis.user_id == current_user["id"])
        .order_by(FoodAnalysis.id.desc())
        .all()
    )

    return {
        "success": True,
        "history": [
            {
                "id": record.id,
                "food": record.food,
                "freshness": record.freshness,
                "confidence": record.confidence,
                "freshness_score": record.freshness_score,
                "classification": record.classification,
                "visual_score": record.visual_score,
                "expected_shelf_life_days": record.expected_shelf_life_days,
                "remaining_days": record.remaining_days,
                "temperature": record.temperature,
                "humidity": record.humidity,
                "packaging": record.packaging,
                "storage_duration": record.storage_duration,
                "recommendation": record.recommendation,
                "created_at": record.created_at
            }
            for record in records
        ]
    }
    
@app.post("/history/migrate-local")
def migrate_local_history(
    records: list = Body(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    imported = 0
    skipped = 0
    errors = []

    existing_records = (
        db.query(FoodAnalysis)
        .filter(
            FoodAnalysis.user_id == current_user["id"]
        )
        .all()
    )

    for record in records:
        try:
            food = record.get("food")
            score = float(record.get("score", 0))
            confidence = float(
                record.get("confidence", 0)
            )

            if not food:
                skipped += 1
                continue

            # Old localStorage ID is the JavaScript timestamp
            record_id = record.get("id")

            if record_id:
                record_time = datetime.fromtimestamp(
                    float(record_id) / 1000,
                    tz=timezone.utc
                )
            else:
                record_time = datetime.now(timezone.utc)

            # Check whether this exact analysis
            # is already present in PostgreSQL.
            duplicate = False

            for existing in existing_records:

                if existing.food != food:
                    continue

                existing_score = float(
                    existing.freshness_score or 0
                )

                if abs(existing_score - score) > 0.01:
                    continue

                if not existing.created_at:
                    continue

                existing_time = existing.created_at

                if existing_time.tzinfo is None:
                    existing_time = existing_time.replace(
                        tzinfo=timezone.utc
                    )

                difference = abs(
                    (
                        existing_time - record_time
                    ).total_seconds()
                )

                # Same food + same score + same time
                if difference <= 120:
                    duplicate = True
                    break

            if duplicate:
                skipped += 1
                continue

            new_record = FoodAnalysis(
                user_id=current_user["id"],
                food=food,
                freshness=record.get(
                    "freshness",
                    "Unknown"
                ),
                confidence=confidence,
                freshness_score=score,
                classification=record.get(
                    "freshness",
                    "Unknown"
                ),
                visual_score=float(
                    record.get("visualScore") or 0
                ),
                expected_shelf_life_days=None,
                remaining_days=None,
                temperature=None,
                humidity=None,
                packaging=None,
                storage_duration=None,
                recommendation=None,
                created_at=record_time
            )

            db.add(new_record)

            # Keep track so another identical record
            # in the same request isn't inserted twice.
            existing_records.append(new_record)

            imported += 1

        except Exception as e:
            errors.append(str(e))
            skipped += 1

    db.commit()

    return {
        "success": True,
        "message": "Local history migration completed",
        "total_received": len(records),
        "imported": imported,
        "skipped": skipped,
        "errors": errors
    }
# =========================================================
# MQTT SENSOR DATA
# =========================================================

@app.get("/sensor/{storage_id}")
def get_storage_sensor(storage_id: str):
    data = get_sensor_data(storage_id)

    if data is None:
        return {
            "success": False,
            "message": "No sensor data available",
            "storage_id": storage_id
        }

    return {
        "success": True,
        "storage_id": storage_id,
        "sensor": data
    }

@app.post("/inventory")
def create_inventory_item(
    food_name: str = Form(...),
    category: str = Form(...),
    quantity: float = Form(0),
    unit: str = Form("kg"),
    batch_id: str = Form(""),
    tracking_id: str = Form(""),
    freshness: str = Form(""),
    expiry_date: str = Form(""),
    temperature: float = Form(0),
    humidity: float = Form(0),
    storage_duration: int = Form(0),
    air_circulation: str = Form(""),
    light_exposure: str = Form(""),
    packaging: str = Form(""),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inventory_item = InventoryItem(
        user_id=current_user["id"],
        food_name=food_name,
        category=category,
        quantity=quantity,
        unit=unit,
        batch_id=batch_id,
        tracking_id=tracking_id,
        freshness=freshness,
        expiry_date=expiry_date,
        temperature=temperature,
        humidity=humidity,
        storage_duration=storage_duration,
        air_circulation=air_circulation,
        light_exposure=light_exposure,
        packaging=packaging
    )

    db.add(inventory_item)
    db.commit()
    db.refresh(inventory_item)

    return {
        "success": True,
        "message": "Inventory item added successfully",
        "item": {
            "id": inventory_item.id,
            "food_name": inventory_item.food_name,
            "category": inventory_item.category,
            "quantity": inventory_item.quantity,
            "unit": inventory_item.unit,
            "batch_id": inventory_item.batch_id,
            "tracking_id": inventory_item.tracking_id,
            "freshness": inventory_item.freshness,
            "expiry_date": inventory_item.expiry_date
        }
    }
    
@app.get("/inventory")
def get_inventory(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = (
        db.query(InventoryItem)
        .filter(InventoryItem.user_id == current_user["id"])
        .order_by(InventoryItem.id.desc())
        .all()
    )

    return {
        "success": True,
        "items": [
            {
                "id": item.id,
                "food_name": item.food_name,
                "category": item.category,
                "quantity": item.quantity,
                "unit": item.unit,
                "batch_id": item.batch_id,
                "tracking_id": item.tracking_id,
                "freshness": item.freshness,
                "expiry_date": item.expiry_date,
                "temperature": item.temperature,
                "humidity": item.humidity,
                "storage_duration": item.storage_duration,
                "air_circulation": item.air_circulation,
                "light_exposure": item.light_exposure,
                "packaging": item.packaging,
                "created_at": item.created_at
            }
            for item in items
        ]
    }
@app.delete("/inventory/{item_id}")
def delete_inventory_item(
    item_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.id == item_id,
            InventoryItem.user_id == current_user["id"]
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )

    db.delete(item)
    db.commit()

    return {
        "success": True,
        "message": "Inventory item deleted successfully"
    } 
@app.post("/batches")
def create_batch(
    food_name: str = Form(...),
    category: str = Form(...),
    quantity: float = Form(0),
    unit: str = Form("kg"),
    freshness: str = Form("Fresh"),
    shelf_life: str = Form(""),
    temperature: float = Form(0),
    humidity: float = Form(0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prefix = food_name[:3].upper()
    batch_id = f"{prefix}-{int(datetime.now().timestamp())}"

    if freshness == "Spoiled":
        status = "Expired"
    elif freshness == "Near Spoilage":
        status = "Priority"
    else:
        status = "Active"

    batch = FoodBatch(
        user_id=current_user["id"],
        batch_id=batch_id,
        food_name=food_name,
        category=category,
        quantity=quantity,
        unit=unit,
        freshness=freshness,
        shelf_life=shelf_life,
        status=status,
        temperature=temperature,
        humidity=humidity
    )

    db.add(batch)
    db.commit()
    db.refresh(batch)

    return {
        "success": True,
        "message": "Food batch created successfully",
        "batch": {
            "id": batch.id,
            "batch_id": batch.batch_id,
            "food_name": batch.food_name,
            "category": batch.category,
            "quantity": batch.quantity,
            "unit": batch.unit,
            "freshness": batch.freshness,
            "shelf_life": batch.shelf_life,
            "status": batch.status,
            "temperature": batch.temperature,
            "humidity": batch.humidity,
            "created_at": batch.created_at
        }
    }
@app.get("/batches")
def get_batches(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    batches = (
        db.query(FoodBatch)
        .filter(FoodBatch.user_id == current_user["id"])
        .order_by(FoodBatch.id.desc())
        .all()
    )

    return {
        "success": True,
        "batches": [
            {
                "id": batch.id,
                "batch_id": batch.batch_id,
                "food_name": batch.food_name,
                "category": batch.category,
                "quantity": batch.quantity,
                "unit": batch.unit,
                "freshness": batch.freshness,
                "shelf_life": batch.shelf_life,
                "status": batch.status,
                "temperature": batch.temperature,
                "humidity": batch.humidity,
                "created_at": batch.created_at
            }
            for batch in batches
        ]
    }
@app.delete("/batches/{batch_id}")
def delete_batch(
    batch_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    batch = (
        db.query(FoodBatch)
        .filter(
            FoodBatch.id == batch_id,
            FoodBatch.user_id == current_user["id"]
        )
        .first()
    )

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Food batch not found"
        )

    db.delete(batch)
    db.commit()

    return {
        "success": True,
        "message": "Food batch deleted successfully"
    }