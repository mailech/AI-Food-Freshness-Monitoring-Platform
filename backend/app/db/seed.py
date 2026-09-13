from datetime import datetime, timedelta
from app.db.session import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.entities import (
    User, Batch, StorageLocation, EnvironmentalReading,
    FoodItem, FreshnessScan, Alert, Recommendation, AuditLog
)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(User).first():
        print("Database already contains data, skipping seed.")
        db.close()
        return

    print("Seeding database with roles, produce, batches, storage zones, and telemetry...")
    
    # 1. Users for all 5 roles
    users_data = [
        ("admin@foodfresh.io", "System Administrator", "administrator", "HQ Ops"),
        ("consumer@foodfresh.io", "Sarah Jenkins", "consumer", "Household"),
        ("retail@foodfresh.io", "Marcus Vance", "retail_manager", "Store #104 - Fresh Produce"),
        ("warehouse@foodfresh.io", "David Chen", "warehouse_operator", "Central Cold Logistics Hub"),
        ("inspector@foodfresh.io", "Elena Rostova", "food_quality_inspector", "State Agri-Food Safety Board")
    ]
    
    users = {}
    for email, name, role, dept in users_data:
        u = User(
            email=email,
            full_name=name,
            role=role,
            department=dept,
            hashed_password=get_password_hash("password123"),
            is_active=True
        )
        db.add(u)
        users[role] = u
        
    db.commit()
    for role, u in users.items():
        db.refresh(u)
        
    # 2. Storage Locations
    storage_zones = [
        StorageLocation(
            name="Cold Storage Room A (Apples & Citrus)",
            location_type="Walk-in Cold Room",
            ideal_temp_min=1.0, ideal_temp_max=4.0,
            ideal_humidity_min=85.0, ideal_humidity_max=95.0,
            current_temperature=2.8, current_humidity=90.5,
            air_circulation="Medium", light_exposure="Dark"
        ),
        StorageLocation(
            name="Banana Ripening & Temperate Zone",
            location_type="Controlled Climate Room",
            ideal_temp_min=13.0, ideal_temp_max=16.0,
            ideal_humidity_min=80.0, ideal_humidity_max=90.0,
            current_temperature=14.2, current_humidity=84.0,
            air_circulation="High", light_exposure="Low Light"
        ),
        StorageLocation(
            name="Retail Display Cooler #3",
            location_type="Open Refrigerated Shelf",
            ideal_temp_min=2.0, ideal_temp_max=6.0,
            ideal_humidity_min=65.0, ideal_humidity_max=85.0,
            current_temperature=4.5, current_humidity=72.0,
            air_circulation="Medium", light_exposure="Ambient"
        ),
        StorageLocation(
            name="Dry Ambient Pantry Zone",
            location_type="Ambient Warehouse Shelf",
            ideal_temp_min=15.0, ideal_temp_max=22.0,
            ideal_humidity_min=40.0, ideal_humidity_max=60.0,
            current_temperature=19.5, current_humidity=52.0,
            air_circulation="Low", light_exposure="Ambient"
        )
    ]
    for sz in storage_zones:
        db.add(sz)
    db.commit()
    for sz in storage_zones:
        db.refresh(sz)
        
    # 3. Environmental Readings (Time-series history)
    for sz in storage_zones:
        for hours_ago in range(24, 0, -3):
            reading = EnvironmentalReading(
                storage_location_id=sz.id,
                temperature=round(sz.current_temperature + (hours_ago % 3 - 1) * 0.4, 1),
                humidity=round(sz.current_humidity + (hours_ago % 4 - 2) * 1.1, 1),
                air_circulation=sz.air_circulation,
                light_exposure=sz.light_exposure,
                is_compliant=True,
                recorded_by="IoT Sensor Node v2.1",
                timestamp=datetime.utcnow() - timedelta(hours=hours_ago)
            )
            db.add(reading)
            
    # 4. Batches
    batches = [
        Batch(
            batch_number="BATCH-2026-APL-001",
            supplier_name="Valley Green Orchards",
            category="Fruits",
            total_quantity=500.0,
            unit="kg",
            initial_quality_grade="Grade A",
            inspection_status="passed",
            notes="Fuji apples, pristine batch from autumn harvest."
        ),
        Batch(
            batch_number="BATCH-2026-BAN-004",
            supplier_name="Tropical Tropic Exotics",
            category="Fruits",
            total_quantity=800.0,
            unit="kg",
            initial_quality_grade="Grade A",
            inspection_status="passed",
            notes="Cavendish bananas, mature green stage 2."
        ),
        Batch(
            batch_number="BATCH-2026-ORG-012",
            supplier_name="Sunburst Citrus Groves",
            category="Fruits",
            total_quantity=650.0,
            unit="kg",
            initial_quality_grade="Grade B",
            inspection_status="pending",
            notes="Valencia oranges, slight color variance pending inspector signoff."
        )
    ]
    for b in batches:
        db.add(b)
    db.commit()
    for b in batches:
        db.refresh(b)
        
    # 5. Food Items across all 8 categories
    now = datetime.utcnow()
    items_data = [
        # Fruits
        ("Crisp Fuji Apples", "Fruits", batches[0].id, storage_zones[0].id, 150.0, "kg", "Sealed Container", 96.0, 93.5, "Fresh", 2, now + timedelta(days=18), "active", "/samples/freshapples_1.jpg"),
        ("Ripe Cavendish Bananas", "Fruits", batches[1].id, storage_zones[1].id, 120.0, "kg", "Unpackaged", 92.0, 78.0, "Good", 4, now + timedelta(days=4), "active", "/samples/freshbanana_1.jpg"),
        ("Valencia Oranges", "Fruits", batches[2].id, storage_zones[0].id, 200.0, "kg", "Paper Bag", 88.0, 84.0, "Good", 3, now + timedelta(days=12), "active", "/samples/freshoranges_1.jpg"),
        ("Spotting Dessert Bananas", "Fruits", batches[1].id, storage_zones[2].id, 35.0, "kg", "Unpackaged", 85.0, 38.0, "Near Spoilage", 7, now + timedelta(days=1), "markdown", "/samples/rottenbanana_1.jpg"),
        ("Bruised Braeburn Apples", "Fruits", batches[0].id, storage_zones[2].id, 18.0, "kg", "Unpackaged", 90.0, 22.0, "Spoiled", 11, now - timedelta(days=1), "quarantined", "/samples/rottenapples_1.jpg"),
        
        # Other categories required by spec
        ("Organic Roman Spinach", "Vegetables", None, storage_zones[2].id, 40.0, "kg", "Plastic Wrap", 94.0, 89.0, "Fresh", 1, now + timedelta(days=6), "active", None),
        ("Farm Fresh Whole Milk", "Dairy Products", None, storage_zones[2].id, 60.0, "liters", "Sealed Container", 98.0, 91.0, "Fresh", 2, now + timedelta(days=8), "active", None),
        ("Prime Beef Tenderloin", "Meat & Poultry", None, storage_zones[2].id, 25.0, "kg", "Vacuum Sealed", 95.0, 92.0, "Fresh", 1, now + timedelta(days=4), "active", None),
        ("Atlantic Wild Salmon Fillet", "Seafood", None, storage_zones[2].id, 20.0, "kg", "Vacuum Sealed", 96.0, 88.0, "Fresh", 1, now + timedelta(days=2), "active", None),
        ("Artisan Sourdough Loaf", "Bakery Products", None, storage_zones[3].id, 30.0, "units", "Paper Bag", 95.0, 72.0, "Good", 2, now + timedelta(days=3), "active", None),
        ("Whole Grain Cereal Box", "Packaged Foods", None, storage_zones[3].id, 100.0, "units", "Sealed Container", 99.0, 98.0, "Fresh", 10, now + timedelta(days=180), "active", None),
        ("Cold Pressed Orange Juice", "Beverages", None, storage_zones[2].id, 50.0, "bottles", "Sealed Container", 97.0, 85.0, "Good", 3, now + timedelta(days=14), "active", None)
    ]
    
    food_items = []
    for name, cat, bid, sid, qty, unit, pkg, init_sc, curr_sc, q_cat, days, exp, st, img in items_data:
        item = FoodItem(
            name=name,
            category=cat,
            batch_id=bid,
            storage_location_id=sid,
            user_id=users['consumer'].id if cat == 'Fruits' and 'Bananas' in name else users['administrator'].id,
            quantity=qty,
            unit=unit,
            packaging_type=pkg,
            initial_freshness_score=init_sc,
            current_freshness_score=curr_sc,
            quality_category=q_cat,
            harvest_date=now - timedelta(days=days + 2),
            purchase_date=now - timedelta(days=days),
            estimated_expiry_date=exp,
            days_stored=days,
            status=st,
            image_url=img
        )
        db.add(item)
        food_items.append(item)
        
    db.commit()
    for item in food_items:
        db.refresh(item)
        
    # 6. Freshness Scans for produce
    scans_seed = [
        FreshnessScan(
            food_item_id=food_items[0].id,
            user_id=users['food_quality_inspector'].id,
            image_url="/samples/freshapples_1.jpg",
            image_filename="freshapples_1.jpg",
            predicted_class="freshapples",
            confidence=0.982,
            visual_condition_score=95.0,
            color_score=96.0,
            texture_score=94.0,
            mold_detected=False,
            bruising_detected=False,
            physical_damage_detected=False,
            spoilage_probability=0.03,
            freshness_category="Fresh",
            freshness_score=94.5,
            predicted_shelf_life_days=18.0,
            expiry_forecast_date=now + timedelta(days=18),
            scan_timestamp=now - timedelta(hours=6)
        ),
        FreshnessScan(
            food_item_id=food_items[3].id,
            user_id=users['retail_manager'].id,
            image_url="/samples/rottenbanana_1.jpg",
            image_filename="rottenbanana_1.jpg",
            predicted_class="rottenbanana",
            confidence=0.965,
            visual_condition_score=35.0,
            color_score=30.0,
            texture_score=40.0,
            mold_detected=False,
            bruising_detected=True,
            physical_damage_detected=False,
            spoilage_probability=0.68,
            freshness_category="Near Spoilage",
            freshness_score=38.0,
            predicted_shelf_life_days=1.2,
            expiry_forecast_date=now + timedelta(days=1),
            scan_timestamp=now - timedelta(hours=2)
        )
    ]
    for sc in scans_seed:
        db.add(sc)
        
    # 7. Alerts
    alerts_seed = [
        Alert(
            alert_type="shelf_life",
            severity="high",
            title="Expiring Soon: Spotting Dessert Bananas",
            message="Batch has 1.2 days shelf life remaining. Apply 40% markdown or prioritize for bakery use.",
            food_item_id=food_items[3].id,
            storage_location_id=storage_zones[2].id,
            is_read=False,
            is_resolved=False
        ),
        Alert(
            alert_type="spoilage",
            severity="critical",
            title="Critical Spoilage: Braeburn Apples",
            message="Severe rot detected on Braeburn Apples batch. Immediate quarantine applied.",
            food_item_id=food_items[4].id,
            storage_location_id=storage_zones[2].id,
            is_read=False,
            is_resolved=False
        ),
        Alert(
            alert_type="storage_condition",
            severity="medium",
            title="Humidity Deviation in Retail Display #3",
            message="Relative humidity is 72.0%, below optimal 85% range for leafy produce.",
            storage_location_id=storage_zones[2].id,
            is_read=True,
            is_resolved=False
        )
    ]
    for al in alerts_seed:
        db.add(al)
        
    # 8. Recommendations
    recs_seed = [
        Recommendation(
            food_item_id=food_items[3].id,
            recommendation_type="rotation",
            title="FIFO Rotation & Markdown Discount",
            description="Move Bananas to front display shelf with 35% discount or dispatch to bakery kitchen.",
            priority="high",
            action_taken=False
        ),
        Recommendation(
            food_item_id=food_items[0].id,
            recommendation_type="storage",
            title="Maintain Cold Room A Atmosphere",
            description="Apples in prime state. Keep temperature at 2.5°C and 90% humidity to sustain 18+ days shelf life.",
            priority="low",
            action_taken=True
        ),
        Recommendation(
            food_item_id=food_items[1].id,
            recommendation_type="consumption",
            title="Consume Bananas in 2–3 Days",
            description="Bananas are at peak eating ripeness. Consume or refrigerate in paper bag.",
            priority="medium",
            action_taken=False
        )
    ]
    for r in recs_seed:
        db.add(r)
        
    # 9. Audit Logs
    db.add(AuditLog(
        user_id=users['administrator'].id,
        user_email=users['administrator'].email,
        action="SYSTEM_INITIALIZED",
        entity_type="Platform",
        details="Food Freshness Monitoring Platform initialized with seed dataset and 5 user roles."
    ))
    
    db.commit()
    db.close()
    print("Database seeded successfully with all roles, produce, and telemetry!")

if __name__ == '__main__':
    seed_database()
