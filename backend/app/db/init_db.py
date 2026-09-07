"""
Database Initializer & Data Seeder for PostgreSQL/SQLite
"""
from datetime import datetime, timedelta
import uuid
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.orm import (
    UserORM, FoodItemORM, FoodBatchORM, StorageConditionORM,
    RecommendationORM, AlertORM, ReportORM, FoodAnalysisORM
)

def init_db():
    print("[*] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("[+] Database tables created successfully.")

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(FoodItemORM).count() > 0:
            print("[i] Database already seeded with initial inventory. Skipping re-seed.")
            return

        print("[*] Seeding initial data...")
        
        # 1. Seed Users
        demo_user = UserORM(
            id=str(uuid.uuid4()),
            name="Food Quality Inspector",
            email="inspector@freshness.io",
            role="Food Quality Inspector"
        )
        db.add(demo_user)

        # 2. Seed Storage Conditions
        storage_zones = [
            StorageConditionORM(
                id="zone-1",
                zone_name="Cold Vault Alpha (Produce & Dairy)",
                temperature=3.4,
                temperature_status="Normal",
                humidity=86.5,
                humidity_status="Normal",
                air_circulation="Optimal (1.2 m/s)",
                air_status="Normal",
                light_exposure="Low (15 Lux)",
                light_status="Normal",
                storage_duration="Continuous 24/7",
                overall_status="Normal",
                last_updated="Just now"
            ),
            StorageConditionORM(
                id="zone-2",
                zone_name="Chilled Meat & Seafood Locker",
                temperature=1.1,
                temperature_status="Normal",
                humidity=88.0,
                humidity_status="Normal",
                air_circulation="High (1.8 m/s)",
                air_status="Normal",
                light_exposure="Dark (2 Lux)",
                light_status="Normal",
                storage_duration="Continuous 24/7",
                overall_status="Normal",
                last_updated="Just now"
            ),
            StorageConditionORM(
                id="zone-3",
                zone_name="Ambient Pantry & Bakery Depot",
                temperature=19.8,
                temperature_status="Normal",
                humidity=52.0,
                humidity_status="Normal",
                air_circulation="Moderate (0.8 m/s)",
                air_status="Normal",
                light_exposure="Moderate (120 Lux)",
                light_status="Normal",
                storage_duration="Ambient Room 24/7",
                overall_status="Normal",
                last_updated="Just now"
            ),
            StorageConditionORM(
                id="zone-4",
                zone_name="Loading Dock / Quarantine Bay",
                temperature=11.2,
                temperature_status="Warning",
                humidity=78.0,
                humidity_status="Normal",
                air_circulation="Variable (0.4 m/s)",
                air_status="Warning",
                light_exposure="High (350 Lux)",
                light_status="Warning",
                storage_duration="Transit Only (< 4h)",
                overall_status="Warning",
                last_updated="Just now"
            )
        ]
        db.add_all(storage_zones)

        # 3. Seed Foods
        today = datetime.now()
        raw_items = [
            {
                "id": "food-001",
                "name": "Organic Honeycrisp Apples",
                "category": "Fruits",
                "batch_id": "BATCH-AP-101",
                "quantity": 45.0,
                "unit": "kg",
                "purchase_offset": -3,
                "expiry_offset": 6,
                "storage_temp": 4.0,
                "humidity": 88.0,
                "packaging_type": "Perforated Eco-Carton",
                "freshness_status": "Fresh",
                "freshness_score": 92,
                "spoilage_probability": 0.05,
                "shelf_life": 6,
                "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80"
            },
            {
                "id": "food-002",
                "name": "Cavendish Bananas",
                "category": "Fruits",
                "batch_id": "BATCH-BN-204",
                "quantity": 30.0,
                "unit": "kg",
                "purchase_offset": -5,
                "expiry_offset": 2,
                "storage_temp": 14.0,
                "humidity": 85.0,
                "packaging_type": "Vented Crate",
                "freshness_status": "Near Spoilage",
                "freshness_score": 52,
                "spoilage_probability": 0.45,
                "shelf_life": 2,
                "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80"
            },
            {
                "id": "food-003",
                "name": "Roma Vine Tomatoes",
                "category": "Vegetables",
                "batch_id": "BATCH-TM-305",
                "quantity": 25.0,
                "unit": "kg",
                "purchase_offset": -2,
                "expiry_offset": 5,
                "storage_temp": 11.5,
                "humidity": 82.0,
                "packaging_type": "Open Tray",
                "freshness_status": "Good",
                "freshness_score": 84,
                "spoilage_probability": 0.12,
                "shelf_life": 5,
                "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80"
            },
            {
                "id": "food-004",
                "name": "Russet Gold Potatoes",
                "category": "Vegetables",
                "batch_id": "BATCH-PT-409",
                "quantity": 120.0,
                "unit": "kg",
                "purchase_offset": -6,
                "expiry_offset": 22,
                "storage_temp": 8.0,
                "humidity": 80.0,
                "packaging_type": "Burlap Jute Sack",
                "freshness_status": "Fresh",
                "freshness_score": 95,
                "spoilage_probability": 0.03,
                "shelf_life": 22,
                "image_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80"
            },
            {
                "id": "food-005",
                "name": "Whole Pasteurized Milk (1L)",
                "category": "Dairy Products",
                "batch_id": "BATCH-MK-512",
                "quantity": 60.0,
                "unit": "liters",
                "purchase_offset": -4,
                "expiry_offset": 3,
                "storage_temp": 3.2,
                "humidity": 70.0,
                "packaging_type": "HDPE Jug / Carton",
                "freshness_status": "Acceptable",
                "freshness_score": 74,
                "spoilage_probability": 0.22,
                "shelf_life": 3,
                "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80"
            },
            {
                "id": "food-006",
                "name": "Fresh Boneless Chicken Breast",
                "category": "Meat & Poultry",
                "batch_id": "BATCH-CK-701",
                "quantity": 35.0,
                "unit": "kg",
                "purchase_offset": -1,
                "expiry_offset": 2,
                "storage_temp": 1.2,
                "humidity": 85.0,
                "packaging_type": "Modified Atmosphere Tray",
                "freshness_status": "Fresh",
                "freshness_score": 91,
                "spoilage_probability": 0.06,
                "shelf_life": 2,
                "image_url": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=400&q=80"
            },
            {
                "id": "food-007",
                "name": "Atlantic Salmon Fillets",
                "category": "Seafood",
                "batch_id": "BATCH-SF-803",
                "quantity": 15.0,
                "unit": "kg",
                "purchase_offset": -2,
                "expiry_offset": 1,
                "storage_temp": 0.8,
                "humidity": 90.0,
                "packaging_type": "Iced Poly Styrene Box",
                "freshness_status": "Near Spoilage",
                "freshness_score": 58,
                "spoilage_probability": 0.48,
                "shelf_life": 1,
                "image_url": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80"
            },
            {
                "id": "food-008",
                "name": "Fresh Sweet Strawberries",
                "category": "Fruits",
                "batch_id": "BATCH-SB-104",
                "quantity": 14.0,
                "unit": "kg",
                "purchase_offset": -4,
                "expiry_offset": 0,
                "storage_temp": 2.5,
                "humidity": 92.0,
                "packaging_type": "Vented Clamshell",
                "freshness_status": "Spoiled",
                "freshness_score": 24,
                "spoilage_probability": 0.88,
                "shelf_life": 0,
                "image_url": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=400&q=80"
            }
        ]

        for item in raw_items:
            p_date = (today + timedelta(days=item["purchase_offset"])).strftime("%Y-%m-%d")
            e_date = (today + timedelta(days=item["expiry_offset"])).strftime("%Y-%m-%d")
            
            # History simulation
            history = []
            for d in range(7):
                day_str = (today - timedelta(days=6 - d)).strftime("%Y-%m-%d")
                base_s = item["freshness_score"] + (6 - d)
                history.append({"date": day_str, "score": min(99, max(20, base_s))})

            food_orm = FoodItemORM(
                id=item["id"],
                name=item["name"],
                category=item["category"],
                batch_id=item["batch_id"],
                quantity=item["quantity"],
                unit=item["unit"],
                purchase_date=p_date,
                expiry_date=e_date,
                storage_temp=item["storage_temp"],
                humidity=item["humidity"],
                packaging_type=item["packaging_type"],
                image_url=item["image_url"],
                freshness_status=item["freshness_status"],
                freshness_score=item["freshness_score"],
                spoilage_probability=item["spoilage_probability"],
                estimated_shelf_life_days=item["shelf_life"],
                storage_duration_days=abs(item["purchase_offset"]),
                confidence=0.93,
                detected_issues=["None"] if item["freshness_score"] > 80 else ["Surface discoloration / oxidation"],
                recommendation="Maintain temperature below 4°C." if item["freshness_score"] > 80 else "Dispatch immediately.",
                freshness_history=history
            )
            db.add(food_orm)

        # 4. Seed Recommendations
        recommendations = [
            RecommendationORM(
                id="rec-001",
                food_name="Atlantic Salmon Fillets",
                category="Seafood",
                type="consumption",
                title="Immediate Consumption Priority",
                description="Remaining shelf-life is estimated at 1 day. Distribute or prepare for same-day service.",
                priority="High",
                action_text="Mark for Immediate Kitchen / Retail Dispatch"
            ),
            RecommendationORM(
                id="rec-002",
                food_name="Cavendish Bananas",
                category="Fruits",
                type="inventory",
                title="Front-of-Inventory Rotation",
                description="Ethylene emission levels increasing. Rotate to display front.",
                priority="High",
                action_text="Move to Front Display / Bake Preparation"
            ),
            RecommendationORM(
                id="rec-003",
                food_name="Whole Pasteurized Milk",
                category="Dairy Products",
                type="storage",
                title="Cold Chain Verification",
                description="Ensure crates remain nested in Cold Vault Alpha away from door drafts.",
                priority="Medium",
                action_text="Relocate to Center Vault Shelving"
            )
        ]
        db.add_all(recommendations)

        # 5. Seed Alerts
        alerts = [
            AlertORM(
                id="alt-001",
                title="5 Products Expiring Soon",
                message="Bananas, Salmon fillets, Sourdough bread, and Milk batches have <= 3 days of shelf life.",
                type="Shelf-Life Warning",
                severity="warning",
                timestamp="12 minutes ago",
                is_read=False
            ),
            AlertORM(
                id="alt-002",
                title="Spoilage Threshold Exceeded",
                message="Fresh Strawberries (Batch BATCH-SB-104) identified as Spoiled (Freshness score: 24/100).",
                type="Spoilage Alert",
                severity="critical",
                timestamp="45 minutes ago",
                is_read=False
            ),
            AlertORM(
                id="alt-003",
                title="1 Storage Temperature Warning",
                message="Loading Dock Bay experienced a transient spike to 11.2°C.",
                type="Storage Condition Alert",
                severity="warning",
                timestamp="2 hours ago",
                is_read=False
            )
        ]
        db.add_all(alerts)

        # 6. Seed Reports
        reports = [
            ReportORM(
                id="rep-001",
                title="Comprehensive Weekly Freshness & Quality Audit",
                report_type="Freshness Report",
                created_at="2026-08-31",
                generated_by="Food Quality Inspector",
                summary="128 total items monitored; 82 Fresh (64%), 18 Near Spoilage (14%), 8 Spoiled (6%). Average Freshness 84%.",
                status="Ready",
                data={"total_items": 128, "avg_freshness": 84, "fresh_ratio": "64%", "compliance_rate": "96.5%"}
            ),
            ReportORM(
                id="rep-002",
                title="Shelf-Life Forecast & Expiry Horizon",
                report_type="Shelf-Life Report",
                created_at="2026-09-01",
                generated_by="Retail Manager",
                summary="Identified critical items expiring within 72 hours. Recommended FIFO dispatch strategies.",
                status="Ready",
                data={"critical_expiring_count": 8, "est_preventable_loss_usd": "$1,450.00"}
            )
        ]
        db.add_all(reports)

        db.commit()
        print("[+] Initial data seeded into database successfully.")
    except Exception as e:
        db.rollback()
        print(f"[!] Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
