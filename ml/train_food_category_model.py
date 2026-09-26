import json
import random
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split

# ============================================================
# SETTINGS
# ============================================================

DATASET_DIR = Path(r"C:\Users\chbhavani\Downloads\Dataset")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = PROJECT_ROOT / "ml" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "food_category_model.keras"
LABELS_PATH = MODEL_DIR / "food_category_labels.json"

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 8
FINE_TUNE_EPOCHS = 4
SEED = 42

random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)


# ============================================================
# FOOD CLASSES FROM YOUR KAGGLE DATASET
# ============================================================

DISPLAY_NAMES = {
    "apple": "Apple",
    "banana": "Banana",
    "bellpepper": "Bell Pepper",
    "bittergroud": "Bitter Gourd",
    "capsicum": "Capsicum",
    "carrot": "Carrot",
    "cucumber": "Cucumber",
    "mango": "Mango",
    "okara": "Okra",
    "orange": "Orange",
    "potato": "Potato",
    "strawberry": "Strawberry",
    "tomato": "Tomato",
}


def get_food_name(folder_name):
    name = folder_name.lower().strip()

    if name.startswith("fresh"):
        name = name[5:]
    elif name.startswith("rotten"):
        name = name[6:]

    # Dataset spelling corrections
    aliases = {
        "bittergourd": "bittergroud",
        "capciscum": "capsicum",
    }

    name = aliases.get(name, name)

    if name in DISPLAY_NAMES:
        return name

    return None


# ============================================================
# FIND IMAGES
# ============================================================

if not DATASET_DIR.exists():
    raise FileNotFoundError(
        f"Dataset not found: {DATASET_DIR}"
    )

extensions = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}

image_paths = []
labels = []

for freshness_folder in ["Fresh", "Rotten"]:

    root = DATASET_DIR / freshness_folder

    if not root.exists():
        print(f"WARNING: Missing folder: {root}")
        continue

    for food_folder in sorted(root.iterdir()):

        if not food_folder.is_dir():
            continue

        food_name = get_food_name(food_folder.name)

        if food_name is None:
            print(
                f"Skipping unknown folder: {food_folder.name}"
            )
            continue

        for image in food_folder.rglob("*"):

            if (
                image.is_file()
                and image.suffix.lower() in extensions
            ):
                image_paths.append(str(image))
                labels.append(food_name)


# ============================================================
# CHECK DATASET
# ============================================================

if not image_paths:
    raise RuntimeError(
        "No images were found in the Kaggle dataset."
    )

class_names = sorted(DISPLAY_NAMES.keys())

label_to_id = {
    name: index
    for index, name in enumerate(class_names)
}

x = np.array(image_paths)

y = np.array(
    [
        label_to_id[label]
        for label in labels
    ],
    dtype=np.int32,
)

print()
print("=" * 60)
print("FOOD CATEGORY DATASET")
print("=" * 60)

print(f"Total images: {len(x)}")
print(f"Food classes: {len(class_names)}")

for name in class_names:

    count = int(
        np.sum(y == label_to_id[name])
    )

    print(
        f"{DISPLAY_NAMES[name]:20s} {count}"
    )


# ============================================================
# TRAIN / VALIDATION SPLIT
# ============================================================

x_train, x_val, y_train, y_val = train_test_split(
    x,
    y,
    test_size=0.20,
    random_state=SEED,
    stratify=y,
)


# ============================================================
# DATA PIPELINE
# ============================================================

AUTOTUNE = tf.data.AUTOTUNE


def load_image(path, label):

    image = tf.io.read_file(path)

    image = tf.image.decode_image(
        image,
        channels=3,
        expand_animations=False,
    )

    image = tf.image.resize(
        image,
        IMAGE_SIZE,
    )

    image = tf.cast(
        image,
        tf.float32,
    )

    return image, label


train_ds = (
    tf.data.Dataset.from_tensor_slices(
        (x_train, y_train)
    )
    .shuffle(
        len(x_train),
        seed=SEED,
    )
    .map(
        load_image,
        num_parallel_calls=AUTOTUNE,
    )
    .batch(BATCH_SIZE)
    .prefetch(AUTOTUNE)
)


val_ds = (
    tf.data.Dataset.from_tensor_slices(
        (x_val, y_val)
    )
    .map(
        load_image,
        num_parallel_calls=AUTOTUNE,
    )
    .batch(BATCH_SIZE)
    .prefetch(AUTOTUNE)
)


# ============================================================
# DATA AUGMENTATION
# ============================================================

augmentation = tf.keras.Sequential(
    [
        tf.keras.layers.RandomFlip(
            "horizontal"
        ),
        tf.keras.layers.RandomRotation(
            0.08
        ),
        tf.keras.layers.RandomZoom(
            0.10
        ),
    ],
    name="food_augmentation",
)


# ============================================================
# MOBILENETV2 MODEL
# ============================================================

base_model = tf.keras.applications.MobileNetV2(
    input_shape=(
        IMAGE_SIZE[0],
        IMAGE_SIZE[1],
        3,
    ),
    include_top=False,
    weights="imagenet",
)

base_model.trainable = False


inputs = tf.keras.Input(
    shape=(
        IMAGE_SIZE[0],
        IMAGE_SIZE[1],
        3,
    )
)

x_layer = augmentation(inputs)

x_layer = (
    tf.keras.applications.mobilenet_v2
    .preprocess_input(x_layer)
)

x_layer = base_model(
    x_layer,
    training=False,
)

x_layer = tf.keras.layers.GlobalAveragePooling2D()(
    x_layer
)

x_layer = tf.keras.layers.Dropout(0.25)(
    x_layer
)

outputs = tf.keras.layers.Dense(
    len(class_names),
    activation="softmax",
)(x_layer)


model = tf.keras.Model(
    inputs,
    outputs,
)


# ============================================================
# FIRST TRAINING PHASE
# ============================================================

model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=0.001
    ),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)


print()
print("=" * 60)
print("TRAINING FOOD CATEGORY MODEL")
print("=" * 60)

model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
)


# ============================================================
# FINE TUNING
# ============================================================

base_model.trainable = True

for layer in base_model.layers[:-30]:
    layer.trainable = False


model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=0.00001
    ),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)


print()
print("=" * 60)
print("FINE TUNING MODEL")
print("=" * 60)

model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=FINE_TUNE_EPOCHS,
)


# ============================================================
# SAVE MODEL
# ============================================================

model.save(MODEL_PATH)


with open(
    LABELS_PATH,
    "w",
    encoding="utf-8",
) as file:

    json.dump(
        {
            "classes": class_names,
            "display_names": DISPLAY_NAMES,
        },
        file,
        indent=2,
    )


# ============================================================
# FINAL VALIDATION
# ============================================================

loss, accuracy = model.evaluate(
    val_ds,
    verbose=0,
)


print()
print("=" * 60)
print("TRAINING COMPLETE")
print("=" * 60)

print(
    f"Validation accuracy: "
    f"{accuracy * 100:.2f}%"
)

print()
print("Model:")
print(MODEL_PATH)

print()
print("Labels:")
print(LABELS_PATH)