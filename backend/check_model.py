import json
import numpy as np
import tensorflow as tf
from pathlib import Path
from PIL import Image

# =========================
# PATHS
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "backend" / "model" / "food_freshness_model.keras"
CLASS_NAMES_PATH = BASE_DIR / "backend" / "model" / "class_names.json"
DATASET_DIR = BASE_DIR / "dataset"

# =========================
# LOAD MODEL
# =========================

print("Loading model...")

model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

print("Model loaded successfully.")
print("Classes:", len(class_names))

# =========================
# PREDICTION FUNCTION
# =========================

def predict_image(image_path):

    image = Image.open(image_path).convert("RGB")
    image = image.resize((224, 224))

    image_array = np.array(image, dtype=np.float32)
    image_array = np.expand_dims(image_array, axis=0)

    image_array = tf.keras.applications.mobilenet_v2.preprocess_input(
        image_array
    )

    predictions = model.predict(image_array, verbose=0)[0]

    predicted_index = np.argmax(predictions)

    return (
        class_names[predicted_index],
        predictions[predicted_index] * 100
    )


# =========================
# TEST IMAGES
# =========================

print("\nChecking sample images...")
print("========================")

total = 0
correct = 0

foods = [
    "apple",
    "banana",
    "cucumber",
    "tomato",
    "mango",
    "orange",
    "strawberry"
]

for food in foods:

    food_dir = DATASET_DIR / food

    for freshness in ["fresh", "rotten"]:

        folder = food_dir / freshness

        if not folder.exists():
            continue

        images = list(folder.glob("*.jpg")) + list(folder.glob("*.jpeg")) + list(folder.glob("*.png"))

        if len(images) == 0:
            continue

        # Test first image from each category
        image_path = images[0]

        expected = f"{food}_{freshness}"

        predicted, confidence = predict_image(image_path)

        total += 1

        if predicted == expected:
            correct += 1
            status = "CORRECT"
        else:
            status = "WRONG"

        print(
            f"{food:12} {freshness:8} | "
            f"Expected: {expected:20} | "
            f"Predicted: {predicted:20} | "
            f"{confidence:6.2f}% | {status}"
        )

print("\n========================")
print(f"Correct: {correct}/{total}")

if total > 0:
    print(f"Accuracy: {(correct / total) * 100:.2f}%")