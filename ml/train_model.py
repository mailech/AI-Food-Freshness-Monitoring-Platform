import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint

# =========================
# Dataset paths
# =========================
train_dir = "ml/train"
test_dir = "ml/test"

# =========================
# Image settings
# =========================
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
SEED = 42

# =========================
# Load training dataset
# =========================
train_dataset = tf.keras.utils.image_dataset_from_directory(
    train_dir,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=True,
    validation_split=0.2,
    subset="training",
    seed=SEED
)

# =========================
# Load validation dataset
# =========================
validation_dataset = tf.keras.utils.image_dataset_from_directory(
    train_dir,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=True,
    validation_split=0.2,
    subset="validation",
    seed=SEED
)

# =========================
# Load test dataset
# =========================
test_dataset = tf.keras.utils.image_dataset_from_directory(
    test_dir,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=False
)

# =========================
# Display class names
# =========================
class_names = train_dataset.class_names

print("Classes:", class_names)
print("Number of classes:", len(class_names))

# =========================
# Improve input pipeline
# =========================
AUTOTUNE = tf.data.AUTOTUNE

train_dataset = train_dataset.prefetch(buffer_size=AUTOTUNE)
validation_dataset = validation_dataset.prefetch(buffer_size=AUTOTUNE)
test_dataset = test_dataset.prefetch(buffer_size=AUTOTUNE)

# =========================
# Data augmentation
# =========================
data_augmentation = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.1),
    layers.RandomZoom(0.1),
    layers.RandomContrast(0.1)
])

# =========================
# Build CNN model
# =========================
model = models.Sequential([
    layers.Input(shape=(224, 224, 3)),

    # Data augmentation
    data_augmentation,

    # Normalize pixels
    layers.Rescaling(1./255),

    # Convolution block 1
    layers.Conv2D(32, (3, 3), activation="relu"),
    layers.MaxPooling2D(),

    # Convolution block 2
    layers.Conv2D(64, (3, 3), activation="relu"),
    layers.MaxPooling2D(),

    # Convolution block 3
    layers.Conv2D(128, (3, 3), activation="relu"),
    layers.MaxPooling2D(),

    # Convolution block 4
    layers.Conv2D(256, (3, 3), activation="relu"),
    layers.MaxPooling2D(),

    # Classification layers
    layers.Flatten(),

    layers.Dense(128, activation="relu"),
    layers.Dropout(0.5),

    layers.Dense(6, activation="softmax")
])

# =========================
# Compile model
# =========================
model.compile(
    optimizer="adam",
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

# =========================
# Show model structure
# =========================
model.summary()

# =========================
# Callbacks
# =========================
early_stopping = EarlyStopping(
    monitor="val_loss",
    patience=3,
    restore_best_weights=True
)

checkpoint = ModelCheckpoint(
    "ml/food_freshness_model_v2.keras",
    monitor="val_accuracy",
    save_best_only=True
)

# =========================
# Train model
# =========================
history = model.fit(
    train_dataset,
    validation_data=validation_dataset,
    epochs=15,
    callbacks=[early_stopping, checkpoint]
)

# =========================
# Final evaluation on TEST set
# =========================
test_loss, test_accuracy = model.evaluate(test_dataset)

print("Final Test Accuracy:", test_accuracy)

# =========================
# Save final model
# =========================
model.save("ml/food_freshness_model_v2.keras")

print("New model saved successfully!")