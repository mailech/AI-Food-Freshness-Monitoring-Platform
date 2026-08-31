import json
import numpy as np
import tensorflow as tf
from PIL import Image

MODEL_PATH = "model/food_freshness_model.keras"
CLASS_NAMES_PATH = "model/class_names.json"

model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASS_NAMES_PATH, "r") as f:
    class_names = json.load(f)

image_path = input("Enter image path: ")

image = Image.open(image_path).convert("RGB")
image = image.resize((224, 224))

image_array = np.array(image, dtype=np.float32)
image_array = np.expand_dims(image_array, axis=0)

image_array = tf.keras.applications.mobilenet_v2.preprocess_input(
    image_array
)

predictions = model.predict(image_array, verbose=0)[0]

top_indices = np.argsort(predictions)[::-1][:5]

print("\nTop 5 predictions:")
print("====================")

for index in top_indices:
    print(
        f"{class_names[index]} : "
        f"{predictions[index] * 100:.2f}%"
    )