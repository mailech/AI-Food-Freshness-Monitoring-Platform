from pathlib import Path
import json
import random
from collections import Counter

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

VALIDATION_SPLIT = 0.20
SEED = 42

# Keep training reasonable.
HEAD_EPOCHS = 3
FINE_TUNE_EPOCHS = 5

random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp"
}


# ============================================================
# START
# ============================================================

print("\n==============================================")
print(" FOOD FRESHNESS MODEL TRAINING - IMPROVED")
print("==============================================\n")

print("Dataset path:")
print(DATASET_DIR)


# ============================================================
# CHECK DATASET
# ============================================================

if not DATASET_DIR.exists():
    raise FileNotFoundError(
        f"Dataset folder not found: {DATASET_DIR}"
    )


# ============================================================
# FIND IMAGES
#
# Expected:
#
# dataset/
#     apple/
#         fresh/
#         rotten/
#     banana/
#         fresh/
#         rotten/
#     ...
# ============================================================

all_samples = []

food_folders = sorted(
    [
        folder
        for folder in DATASET_DIR.iterdir()
        if folder.is_dir()
        and folder.name.lower() != "raw"
    ],
    key=lambda x: x.name.lower()
)


if not food_folders:
    raise RuntimeError(
        "No food folders found inside dataset."
    )


print("\nFoods found:")


for food_folder in food_folders:

    fresh_folder = food_folder / "fresh"
    rotten_folder = food_folder / "rotten"


    if fresh_folder.exists():

        for image_path in fresh_folder.rglob("*"):

            if (
                image_path.is_file()
                and image_path.suffix.lower()
                in IMAGE_EXTENSIONS
            ):

                all_samples.append(
                    (
                        str(image_path),
                        f"{food_folder.name}_fresh"
                    )
                )


    if rotten_folder.exists():

        for image_path in rotten_folder.rglob("*"):

            if (
                image_path.is_file()
                and image_path.suffix.lower()
                in IMAGE_EXTENSIONS
            ):

                all_samples.append(
                    (
                        str(image_path),
                        f"{food_folder.name}_rotten"
                    )
                )


    print(f"  {food_folder.name}")


if not all_samples:

    raise RuntimeError(
        "No images found in dataset."
    )


# ============================================================
# CLASS NAMES
# ============================================================

class_names = sorted(
    set(
        label
        for _, label in all_samples
    )
)


class_to_index = {
    name: index
    for index, name in enumerate(class_names)
}


print("\n==============================================")
print("CLASSES")
print("==============================================")

for index, name in enumerate(class_names):

    print(
        f"{index:2d} -> {name}"
    )


print(
    "\nTotal classes:",
    len(class_names)
)

print(
    "Total images:",
    len(all_samples)
)


if len(class_names) != 28:

    raise RuntimeError(
        f"\nExpected 28 classes, "
        f"but found {len(class_names)}.\n"
        "Check dataset/<food>/fresh "
        "and dataset/<food>/rotten."
    )


# ============================================================
# STRATIFIED TRAIN / VALIDATION SPLIT
# ============================================================

samples_by_class = {
    name: []
    for name in class_names
}


for image_path, label in all_samples:

    samples_by_class[label].append(
        image_path
    )


train_samples = []
val_samples = []


print("\n==============================================")
print("DATA SPLIT")
print("==============================================")


for label in class_names:

    samples = samples_by_class[label].copy()

    random.shuffle(samples)


    split_index = int(
        len(samples)
        * (1 - VALIDATION_SPLIT)
    )


    # Make sure both sets contain data.
    split_index = max(
        1,
        min(
            split_index,
            len(samples) - 1
        )
    )


    train_part = samples[:split_index]

    val_part = samples[split_index:]


    label_index = class_to_index[label]


    for image_path in train_part:

        train_samples.append(
            (
                image_path,
                label_index
            )
        )


    for image_path in val_part:

        val_samples.append(
            (
                image_path,
                label_index
            )
        )


    print(
        f"{label:25s} "
        f"total={len(samples):5d} "
        f"train={len(train_part):5d} "
        f"val={len(val_part):5d}"
    )


random.shuffle(train_samples)
random.shuffle(val_samples)


print(
    "\nTraining images   :",
    len(train_samples)
)

print(
    "Validation images :",
    len(val_samples)
)


# ============================================================
# CLASS WEIGHTS
# ============================================================

train_counts = Counter(
    label
    for _, label in train_samples
)


total_train = len(train_samples)

num_classes = len(class_names)


class_weights = {}


for index in range(num_classes):

    count = train_counts[index]

    class_weights[index] = (
        total_train
        / (num_classes * count)
    )


print(
    "\nClass weights enabled."
)

print(
    "This helps weaker classes receive"
    " enough training attention."
)


# ============================================================
# IMAGE LOADING
# ============================================================

def load_image(image_path, label):

    image = tf.io.read_file(
        image_path
    )


    image = tf.image.decode_image(
        image,
        channels=3,
        expand_animations=False
    )


    image.set_shape(
        [None, None, 3]
    )


    image = tf.image.resize(
        image,
        IMG_SIZE,
        method=tf.image.ResizeMethod.BILINEAR
    )


    image = tf.cast(
        image,
        tf.float32
    )


    # MobileNetV2 preprocessing.
    #
    # Convert:
    # 0..255 -> -1..1
    #
    image = (
        image / 127.5
    ) - 1.0


    return image, label


# ============================================================
# CREATE DATASETS
# ============================================================

train_paths = [
    item[0]
    for item in train_samples
]

train_labels = [
    item[1]
    for item in train_samples
]


val_paths = [
    item[0]
    for item in val_samples
]

val_labels = [
    item[1]
    for item in val_samples
]


train_ds = tf.data.Dataset.from_tensor_slices(
    (
        train_paths,
        train_labels
    )
)


train_ds = train_ds.map(
    load_image,
    num_parallel_calls=tf.data.AUTOTUNE
)


train_ds = train_ds.shuffle(
    min(
        len(train_samples),
        5000
    ),
    seed=SEED,
    reshuffle_each_iteration=True
)


train_ds = train_ds.batch(
    BATCH_SIZE
)


train_ds = train_ds.prefetch(
    tf.data.AUTOTUNE
)


val_ds = tf.data.Dataset.from_tensor_slices(
    (
        val_paths,
        val_labels
    )
)


val_ds = val_ds.map(
    load_image,
    num_parallel_calls=tf.data.AUTOTUNE
)


val_ds = val_ds.batch(
    BATCH_SIZE
)


val_ds = val_ds.prefetch(
    tf.data.AUTOTUNE
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
            0.12
        ),

        layers.RandomZoom(
            0.15
        ),

        layers.RandomTranslation(
            0.08,
            0.08
        ),

        layers.RandomContrast(
            0.15
        )

    ],
    name="data_augmentation"
)


# ============================================================
# MOBILENETV2
# ============================================================

print(
    "\nLoading MobileNetV2 "
    "ImageNet weights..."
)


base_model = tf.keras.applications.MobileNetV2(
    input_shape=(
        IMG_SIZE[0],
        IMG_SIZE[1],
        3
    ),

    include_top=False,

    weights="imagenet"
)


# Initially freeze everything.
base_model.trainable = False


# ============================================================
# BUILD MODEL
# ============================================================

inputs = keras.Input(
    shape=(
        IMG_SIZE[0],
        IMG_SIZE[1],
        3
    )
)


x = data_augmentation(
    inputs
)


# Input is already [-1, 1].
x = base_model(
    x,
    training=False
)


x = layers.GlobalAveragePooling2D()(x)


x = layers.BatchNormalization()(x)


x = layers.Dense(
    256,
    activation="relu"
)(x)


x = layers.Dropout(
    0.35
)(x)


x = layers.Dense(
    128,
    activation="relu"
)(x)


x = layers.Dropout(
    0.25
)(x)


outputs = layers.Dense(
    num_classes,
    activation="softmax"
)(x)


model = keras.Model(
    inputs,
    outputs
)


# ============================================================
# CALLBACKS
# ============================================================

checkpoint = keras.callbacks.ModelCheckpoint(

    filepath=str(MODEL_PATH),

    monitor="val_accuracy",

    mode="max",

    save_best_only=True,

    verbose=1
)


early_stopping = keras.callbacks.EarlyStopping(

    monitor="val_accuracy",

    mode="max",

    patience=2,

    restore_best_weights=True,

    verbose=1
)


reduce_lr = keras.callbacks.ReduceLROnPlateau(

    monitor="val_loss",

    factor=0.3,

    patience=1,

    min_lr=1e-7,

    verbose=1
)


# ============================================================
# STAGE 1
# ============================================================

print("\n==============================================")
print("STAGE 1: TRAINING CLASSIFICATION HEAD")
print("==============================================\n")


model.compile(

    optimizer=keras.optimizers.Adam(
        learning_rate=0.001
    ),

    loss=keras.losses.SparseCategoricalCrossentropy(),

    metrics=[
        "accuracy"
    ]
)


model.fit(

    train_ds,

    validation_data=val_ds,

    epochs=HEAD_EPOCHS,

    class_weight=class_weights,

    callbacks=[
        checkpoint,
        early_stopping,
        reduce_lr
    ]
)


# ============================================================
# STAGE 2
# FINE-TUNE LAST 80 LAYERS
# ============================================================

print("\n==============================================")
print("STAGE 2: FINE-TUNING LAST 80 LAYERS")
print("==============================================\n")


base_model.trainable = True


# Freeze earlier layers.
for layer in base_model.layers[:-80]:

    layer.trainable = False


# Keep BatchNorm frozen.
for layer in base_model.layers:

    if isinstance(
        layer,
        layers.BatchNormalization
    ):

        layer.trainable = False


model.compile(

    optimizer=keras.optimizers.Adam(
        learning_rate=1e-5
    ),

    loss=keras.losses.SparseCategoricalCrossentropy(),

    metrics=[
        "accuracy"
    ]
)


model.fit(

    train_ds,

    validation_data=val_ds,

    epochs=FINE_TUNE_EPOCHS,

    class_weight=class_weights,

    callbacks=[
        checkpoint,
        early_stopping,
        reduce_lr
    ]
)


# ============================================================
# LOAD BEST MODEL
# ============================================================

print("\n==============================================")
print("LOADING BEST MODEL")
print("==============================================\n")


if MODEL_PATH.exists():

    best_model = keras.models.load_model(
        MODEL_PATH
    )

else:

    best_model = model

    best_model.save(
        MODEL_PATH
    )


# ============================================================
# SAVE CLASS NAMES
# ============================================================

with open(
    CLASS_NAMES_PATH,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        class_names,
        file,
        indent=2
    )


# ============================================================
# FINAL VALIDATION
# ============================================================

print("\n==============================================")
print("FINAL VALIDATION")
print("==============================================\n")


loss, accuracy = best_model.evaluate(
    val_ds,
    verbose=1
)


print(
    f"\nValidation Accuracy: "
    f"{accuracy * 100:.2f}%"
)


# ============================================================
# 5 IMAGE PER CLASS SANITY CHECK
# ============================================================

print("\n==============================================")
print("5-IMAGE PER CLASS SANITY CHECK")
print("==============================================\n")


correct = 0
total = 0

class_results = {}


for expected_class in class_names:

    class_images = samples_by_class[
        expected_class
    ]


    # Use five images.
    selected_images = class_images[:5]


    class_correct = 0


    for image_path in selected_images:

        image = tf.io.read_file(
            image_path
        )


        image = tf.image.decode_image(
            image,
            channels=3,
            expand_animations=False
        )


        image.set_shape(
            [None, None, 3]
        )


        image = tf.image.resize(
            image,
            IMG_SIZE
        )


        image = tf.cast(
            image,
            tf.float32
        )


        # SAME preprocessing as training.
        image = (
            image / 127.5
        ) - 1.0


        image = tf.expand_dims(
            image,
            axis=0
        )


        predictions = best_model.predict(
            image,
            verbose=0
        )[0]


        predicted_index = int(
            np.argmax(predictions)
        )


        predicted_class = class_names[
            predicted_index
        ]


        confidence = (
            float(
                predictions[
                    predicted_index
                ]
            )
            * 100
        )


        total += 1


        if predicted_class == expected_class:

            correct += 1

            class_correct += 1

            status = "CORRECT"

        else:

            status = "WRONG"


        print(
            f"{expected_class:25s} -> "
            f"{predicted_class:25s} "
            f"{confidence:6.2f}% "
            f"{status}"
        )


    class_results[
        expected_class
    ] = class_correct


# ============================================================
# SANITY RESULT
# ============================================================

print(
    "\n----------------------------------------------"
)


print(
    f"Sanity Check Accuracy: "
    f"{correct}/{total}"
)


print(
    f"Sanity Check Percentage: "
    f"{(correct / total) * 100:.2f}%"
)


# ============================================================
# WEAK CLASSES
# ============================================================

print(
    "\nClasses below 60% "
    "in sanity check:"
)


found_weak = False


for label in class_names:

    score = (
        class_results[label]
        / 5
        * 100
    )


    if score < 60:

        found_weak = True

        print(
            f"  {label:25s} "
            f"{score:.0f}%"
        )


if not found_weak:

    print(
        "  None"
    )


# ============================================================
# FINAL INFORMATION
# ============================================================

print("\n==============================================")
print("TRAINING COMPLETED")
print("==============================================")


print(
    "\nModel saved at:"
)

print(
    MODEL_PATH
)


print(
    "\nClass names saved at:"
)

print(
    CLASS_NAMES_PATH
)


print(
    f"\nFinal validation accuracy: "
    f"{accuracy * 100:.2f}%"
)


print(
    f"5-image sanity accuracy: "
    f"{(correct / total) * 100:.2f}%"
)


print(
    "\nIMPORTANT:"
)

print(
    "Use the sanity-check result, "
    "not validation accuracy alone, "
    "to decide whether the model "
    "is ready for the website."
)


print(
    "\nDone."
)