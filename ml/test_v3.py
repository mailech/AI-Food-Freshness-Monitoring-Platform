import tensorflow as tf
from PIL import Image
import numpy as np

MODEL_PATH = "ml/food_freshness_model_v3.keras"

model = tf.keras.models.load_model(MODEL_PATH)

CLASS_NAMES = [
    "freshapples",
    "freshbanana",
    "freshoranges",
    "rottenapples",
    "rottenbanana",
    "rottenoranges"
]

image_path = input("Enter image path: ").strip().strip('"')

image = Image.open(image_path).convert("RGB")
image = image.resize((224, 224))

image_array = np.array(image)
image_array = np.expand_dims(image_array, axis=0)

predictions = model.predict(image_array, verbose=0)

predicted_index = np.argmax(predictions[0])
predicted_class = CLASS_NAMES[predicted_index]
confidence = float(predictions[0][predicted_index]) * 100

print()
print("V3 Prediction:", predicted_class)
print("V3 Confidence:", round(confidence, 2), "%")