import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SECRET_KEY = os.getenv("SECRET_KEY", "food-freshness-platform-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'food_freshness.db')}")

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

FOOD_CATEGORIES = [
    "Fruits", "Vegetables", "Dairy Products", "Meat & Poultry",
    "Seafood", "Bakery Products", "Packaged Foods", "Beverages"
]

FRESHNESS_CLASSES = ["Fresh", "Good", "Acceptable", "Near Spoilage", "Spoiled"]

USER_ROLES = ["Consumer", "RetailManager", "WarehouseOperator", "FoodQualityInspector", "Administrator"]
