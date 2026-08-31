from pathlib import Path
import json
import random

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATASET_DIR = BASE_DIR / "dataset"
MODEL_DIR = BASE_DIR / "backend" / "model"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "food_freshness_model.keras"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"


# ============================================================
# SETTINGS
# ============================================================

IMG_SIZE = (224, 224)

BATCH_SIZE = 32

EPOCHS = 5

VALIDATION_SPLIT = 0.20

SEED = 42


# ============================================================
# START
# ============================================================

print("\n======================================")
print(" FOOD FRESHNESS MODEL TRAINING")
print("======================================\n")

print("Dataset:", DATASET_DIR)

if not DATASET_DIR.exists():
    raise FileNotFoundError(
        f"Dataset folder not found: {DATASET_DIR}"
    )


# ============================================================
# REPRODUCIBILITY
# ============================================================

random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)


# ============================================================
# FIND IMAGES
# ============================================================

image_extensions = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp"
}

image_paths = []
labels = []


food_folders = sorted(
    [
        folder
        for folder in DATASET_DIR.iterdir()
        if folder.is_dir()
    ]
)


print(
    f"Food folders found: {len(food_folders)}"
)


for food_folder in food_folders:

    food_name = food_folder.name.lower()

    fresh_folder = food_folder / "fresh"
    rotten_folder = food_folder / "rotten"


    # --------------------------------------------------------
    # FRESH
    # --------------------------------------------------------

    if fresh_folder.exists():

        for image_file in fresh_folder.rglob("*"):

            if (
                image_file.is_file()
                and image_file.suffix.lower()
                in image_extensions
            ):

                image_paths.append(
                    str(image_file)
                )

                labels.append(
                    f"{food_name}_fresh"
                )


    # --------------------------------------------------------
    # ROTTEN
    # --------------------------------------------------------

    if rotten_folder.exists():

        for image_file in rotten_folder.rglob("*"):

            if (
                image_file.is_file()
                and image_file.suffix.lower()
                in image_extensions
            ):

                image_paths.append(
                    str(image_file)
                )

                labels.append(
                    f"{food_name}_rotten"
                )


print(
    f"Total images found: {len(image_paths)}"
)


if len(image_paths) == 0:

    raise ValueError(
        "No images found inside dataset."
    )


# ============================================================
# CLASS NAMES
# ============================================================

class_names = sorted(
    list(set(labels))
)


print(
    f"Total classes: {len(class_names)}"
)

print("\nClasses:")

for index, class_name in enumerate(class_names):

    print(
        f"{index}: {class_name}"
    )


if len(class_names) != 28:

    print(
        f"\nWARNING: Expected 28 classes, "
        f"but found {len(class_names)}."
    )


class_to_index = {
    class_name: index
    for index, class_name in enumerate(class_names)
}


numeric_labels = np.array(
    [
        class_to_index[label]
        for label in labels
    ],
    dtype=np.int32
)


image_paths = np.array(
    image_paths
)


# ============================================================
# STRATIFIED TRAIN / VALIDATION SPLIT
# ============================================================

print("\n======================================")
print("STRATIFIED DATA SPLIT")
print("======================================")

train_paths = []
train_labels = []

validation_paths = []
validation_labels = []


for class_index, class_name in enumerate(class_names):

    class_indices = np.where(
        numeric_labels == class_index
    )[0]


    random.shuffle(
        class_indices
    )


    validation_count = max(
        1,
        int(
            len(class_indices)
            * VALIDATION_SPLIT
        )
    )


    val_indices = class_indices[
        :validation_count
    ]

    train_indices = class_indices[
        validation_count:
    ]


    for index in train_indices:

        train_paths.append(
            image_paths[index]
        )

        train_labels.append(
            numeric_labels[index]
        )


    for index in val_indices:

        validation_paths.append(
            image_paths[index]
        )

        validation_labels.append(
            numeric_labels[index]
        )


# ============================================================
# SHUFFLE TRAINING DATA
# ============================================================

train_combined = list(
    zip(
        train_paths,
        train_labels
    )
)

validation_combined = list(
    zip(
        validation_paths,
        validation_labels
    )
)


random.shuffle(
    train_combined
)

random.shuffle(
    validation_combined
)


train_paths = [
    item[0]
    for item in train_combined
]

train_labels = [
    item[1]
    for item in train_combined
]


validation_paths = [
    item[0]
    for item in validation_combined
]

validation_labels = [
    item[1]
    for item in validation_combined
]


print(
    f"Training images   : {len(train_paths)}"
)

print(
    f"Validation images : {len(validation_paths)}"
)


# ============================================================
# IMAGE LOADING
# ============================================================

def load_image(path, label):

    image = tf.io.read_file(path)

    image = tf.image.decode_image(
        image,
        channels=3,
        expand_animations=False
    )

    image = tf.image.resize(
        image,
        IMG_SIZE
    )

    image = tf.cast(
        image,
        tf.float32
    )

    return image, label


# ============================================================
# DATASETS
# ============================================================

train_dataset = tf.data.Dataset.from_tensor_slices(
    (
        train_paths,
        train_labels
    )
)


validation_dataset = tf.data.Dataset.from_tensor_slices(
    (
        validation_paths,
        validation_labels
    )
)


train_dataset = (
    train_dataset
    .map(
        load_image,
        num_parallel_calls=tf.data.AUTOTUNE
    )
    .shuffle(
        2000,
        seed=SEED
    )
    .batch(
        BATCH_SIZE
    )
    .prefetch(
        tf.data.AUTOTUNE
    )
)


validation_dataset = (
    validation_dataset
    .map(
        load_image,
        num_parallel_calls=tf.data.AUTOTUNE
    )
    .batch(
        BATCH_SIZE
    )
    .prefetch(
        tf.data.AUTOTUNE
    )
)


# ============================================================
# DATA AUGMENTATION
# ============================================================

data_augmentation = keras.Sequential(
    [

        layers.RandomFlip(
            "horizontal"
        ),

        layers.RandomRotation(
            0.10
        ),

        layers.RandomZoom(
            0.10
        ),

        layers.RandomContrast(
            0.10
        ),

    ],
    name="data_augmentation"
)


# ============================================================
# MOBILE NET V2
# ============================================================

base_model = tf.keras.applications.MobileNetV2(

    input_shape=(
        224,
        224,
        3
    ),

    include_top=False,

    weights="imagenet"
)


base_model.trainable = False


# ============================================================
# MODEL
# ============================================================

inputs = keras.Input(
    shape=(
        224,
        224,
        3
    )
)


x = data_augmentation(
    inputs
)


x = tf.keras.applications.mobilenet_v2.preprocess_input(
    x
)


x = base_model(
    x,
    training=False
)


x = layers.GlobalAveragePooling2D()(
    x
)


x = layers.Dropout(
    0.30
)(
    x
)


x = layers.Dense(
    256,
    activation="relu"
)(
    x
)


x = layers.Dropout(
    0.20
)(
    x
)


outputs = layers.Dense(
    len(class_names),
    activation="softmax"
)(
    x
)


model = keras.Model(
    inputs,
    outputs
)


# ============================================================
# COMPILE
# ============================================================

model.compile(

    optimizer=keras.optimizers.Adam(
        learning_rate=0.0005
    ),

    loss="sparse_categorical_crossentropy",

    metrics=[
        "accuracy"
    ]

)


# ============================================================
# CALLBACKS
# ============================================================

checkpoint = keras.callbacks.ModelCheckpoint(

    filepath=str(
        MODEL_PATH
    ),

    monitor="val_accuracy",

    mode="max",

    save_best_only=True,

    save_weights_only=False,

    verbose=1

)


early_stopping = keras.callbacks.EarlyStopping(

    monitor="val_accuracy",

    mode="max",

    patience=2,

    restore_best_weights=True,

    verbose=1

)


# ============================================================
# SAVE CLASS NAMES
# ============================================================

with open(
    CLASS_NAMES_PATH,
    "w"
) as file:

    json.dump(
        class_names,
        file,
        indent=4
    )


print(
    "\nClass names saved:"
)

print(
    CLASS_NAMES_PATH
)


# ============================================================
# TRAIN
# ============================================================

print("\n======================================")
print("STARTING TRAINING")
print("======================================\n")


history = model.fit(

    train_dataset,

    validation_data=validation_dataset,

    epochs=EPOCHS,

    callbacks=[
        checkpoint,
        early_stopping
    ]

)


# ============================================================
# LOAD BEST MODEL
# ============================================================

print(
    "\nLoading best saved model..."
)


best_model = keras.models.load_model(
    MODEL_PATH
)


# ============================================================
# FINAL SAVE
# ============================================================

best_model.save(
    MODEL_PATH
)


# ============================================================
# FINAL RESULTS
# ============================================================

best_val_accuracy = max(
    history.history["val_accuracy"]
)


best_train_accuracy = max(
    history.history["accuracy"]
)


print("\n======================================")
print("TRAINING COMPLETE")
print("======================================")

print(
    f"\nBest training accuracy: "
    f"{best_train_accuracy * 100:.2f}%"
)

print(
    f"Best validation accuracy: "
    f"{best_val_accuracy * 100:.2f}%"
)

print(
    f"\nModel saved at:\n"
    f"{MODEL_PATH}"
)

print(
    f"\nClass names saved at:\n"
    f"{CLASS_NAMES_PATH}"
)

print("\nDone! 🎉")