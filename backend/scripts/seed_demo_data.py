import sys
import os
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

# Add parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.modules.user.models import User
from app.modules.inventory.models import Batch, InventoryItem

async def seed_data():
    print("Starting FreshLens demo data seeding...")
    
    # Ensure tables are created first
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with SessionLocal() as db:
        # 1. Create Demo Users
        password_hash = get_password_hash("Password123!")
        
        users_to_seed = [
            {"email": "consumer@freshlens.com", "full_name": "Demo Consumer", "role": "CONSUMER"},
            {"email": "retail@freshlens.com", "full_name": "Demo Retail Manager", "role": "RETAIL_MANAGER"},
            {"email": "warehouse@freshlens.com", "full_name": "Demo Warehouse Operator", "role": "WAREHOUSE_OPERATOR"},
            {"email": "inspector@freshlens.com", "full_name": "Demo Quality Inspector", "role": "QUALITY_INSPECTOR"},
            {"email": "admin@freshlens.com", "full_name": "Demo Administrator", "role": "ADMIN"}
        ]
        
        seeded_users = {}
        for user_data in users_to_seed:
            # Check if user already exists
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.email == user_data["email"]))
            user = result.scalars().first()
            if not user:
                user = User(
                    id=uuid.uuid4(),
                    email=user_data["email"],
                    hashed_password=password_hash,
                    full_name=user_data["full_name"],
                    role=user_data["role"],
                    is_active=True
                )
                db.add(user)
                print(f"Created user: {user.email}")
            else:
                print(f"User already exists: {user.email}")
            seeded_users[user_data["role"]] = user
            
        await db.commit()
        
        # 2. Create Demo Batches
        batches_to_seed = [
            {"batch_number": "BATCH-APP-01", "supplier_name": "Valley Orchard Farms"},
            {"batch_number": "BATCH-BAN-02", "supplier_name": "Tropical Import Co."},
            {"batch_number": "BATCH-TOM-03", "supplier_name": "Sun-Riped Greenhouses"},
            {"batch_number": "BATCH-POT-04", "supplier_name": "Idaho Growers Coop"},
            {"batch_number": "BATCH-ORG-05", "supplier_name": "Florida Citrus Groves"}
        ]
        
        seeded_batches = {}
        for batch_data in batches_to_seed:
            result = await db.execute(select(Batch).where(Batch.batch_number == batch_data["batch_number"]))
            batch = result.scalars().first()
            if not batch:
                batch = Batch(
                    id=uuid.uuid4(),
                    batch_number=batch_data["batch_number"],
                    supplier_name=batch_data["supplier_name"],
                    status="ACTIVE"
                )
                db.add(batch)
                print(f"Created batch: {batch.batch_number}")
            else:
                print(f"Batch already exists: {batch.batch_number}")
            seeded_batches[batch_data["batch_number"]] = batch
            
        await db.commit()
        
        # 3. Create Demo Inventory Items
        now = datetime.now(timezone.utc)
        items_to_seed = [
            {
                "name": "Red Delicious Apples",
                "category": "Fruits",
                "quantity": 150.0,
                "unit": "kg",
                "entry_offset": -2,
                "expiry_offset": 10,
                "storage_location": "Cold Room A",
                "packaging_type": "Cartboard Box",
                "status": "FRESH",
                "batch_key": "BATCH-APP-01"
            },
            {
                "name": "Organic Bananas",
                "category": "Fruits",
                "quantity": 85.5,
                "unit": "bunches",
                "entry_offset": -1,
                "expiry_offset": 4,
                "storage_location": "Pantry Store",
                "packaging_type": "None",
                "status": "WARNING",
                "batch_key": "BATCH-BAN-02"
            },
            {
                "name": "Beefsteak Tomatoes",
                "category": "Vegetables",
                "quantity": 200.0,
                "unit": "kg",
                "entry_offset": -3,
                "expiry_offset": 8,
                "storage_location": "Cold Room B",
                "packaging_type": "Plastic Wrap",
                "status": "FRESH",
                "batch_key": "BATCH-TOM-03"
            },
            {
                "name": "Russet Potatoes",
                "category": "Vegetables",
                "quantity": 500.0,
                "unit": "bags",
                "entry_offset": -5,
                "expiry_offset": 30,
                "storage_location": "Dry Warehouse Z",
                "packaging_type": "None",
                "status": "FRESH",
                "batch_key": "BATCH-POT-04"
            },
            {
                "name": "Valencia Oranges",
                "category": "Fruits",
                "quantity": 120.0,
                "unit": "kg",
                "entry_offset": -4,
                "expiry_offset": 14,
                "storage_location": "Cold Room A",
                "packaging_type": "Cartboard Box",
                "status": "FRESH",
                "batch_key": "BATCH-ORG-05"
            }
        ]
        
        for item_data in items_to_seed:
            result = await db.execute(select(InventoryItem).where(InventoryItem.name == item_data["name"]))
            item = result.scalars().first()
            if not item:
                batch = seeded_batches[item_data["batch_key"]]
                user = seeded_users["WAREHOUSE_OPERATOR"]
                
                item = InventoryItem(
                    id=uuid.uuid4(),
                    name=item_data["name"],
                    category=item_data["category"],
                    quantity=item_data["quantity"],
                    unit=item_data["unit"],
                    entry_date=now + timedelta(days=item_data["entry_offset"]),
                    expiry_date=now + timedelta(days=item_data["expiry_offset"]),
                    storage_location=item_data["storage_location"],
                    packaging_type=item_data["packaging_type"],
                    status=item_data["status"],
                    batch_id=batch.id,
                    user_id=user.id
                )
                db.add(item)
                print(f"Created item: {item.name}")
            else:
                print(f"Item already exists: {item.name}")
                
        await db.commit()
        print("Demo data seeding completed successfully.")

if __name__ == "__main__":
    try:
        asyncio.run(seed_data())
    except Exception as e:
        print("\n[ERROR] Database connection failed.")
        print("Please verify that PostgreSQL (localhost:5432) and MongoDB (localhost:27017) are active and running.")
        print("You can start them easily by running: docker compose up -d")
        print(f"Details: {str(e)}")
        sys.exit(1)
