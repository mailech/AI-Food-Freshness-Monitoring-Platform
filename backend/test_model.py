import sys
import json
from pathlib import Path

import tensorflow as tf
import numpy as np
from PIL import Image
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input


# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "model" / "food_freshness_model.keras"
CLASS_NAMES_PATH = BASE_DIR / "model" / "class_names.json"


# --------------------------------------------------
# LOAD MODEL
# --------------------------------------------------

print("Loading model...")

model = tf.keras.models.load_model(MODEL_PATH)

print("Model loaded successfully.")


# --------------------------------------------------
# LOAD CLASS NAMES
# --------------------------------------------------

with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

print(f"Classes loaded: {len(class_names)}")


# --------------------------------------------------
# GET IMAGE PATH
# --------------------------------------------------

if len(sys.argv) > 1:
    image_path = sys.argv[1]
else:
    image_path = input("Enter image path: ").strip()

# Remove accidental surrounding quotes/spaces
image_path = image_path.strip().strip('"').strip("'").strip()

image_path = Path(image_path)


# --------------------------------------------------
# CHECK IMAGE
# --------------------------------------------------

if not image_path.exists():
    print("\nERROR: Image file not found.")
    print("Path:", image_path)
    sys.exit(1)

print("\nTesting image:")
print(image_path)


# --------------------------------------------------
# LOAD + PREPROCESS IMAGE
# --------------------------------------------------

image = Image.open(image_path).convert("RGB")
image = image.resize((224, 224))

image_array = np.array(image)
image_array = np.expand_dims(image_array, axis=0)

image_array = preprocess_input(image_array)


# --------------------------------------------------
# PREDICTION
# --------------------------------------------------

predictions = model.predict(image_array, verbose=0)[0]

top_indices = np.argsort(predictions)[::-1][:5]


# --------------------------------------------------
# DISPLAY TOP 5
# --------------------------------------------------

print("\n========================================")
print("TOP 5 PREDICTIONS")
print("========================================")

for rank, index in enumerate(top_indices, start=1):

    class_name = class_names[index]
    confidence = predictions[index] * 100

    print(
        f"{rank}. {class_name:<25} {confidence:.2f}%"
    )

print("========================================")