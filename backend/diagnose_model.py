from pathlib import Path
import json
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "model" / "food_freshness_model.keras"
CLASS_NAMES_PATH = BASE_DIR / "model" / "class_names.json"

DATASET_DIR = BASE_DIR.parent / "dataset"


# ============================================================
# SETTINGS
# ============================================================

IMAGES_PER_CLASS = 5
IMAGE_SIZE = (224, 224)

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


# ============================================================
# LOAD MODEL
# ============================================================

print("=" * 60)
print("FOOD FRESHNESS MODEL DIAGNOSTIC")
print("=" * 60)

print("\nLoading model...")

model = tf.keras.models.load_model(MODEL_PATH)

print("Model loaded successfully.")


# ============================================================
# LOAD CLASS NAMES
# ============================================================

with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

print(f"Classes loaded: {len(class_names)}")

print("\nClasses:")
for i, name in enumerate(class_names):
    print(f"{i:2d}. {name}")


# ============================================================
# FIND IMAGE
# ============================================================

def get_images(folder):
    if not folder.exists():
        return []

    images = [
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in VALID_EXTENSIONS
    ]

    return sorted(images)[:IMAGES_PER_CLASS]


# ============================================================
# PREDICT IMAGE
# ============================================================

def predict_image(image_path):

    try:
        image = Image.open(image_path).convert("RGB")
        image = image.resize(IMAGE_SIZE)

        image_array = np.array(image, dtype=np.float32)
        image_array = np.expand_dims(image_array, axis=0)

        image_array = preprocess_input(image_array)

        predictions = model.predict(image_array, verbose=0)[0]

        predicted_index = int(np.argmax(predictions))
        predicted_class = class_names[predicted_index]
        confidence = float(predictions[predicted_index]) * 100

        return predicted_class, confidence

    except Exception as e:
        print(f"ERROR: {e}")
        return None, 0


# ============================================================
# DIAGNOSTIC
# ============================================================

total_images = 0
total_correct = 0

class_results = []


print("\n")
print("=" * 60)
print("STARTING DIAGNOSTIC")
print("=" * 60)


for true_class in class_names:

    # --------------------------------------------------------
    # Convert class name:
    #
    # apple_fresh
    #     -> dataset/apple/fresh
    #
    # apple_rotten
    #     -> dataset/apple/rotten
    # --------------------------------------------------------

    if "_" not in true_class:
        print(f"\nSkipping invalid class: {true_class}")
        continue

    food, freshness = true_class.rsplit("_", 1)

    class_folder = DATASET_DIR / food / freshness

    images = get_images(class_folder)

    if not images:
        print(f"\n{true_class:<25} NO IMAGES FOUND")
        continue

    correct = 0

    predictions_for_class = []

    print(f"\nTesting {true_class}...")

    for image_path in images:

        predicted_class, confidence = predict_image(image_path)

        total_images += 1

        if predicted_class == true_class:
            correct += 1
            total_correct += 1

        predictions_for_class.append(
            (predicted_class, confidence, image_path.name)
        )

        print(
            f"  {image_path.name[:28]:<28} -> "
            f"{predicted_class:<22} "
            f"{confidence:6.2f}%"
        )

    accuracy = (correct / len(images)) * 100

    class_results.append(
        {
            "class": true_class,
            "correct": correct,
            "total": len(images),
            "accuracy": accuracy,
            "predictions": predictions_for_class,
        }
    )

    print(
        f"  RESULT: {correct}/{len(images)} correct "
        f"({accuracy:.1f}%)"
    )


# ============================================================
# FINAL SUMMARY
# ============================================================

print("\n\n")
print("=" * 60)
print("FINAL DIAGNOSTIC SUMMARY")
print("=" * 60)

print()

for result in class_results:

    status = "GOOD" if result["accuracy"] >= 60 else "PROBLEM"

    print(
        f"{result['class']:<25} "
        f"{result['correct']}/{result['total']} "
        f"({result['accuracy']:5.1f}%)   "
        f"{status}"
    )


# ============================================================
# OVERALL
# ============================================================

if total_images > 0:
    overall_accuracy = (total_correct / total_images) * 100
else:
    overall_accuracy = 0


print("\n")
print("=" * 60)
print("OVERALL RESULT")
print("=" * 60)

print(f"\nImages tested : {total_images}")
print(f"Correct       : {total_correct}")
print(f"Incorrect     : {total_images - total_correct}")
print(f"Accuracy      : {overall_accuracy:.2f}%")


# ============================================================
# WORST CLASSES
# ============================================================

print("\n")
print("=" * 60)
print("CLASSES NEEDING ATTENTION")
print("=" * 60)

problem_classes = [
    r for r in class_results
    if r["accuracy"] < 60
]

if problem_classes:

    for result in problem_classes:
        print(
            f"\n{result['class']} "
            f"({result['accuracy']:.1f}%)"
        )

        # Count predicted classes
        counts = {}

        for prediction, confidence, filename in result["predictions"]:

            if prediction not in counts:
                counts[prediction] = 0

            counts[prediction] += 1

        sorted_predictions = sorted(
            counts.items(),
            key=lambda x: x[1],
            reverse=True
        )

        print("  Mostly predicted as:")

        for prediction, count in sorted_predictions:
            print(
                f"    {prediction:<25} "
                f"{count}/{result['total']}"
            )

else:

    print("\nNo major class problems detected.")


print("\n")
print("=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)