import os
import random
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split


# ============================================================
# 1. SETTINGS
# ============================================================

DATASET_DIR = Path(r"C:\Users\chbhavani\Downloads\Dataset")

MODEL_DIR = Path("models")
MODEL_DIR.mkdir(exist_ok=True)

CHECKPOINT_DIR = MODEL_DIR / "checkpoints"
CHECKPOINT_DIR.mkdir(exist_ok=True)

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32

# Total number of epochs
EPOCHS = 5

SEED = 42

random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)


# ============================================================
# 2. CHECK DATASET
# ============================================================

FRESH_DIR = DATASET_DIR / "Fresh"
ROTTEN_DIR = DATASET_DIR / "Rotten"

if not FRESH_DIR.exists():
    raise FileNotFoundError(
        f"Fresh folder not found:\n{FRESH_DIR}"
    )

if not ROTTEN_DIR.exists():
    raise FileNotFoundError(
        f"Rotten folder not found:\n{ROTTEN_DIR}"
    )

print("Dataset found!")
print("Fresh folder :", FRESH_DIR)
print("Rotten folder:", ROTTEN_DIR)


# ============================================================
# 3. FIND IMAGE FILES
# ============================================================

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp",
}


def find_images(folder):
    images = []

    for path in folder.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            images.append(str(path))

    return images


print("\nScanning dataset...")

fresh_images = find_images(FRESH_DIR)
rotten_images = find_images(ROTTEN_DIR)

print(f"Fresh images found : {len(fresh_images)}")
print(f"Rotten images found: {len(rotten_images)}")


if len(fresh_images) == 0:
    raise RuntimeError("No Fresh images were found.")

if len(rotten_images) == 0:
    raise RuntimeError("No Rotten images were found.")


# ============================================================
# 4. CREATE LABELS
# ============================================================
#
# Fresh = 0
# Rotten = 1
#

image_paths = fresh_images + rotten_images

labels = (
    [0] * len(fresh_images)
    + [1] * len(rotten_images)
)

image_paths = np.array(image_paths)
labels = np.array(labels)


# ============================================================
# 5. TRAIN / VALIDATION SPLIT
# ============================================================

train_paths, val_paths, train_labels, val_labels = train_test_split(
    image_paths,
    labels,
    test_size=0.2,
    random_state=SEED,
    stratify=labels,
)

print("\nDataset split:")
print(f"Training images  : {len(train_paths)}")
print(f"Validation images: {len(val_paths)}")


# ============================================================
# 6. IMAGE LOADING FUNCTION
# ============================================================

def load_image(path, label):

    image = tf.io.read_file(path)

    image = tf.image.decode_image(
        image,
        channels=3,
        expand_animations=False,
    )

    image.set_shape([None, None, 3])

    image = tf.image.resize(
        image,
        IMAGE_SIZE,
    )

    image = tf.cast(
        image,
        tf.float32,
    )

    return image, label


# ============================================================
# 7. CREATE TF DATASETS
# ============================================================

train_dataset = tf.data.Dataset.from_tensor_slices(
    (train_paths, train_labels)
)

val_dataset = tf.data.Dataset.from_tensor_slices(
    (val_paths, val_labels)
)


train_dataset = train_dataset.map(
    load_image,
    num_parallel_calls=tf.data.AUTOTUNE,
)

val_dataset = val_dataset.map(
    load_image,
    num_parallel_calls=tf.data.AUTOTUNE,
)


# ============================================================
# 8. DATA AUGMENTATION
# ============================================================

data_augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal"),
    tf.keras.layers.RandomRotation(0.1),
    tf.keras.layers.RandomZoom(0.1),
])


def augment(image, label):

    image = data_augmentation(
        image,
        training=True,
    )

    return image, label


train_dataset = train_dataset.map(
    augment,
    num_parallel_calls=tf.data.AUTOTUNE,
)


train_dataset = train_dataset.shuffle(
    1000,
    seed=SEED,
)

train_dataset = train_dataset.batch(
    BATCH_SIZE
)

val_dataset = val_dataset.batch(
    BATCH_SIZE
)

train_dataset = train_dataset.prefetch(
    tf.data.AUTOTUNE
)

val_dataset = val_dataset.prefetch(
    tf.data.AUTOTUNE
)


# ============================================================
# 9. BUILD MODEL
# ============================================================

print("\nLoading MobileNetV2...")

base_model = tf.keras.applications.MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights="imagenet",
)

base_model.trainable = False


inputs = tf.keras.Input(
    shape=(224, 224, 3)
)


x = tf.keras.applications.mobilenet_v2.preprocess_input(
    inputs
)


x = base_model(
    x,
    training=False,
)


x = tf.keras.layers.GlobalAveragePooling2D()(x)

x = tf.keras.layers.Dropout(0.2)(x)


outputs = tf.keras.layers.Dense(
    1,
    activation="sigmoid",
)(x)


model = tf.keras.Model(
    inputs,
    outputs,
)


# ============================================================
# 10. COMPILE MODEL
# ============================================================

model.compile(
    optimizer=tf.keras.optimizers.Adam(
        learning_rate=0.0001
    ),
    loss="binary_crossentropy",
    metrics=["accuracy"],
)


# ============================================================
# 11. CHECK FOR PREVIOUS CHECKPOINT
# ============================================================

checkpoint_path = CHECKPOINT_DIR / "latest.keras"

# Epoch 1 was already completed
initial_epoch = 1

if checkpoint_path.exists():

    print("\n========================================")
    print("CHECKPOINT FOUND")
    print("========================================")
    print(f"Loading checkpoint:")
    print(checkpoint_path.resolve())

    model = tf.keras.models.load_model(
        checkpoint_path
    )

    print("Checkpoint loaded successfully.")

else:

    print("\nNo previous checkpoint found.")
    print("Starting training from epoch 1.")


# ============================================================
# 12. CHECKPOINT CALLBACK
# ============================================================

checkpoint_callback = tf.keras.callbacks.ModelCheckpoint(
    filepath=str(checkpoint_path),
    save_weights_only=False,
    save_freq="epoch",
    verbose=1,
)


# ============================================================
# 13. TRAIN
# ============================================================

print("\n========================================")
print("STARTING TRAINING")
print("========================================")

print("Fresh = 0")
print("Rotten = 1")

print(f"Total epochs: {EPOCHS}")

if initial_epoch > 0:
    print(
        f"Resuming from epoch {initial_epoch + 1}"
    )

print()


history = model.fit(
    train_dataset,
    validation_data=val_dataset,
    epochs=EPOCHS,
    initial_epoch=initial_epoch,
    callbacks=[
        checkpoint_callback
    ],
)


# ============================================================
# 14. SAVE FINAL MODEL
# ============================================================

model_path = MODEL_DIR / "food_freshness_model.keras"

model.save(model_path)


print("\n========================================")
print("TRAINING COMPLETE!")
print("========================================")

print("Final model saved to:")

print(model_path.resolve())


# ============================================================
# 15. FINAL EVALUATION
# ============================================================

print("\nEvaluating model...")

loss, accuracy = model.evaluate(
    val_dataset,
    verbose=1,
)


print("\n========================================")
print("VALIDATION RESULTS")
print("========================================")

print(f"Loss    : {loss:.4f}")
print(f"Accuracy: {accuracy * 100:.2f}%")


print("\n========================================")
print("DONE!")
print("========================================")