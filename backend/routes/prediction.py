from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
import tensorflow as tf
import numpy as np
import io
import os

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
    "food_freshness_model.keras"
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
# Prediction API
# --------------------------------------------------

@router.post("/")
async def predict_food(
    file: UploadFile = File(...)
):

    # Check whether uploaded file is an image
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image file."
        )

    try:

        # Read uploaded image
        image_data = await file.read()

        # Open image
        image = Image.open(
            io.BytesIO(image_data)
        ).convert("RGB")

        # Resize image
        image = image.resize(
            (224, 224)
        )

        # Convert image to NumPy array
        image_array = np.array(image)

        # Add batch dimension
        image_array = np.expand_dims(
            image_array,
            axis=0
        )

        # Make prediction
        predictions = model.predict(
            image_array,
            verbose=0
        )

        # Get predicted class
        predicted_index = np.argmax(
            predictions[0]
        )

        predicted_class = CLASS_NAMES[
            predicted_index
        ]

        # Get confidence
        confidence = float(
            predictions[0][predicted_index]
        )

        return {
            "prediction": predicted_class,
            "confidence": round(
                confidence * 100,
                2
            )
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )