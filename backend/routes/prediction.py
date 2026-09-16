from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
import tensorflow as tf
import numpy as np
import io
import os
import cv2

router = APIRouter(
    prefix="/predict",
    tags=["Food Freshness Prediction"]
)

# --------------------------------------------------
# Load the trained model
# --------------------------------------------------

MODEL_PATH = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(__file__)
        )
    ),
    "ml",
    "food_freshness_model_v3.keras"
)

model = tf.keras.models.load_model(MODEL_PATH)


# --------------------------------------------------
# Class names
# Must match the training class order
# --------------------------------------------------

CLASS_NAMES = [
    "freshapples",
    "freshbanana",
    "freshoranges",
    "rottenapples",
    "rottenbanana",
    "rottenoranges"
]


# --------------------------------------------------
# Color Degradation Analysis
# --------------------------------------------------

def analyze_color(image_array, food_type):

    try:

        hsv_image = cv2.cvtColor(
            image_array,
            cv2.COLOR_RGB2HSV
        )

        height, width = hsv_image.shape[:2]

        y1 = int(height * 0.20)
        y2 = int(height * 0.80)

        x1 = int(width * 0.20)
        x2 = int(width * 0.80)

        center_region = hsv_image[
            y1:y2,
            x1:x2
        ]

        average_hue = float(
            np.mean(center_region[:, :, 0])
        )

        average_saturation = float(
            np.mean(center_region[:, :, 1])
        )

        average_brightness = float(
            np.mean(center_region[:, :, 2])
        )

        saturation_score = min(
            100,
            (average_saturation / 255) * 100
        )

        brightness_score = min(
            100,
            (average_brightness / 255) * 100
        )

        color_score = round(
            (saturation_score * 0.60) +
            (brightness_score * 0.40)
        )

        if color_score >= 70:

            color_condition = "Good color condition"

        elif color_score >= 45:

            color_condition = "Moderate color degradation"

        else:

            color_condition = "High color degradation"

        return {
            "color_score": color_score,
            "color_condition": color_condition,
            "average_hue": round(
                average_hue,
                2
            ),
            "average_saturation": round(
                average_saturation,
                2
            ),
            "average_brightness": round(
                average_brightness,
                2
            )
        }

    except Exception:

        return {
            "color_score": 50,
            "color_condition": "Color analysis unavailable",
            "average_hue": 0,
            "average_saturation": 0,
            "average_brightness": 0
        }


# --------------------------------------------------
# Surface Texture Analysis
# --------------------------------------------------

def analyze_texture(image_array):

    try:

        # Convert RGB image to grayscale
        gray_image = cv2.cvtColor(
            image_array,
            cv2.COLOR_RGB2GRAY
        )

        # Use the central region to reduce
        # background influence.
        height, width = gray_image.shape

        y1 = int(height * 0.20)
        y2 = int(height * 0.80)

        x1 = int(width * 0.20)
        x2 = int(width * 0.80)

        center_region = gray_image[
            y1:y2,
            x1:x2
        ]

        # Calculate texture variation.
        texture_variation = float(
            np.std(center_region)
        )

        # Convert variation into a
        # simple texture score.
        #
        # Lower variation = smoother surface
        # Higher variation = more surface variation

        texture_score = max(
            0,
            min(
                100,
                100 - (texture_variation * 1.5)
            )
        )

        texture_score = round(
            texture_score,
            2
        )

        # Descriptive texture condition
        if texture_score >= 70:

            texture_condition = "Smooth texture"

        elif texture_score >= 45:

            texture_condition = "Moderate texture variation"

        else:

            texture_condition = "High texture variation"

        return {
            "texture_score": texture_score,
            "texture_condition": texture_condition,
            "texture_variation": round(
                texture_variation,
                2
            )
        }

    except Exception:

        return {
            "texture_score": 50,
            "texture_condition": "Texture analysis unavailable",
            "texture_variation": 0
        }


# --------------------------------------------------
# Prediction API
# --------------------------------------------------

@router.post("/")
async def predict_food(
    file: UploadFile = File(...)
):

    # Check whether uploaded file is an image
    if (
        not file.content_type
        or not file.content_type.startswith("image/")
    ):

        raise HTTPException(
            status_code=400,
            detail="Please upload an image file."
        )

    try:

        # --------------------------------------------------
        # Read uploaded image
        # --------------------------------------------------

        image_data = await file.read()

        image = Image.open(
            io.BytesIO(image_data)
        ).convert("RGB")

        # --------------------------------------------------
        # Resize image for ML model
        # --------------------------------------------------

        image = image.resize(
            (224, 224)
        )

        # Convert image to NumPy array
        image_array = np.array(image)

        # --------------------------------------------------
        # Make ML prediction
        # --------------------------------------------------

        model_input = np.expand_dims(
            image_array,
            axis=0
        )

        predictions = model.predict(
            model_input,
            verbose=0
        )

        predicted_index = np.argmax(
            predictions[0]
        )

        predicted_class = CLASS_NAMES[
            predicted_index
        ]

        confidence = float(
            predictions[0][predicted_index]
        )

        # --------------------------------------------------
        # Determine food type
        # --------------------------------------------------

        if "apple" in predicted_class:

            food_type = "Apple"

        elif "banana" in predicted_class:

            food_type = "Banana"

        elif "orange" in predicted_class:

            food_type = "Orange"

        else:

            food_type = "Food"

        # --------------------------------------------------
        # Determine AI freshness status
        # --------------------------------------------------

        if predicted_class.startswith("fresh"):

            ai_status = "Fresh"

        else:

            ai_status = "Spoiled"

        # --------------------------------------------------
        # Color degradation analysis
        # --------------------------------------------------

        color_analysis = analyze_color(
            image_array,
            food_type
        )

        # --------------------------------------------------
        # Surface texture analysis
        # --------------------------------------------------

        texture_analysis = analyze_texture(
            image_array
        )

        # --------------------------------------------------
        # Return prediction
        # --------------------------------------------------

        return {

            "prediction": predicted_class,

            "confidence": round(
                confidence * 100,
                2
            ),

            "food_type": food_type,

            "status": ai_status,

            "color_analysis": color_analysis,

            "texture_analysis": texture_analysis
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )