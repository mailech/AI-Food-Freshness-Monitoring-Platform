from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

import shutil
import uuid
import os
import smtplib
import json

import numpy as np
import tensorflow as tf

from PIL import Image
from email.message import EmailMessage


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

    if not MODEL_PATH.exists():

        print(
            "WARNING: ML model not found."
        )

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

    if (
        not file.content_type
        or not file.content_type.startswith("image/")
    ):

        return {

            "success": False,

            "message":
                "Please upload a valid image file."

        }


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

    if not data.password:

        return {

            "success": False,

            "message":
                "Password is required."

        }


    if len(data.password) < 6:

        return {

            "success": False,

            "message":
                "Password must be at least 6 characters."

        }


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

    image = Image.open(
        image_path
    ).convert("RGB")


    image = image.resize(
        (224, 224)
    )


    image_array = np.array(
        image,
        dtype=np.float32
    )


    image_array = np.expand_dims(
        image_array,
        axis=0
    )


    # MobileNetV2 preprocessing
    image_array = (
        tf.keras.applications
        .mobilenet_v2
        .preprocess_input(
            image_array
        )
    )


    return image_array


# =========================================================
# GET SHELF LIFE
# =========================================================

def get_shelf_life(
    food_name,
    freshness
):

    food = food_name.lower()


    if freshness == "Rotten":

        return "0 Days"


    shelf_life = {

        "apple": "~7 Days",

        "banana": "~4 Days",

        "bellpepper": "~7 Days",

        "carrot": "~14 Days",

        "cucumber": "~5 Days",

        "grape": "~7 Days",

        "guava": "~5 Days",

        "jujube": "~7 Days",

        "mango": "~5 Days",

        "orange": "~10 Days",

        "pomegranate": "~14 Days",

        "potato": "~21 Days",

        "strawberry": "~3 Days",

        "tomato": "~6 Days"

    }


    return shelf_life.get(
        food,
        "~7 Days"
    )


# =========================================================
# GET FRESHNESS SCORE
# =========================================================

def get_freshness_score(
    freshness,
    confidence
):

    if freshness == "Fresh":

        score = 70 + (
            confidence * 0.30
        )

    else:

        score = (
            confidence * 0.30
        )


    return round(
        score
    )


# =========================================================
# FOOD ANALYSIS
# =========================================================

@app.post("/analyze")
async def analyze_food(
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
                "Please upload a valid food image."

        }


    # -----------------------------------------------------
    # CHECK MODEL
    # -----------------------------------------------------

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


    # -----------------------------------------------------
    # SAVE UPLOADED IMAGE
    # -----------------------------------------------------

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


    # -----------------------------------------------------
    # PREPROCESS IMAGE
    # -----------------------------------------------------

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


    # -----------------------------------------------------
    # MODEL PREDICTION
    # -----------------------------------------------------

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


    # -----------------------------------------------------
    # CLASS NAME
    # -----------------------------------------------------

    if predicted_index >= len(
        class_names
    ):

        return {

            "success": False,

            "message":
                "Invalid model class prediction."

        }


    predicted_class = class_names[
        predicted_index
    ]


    # -----------------------------------------------------
    # SPLIT FOOD + FRESHNESS
    # -----------------------------------------------------

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


    # -----------------------------------------------------
    # FORMAT FOOD NAME
    # -----------------------------------------------------

    food_name = (
        food_name
        .replace("_", " ")
        .title()
    )


    # -----------------------------------------------------
    # FRESHNESS SCORE
    # -----------------------------------------------------

    freshness_score = get_freshness_score(
        freshness,
        confidence
    )


    # -----------------------------------------------------
    # SHELF LIFE
    # -----------------------------------------------------

    shelf_life = get_shelf_life(
        food_name,
        freshness
    )


    # -----------------------------------------------------
    # RECOMMENDATION
    # -----------------------------------------------------

    if freshness == "Fresh":

        recommendation = (
            "The food appears fresh and "
            "can be safely stored."
        )

    elif freshness == "Rotten":

        recommendation = (
            "The food appears spoiled. "
            "Avoid consuming it."
        )

    else:

        recommendation = (
            "Unable to determine freshness."
        )


    # -----------------------------------------------------
    # RESULT
    # -----------------------------------------------------

    result = {

        "food":
            food_name,

        "freshness":
            freshness,

        "freshness_score":
            freshness_score,

        "confidence":
            round(
                confidence,
                2
            ),

        "shelf_life":
            shelf_life,

        "recommendation":
            recommendation

    }


    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {

        "success": True,

        "message":
            "Food image analyzed successfully",

        "filename":
            unique_filename,

        "result":
            result

    }