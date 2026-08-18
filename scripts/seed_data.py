"""
Seed script for AI Food Freshness Monitoring Platform.
Run this after docker-compose up to populate initial test data.
Usage: python scripts/seed_data.py
"""

import sys
import os
import random
from datetime import datetime, timedelta
import uuid

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import settings
from backend.database import SessionLocal, engine, Base
from backend.models.sql_models import (
    User, FoodCategory, Batch, InventoryItem, StorageLog, AnalysisResult
)
from backend.utils.security import get_password_hash

def seed_database():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Seeding database with demo data...")

        # ===========================================================
        # 1. SEED USERS
        # ===========================================================
        existing_users = db.query(User).count()
        if existing_users == 0:
            users_data = [
                {"name": "System Admin",        "email": "admin@freshplatform.io",      "password": "admin123",    "role": "admin"},
                {"name": "Alice Consumer",       "email": "alice@example.com",           "password": "alice123",    "role": "consumer"},
                {"name": "Bob Retail Manager",   "email": "bob@retailstore.com",         "password": "bob123",      "role": "retail_manager"},
                {"name": "Carol Warehouse Ops",  "email": "carol@warehouse.com",         "password": "carol123",    "role": "warehouse_operator"},
                {"name": "David Inspector",      "email": "david@foodsafety.gov",        "password": "david123",    "role": "food_inspector"},
            ]
            users = []
            for u in users_data:
                user = User(
                    name=u["name"],
                    email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"]
                )
                db.add(user)
                users.append(user)
            db.commit()
            print(f"  [OK] Seeded {len(users_data)} users.")
        else:
            print(f"  - Users already exist ({existing_users}), skipping.")
            users = db.query(User).all()

        # ===========================================================
        # 2. SEED FOOD CATEGORIES
        # ===========================================================
        existing_cats = db.query(FoodCategory).count()
        if existing_cats == 0:
            categories_data = [
                ("Fruits",         0.0, 15.0,   80.0, 90.0,  10),
                ("Vegetables",     0.0, 10.0,   85.0, 95.0,   7),
                ("Meat",          -2.0,  4.0,   75.0, 85.0,   4),
                ("Seafood",       -2.0,  2.0,   80.0, 90.0,   3),
                ("Milk",           1.0,  4.0,   70.0, 80.0,   7),
                ("Bakery",        15.0, 25.0,   40.0, 60.0,   5),
                ("Packaged Foods",10.0, 25.0,   30.0, 50.0, 180),
                ("Beverages",      4.0, 20.0,   30.0, 50.0,  90),
                ("Eggs",           2.0, 12.0,   70.0, 80.0,  21),
                ("Frozen Foods", -25.0,-18.0,   30.0, 50.0, 120),
            ]
            cats = []
            for name, t_min, t_max, h_min, h_max, life in categories_data:
                cat = FoodCategory(
                    name=name,
                    ideal_temp_min=t_min, ideal_temp_max=t_max,
                    ideal_humidity_min=h_min, ideal_humidity_max=h_max,
                    base_shelf_life_days=life
                )
                db.add(cat)
                cats.append(cat)
            db.commit()
            print(f"  [OK] Seeded {len(categories_data)} food categories.")
        else:
            print(f"  - Categories already exist ({existing_cats}), skipping.")
            cats = db.query(FoodCategory).all()

        # ===========================================================
        # 3. SEED BATCHES
        # ===========================================================
        existing_batches = db.query(Batch).count()
        if existing_batches == 0:
            batches_data = [
                ("BATCH-2026-001", "Fresh Farms Ltd",    "Fruits"),
                ("BATCH-2026-002", "Green Valley Farms", "Vegetables"),
                ("BATCH-2026-003", "Pacific Meats Inc",  "Meat"),
                ("BATCH-2026-004", "Ocean Select",       "Seafood"),
                ("BATCH-2026-005", "Dairy Direct Co",    "Milk"),
            ]
            cat_map = {c.name: c for c in cats}
            batches = []
            for batch_num, supplier, cat_name in batches_data:
                if cat_name in cat_map:
                    batch = Batch(
                        batch_number=batch_num,
                        category_id=str(cat_map[cat_name].id),
                        supplier_name=supplier,
                        notes=f"Batch received from {supplier} for {cat_name} category."
                    )
                    db.add(batch)
                    batches.append(batch)
            db.commit()
            print(f"  [OK] Seeded {len(batches)} supplier batches.")
        else:
            print(f"  - Batches already exist ({existing_batches}), skipping.")
            batches = db.query(Batch).all()

        # ===========================================================
        # 4. SEED INVENTORY ITEMS
        # ===========================================================
        existing_items = db.query(InventoryItem).count()
        if existing_items == 0:
            items_seed = [
                ("Organic Bananas",        "Fruits",     3.0, "kg",   6,   5.0,  88.0, 85,  "Fresh"),
                ("Baby Spinach",           "Vegetables", 1.5, "kg",   4,   2.0,  92.0, 78,  "Fresh"),
                ("Prime Ribeye Steak",     "Meat",       2.0, "kg",   2,   3.0,  80.0, 62,  "Decaying"),
                ("Atlantic Salmon",        "Seafood",    1.2, "kg",   1,   1.0,  85.0, 55,  "Decaying"),
                ("Whole Milk 2L",          "Milk",       2.0, "liters",5,  2.5,  75.0, 91,  "Fresh"),
                ("Sourdough Loaf",         "Bakery",     0.8, "kg",   3,  20.0,  55.0, 70,  "Fresh"),
                ("Canned Tomatoes",        "Packaged Foods",12,"pcs",90,  20.0,  45.0, 98,  "Fresh"),
                ("Orange Juice 1L",        "Beverages",  4.0, "liters",20,  6.0, 40.0, 93,  "Fresh"),
                ("Free-Range Eggs x12",    "Eggs",       2.0, "packs",14,  5.0,  72.0, 88,  "Fresh"),
                ("Frozen Peas",            "Frozen Foods",1.5,"kg", 60, -20.0,  40.0, 97,  "Fresh"),
                ("Cherry Tomatoes",        "Vegetables", 0.5, "kg",   2,   8.0,  88.0, 45,  "Decaying"),
                ("Ground Beef",            "Meat",       1.0, "kg",   1,   2.0,  82.0, 25,  "Spoiled"),
            ]

            cat_map = {c.name: c for c in cats}
            batch_map = {b.batch_number: b for b in batches}
            users_list = db.query(User).all()
            consumer_user = next((u for u in users_list if u.role == "consumer"), users_list[0])
            retail_user   = next((u for u in users_list if u.role == "retail_manager"), users_list[0])

            for item_data in items_seed:
                name, cat_name, qty, unit, days_left, storage_temp, storage_humidity, freshness_score, status = item_data
                cat = cat_map.get(cat_name)
                if not cat:
                    continue

                # Determine owner
                owner = retail_user if cat_name in ["Meat","Seafood","Beverages","Packaged Foods","Bakery"] else consumer_user

                expiry = datetime.now() + timedelta(days=days_left)
                item = InventoryItem(
                    name=name,
                    category_id=str(cat.id),
                    user_id=str(owner.id),
                    quantity=qty,
                    unit=unit,
                    expiry_date=expiry,
                    status=status,
                    freshness_score=freshness_score,
                    storage_temp=storage_temp,
                    storage_humidity=storage_humidity
                )
                db.add(item)
            db.commit()

            # Re-query to get IDs for logs
            all_items = db.query(InventoryItem).all()

            # ===========================================================
            # 5. SEED STORAGE LOGS (environmental sensor readings)
            # ===========================================================
            for item in all_items:
                for j in range(5):
                    log = StorageLog(
                        inventory_item_id=str(item.id),
                        temperature=float(item.storage_temp or 15.0) + random.uniform(-1.5, 1.5),
                        humidity=float(item.storage_humidity or 70.0) + random.uniform(-3.0, 3.0),
                        recorded_at=datetime.now() - timedelta(hours=j * 2)
                    )
                    db.add(log)
            db.commit()

            # ===========================================================
            # 6. SEED ANALYSIS RESULTS
            # ===========================================================
            for item in all_items[:8]:  # add analysis results for first 8 items
                score = item.freshness_score
                spoil_prob = max(0.0, min(1.0, (100 - score) / 100.0))
                remaining = max(0.0, (item.expiry_date - datetime.now()).days * (score / 100.0))
                analysis = AnalysisResult(
                    inventory_item_id=str(item.id),
                    image_url=f"/uploads/demo_image_{item.name.replace(' ','_')}.jpg",
                    color_score=score * 0.9,
                    texture_score=score * 0.85,
                    mold_detected=(score < 30),
                    bruise_detected=(score < 60),
                    damage_detected=False,
                    freshness_score=score,
                    spoilage_probability=round(spoil_prob, 4),
                    remaining_shelf_life_days=round(remaining, 2),
                    analyzed_at=datetime.now() - timedelta(hours=random.randint(1, 12))
                )
                db.add(analysis)
            db.commit()

            print(f"  [OK] Seeded {len(items_seed)} inventory items, {len(all_items)*5} storage logs, and 8 analysis results.")
        else:
            print(f"  - Inventory items already exist ({existing_items}), skipping.")

        print("\n[OK] Seeding complete! You can now login with:")
        print("   Email: admin@freshplatform.io  | Password: admin123  | Role: Admin")
        print("   Email: alice@example.com       | Password: alice123  | Role: Consumer")
        print("   Email: bob@retailstore.com     | Password: bob123    | Role: Retail Manager")
        print("   Email: carol@warehouse.com     | Password: carol123  | Role: Warehouse Operator")
        print("   Email: david@foodsafety.gov    | Password: david123  | Role: Food Inspector")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
