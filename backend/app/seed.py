"""Database seeder.

    python -m app.seed                # create tables if needed, then seed
    python -m app.seed --reset        # DROP everything first (development only)
    python -m app.seed --no-analysis  # skip running the ML pipeline on samples

Seeds roles, demo users, all eight food categories, products, batches across
every category, storage conditions, two weeks of environmental readings,
freshness assessments (produced by the *real* pipeline on generated sample
images), shelf-life predictions, recommendations, alerts and notifications - so
every dashboard has meaningful content on first login.

Demo credentials are printed at the end. They are development-only.
"""

from __future__ import annotations

import argparse
import random
import sys
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select

from app.config import settings
from app.core.enums import (
    AlertSeverity,
    NotificationType,
    PackagingType,
    RoleName,
    SensorSource,
)
from app.core.logging_config import configure_logging, get_logger
from app.database import SessionLocal, engine
from app.models import (
    Base,
    FoodBatch,
    FoodImage,
    FoodProduct,
    InventoryItem,
    User,
)
from app.sample_images import SAMPLE_SPECS, generate_sample_image, write_sample_library

logger = get_logger("app.seed")
RNG = random.Random(20260915)  # deterministic seed data


# ---------------------------------------------------------------- catalogue
# (product name, category slug, brand, unit, shelf_life_days, packaging)
PRODUCTS: list[tuple[str, str, str, str, float, str]] = [
    # --- fruits ---
    ("Alphonso Mango", "FRUITS", "Konkan Farms", "kg", 6, PackagingType.LOOSE.value),
    ("Cavendish Banana", "FRUITS", "TropiFresh", "kg", 5, PackagingType.LOOSE.value),
    ("Royal Gala Apple", "FRUITS", "Orchard Valley", "kg", 21, PackagingType.PLASTIC_WRAP.value),
    ("Strawberry Punnet", "FRUITS", "Berry Best", "pcs", 4, PackagingType.PLASTIC_CONTAINER.value),
    ("Nagpur Orange", "FRUITS", "Citrus Co", "kg", 12, PackagingType.LOOSE.value),
    # --- vegetables ---
    ("Roma Tomato", "VEGETABLES", "GreenLeaf", "kg", 8, PackagingType.LOOSE.value),
    ("Baby Spinach", "VEGETABLES", "GreenLeaf", "kg", 5, PackagingType.MODIFIED_ATMOSPHERE.value),
    ("Carrot", "VEGETABLES", "RootWorks", "kg", 20, PackagingType.PLASTIC_WRAP.value),
    ("Broccoli Crown", "VEGETABLES", "GreenLeaf", "kg", 7, PackagingType.PLASTIC_WRAP.value),
    ("Red Onion", "VEGETABLES", "RootWorks", "kg", 45, PackagingType.PAPER.value),
    # --- dairy ---
    ("Full Cream Milk 1L", "DAIRY", "DairyPure", "l", 8, PackagingType.TETRA_PACK.value),
    ("Greek Yoghurt 500g", "DAIRY", "DairyPure", "pcs", 18, PackagingType.PLASTIC_CONTAINER.value),
    ("Cheddar Block 250g", "DAIRY", "Highland Creamery", "pcs", 40, PackagingType.VACUUM_SEALED.value),
    ("Salted Butter 200g", "DAIRY", "Highland Creamery", "pcs", 60, PackagingType.PAPER.value),
    ("Paneer 400g", "DAIRY", "DairyPure", "pcs", 6, PackagingType.VACUUM_SEALED.value),
    # --- meat & poultry ---
    ("Chicken Breast", "MEAT_POULTRY", "FarmSelect", "kg", 4, PackagingType.VACUUM_SEALED.value),
    ("Minced Lamb", "MEAT_POULTRY", "FarmSelect", "kg", 3, PackagingType.MODIFIED_ATMOSPHERE.value),
    ("Pork Sausages", "MEAT_POULTRY", "Butcher's Own", "kg", 6, PackagingType.MODIFIED_ATMOSPHERE.value),
    ("Beef Sirloin", "MEAT_POULTRY", "Prime Cuts", "kg", 5, PackagingType.VACUUM_SEALED.value),
    # --- seafood ---
    ("Atlantic Salmon Fillet", "SEAFOOD", "Ocean Harvest", "kg", 3, PackagingType.VACUUM_SEALED.value),
    ("Tiger Prawns", "SEAFOOD", "Ocean Harvest", "kg", 2, PackagingType.MODIFIED_ATMOSPHERE.value),
    ("Pomfret Whole", "SEAFOOD", "Coastal Catch", "kg", 2, PackagingType.LOOSE.value),
    # --- bakery ---
    ("Sourdough Loaf", "BAKERY", "Stone Oven", "pcs", 4, PackagingType.PAPER.value),
    ("Butter Croissant", "BAKERY", "Stone Oven", "pcs", 2, PackagingType.PAPER.value),
    ("Multigrain Bread", "BAKERY", "Daily Bake", "pcs", 6, PackagingType.PLASTIC_WRAP.value),
    ("Chocolate Muffin", "BAKERY", "Daily Bake", "pcs", 5, PackagingType.PLASTIC_WRAP.value),
    # --- packaged ---
    ("Basmati Rice 5kg", "PACKAGED", "Golden Grain", "pcs", 540, PackagingType.PLASTIC_CONTAINER.value),
    ("Chickpeas Can 400g", "PACKAGED", "Pantry Co", "pcs", 730, PackagingType.CANNED.value),
    ("Rolled Oats 1kg", "PACKAGED", "Morning Fields", "pcs", 300, PackagingType.PAPER.value),
    ("Tomato Passata 700g", "PACKAGED", "Pantry Co", "pcs", 400, PackagingType.GLASS_JAR.value),
    # --- beverages ---
    ("Fresh Orange Juice 1L", "BEVERAGES", "Citrus Co", "l", 6, PackagingType.TETRA_PACK.value),
    ("Sparkling Water 1.5L", "BEVERAGES", "AquaClear", "l", 365, PackagingType.PLASTIC_CONTAINER.value),
    ("Cold Brew Coffee 500ml", "BEVERAGES", "Bean Lab", "l", 14, PackagingType.GLASS_JAR.value),
]

LOCATIONS_BY_CATEGORY = {
    "FRUITS": ["Produce Cold Store", "Cold Room A"],
    "VEGETABLES": ["Produce Cold Store", "Cold Room B"],
    "DAIRY": ["Dairy Chiller"],
    "MEAT_POULTRY": ["Meat Chiller"],
    "SEAFOOD": ["Meat Chiller", "Cold Room A"],
    "BAKERY": ["Bakery Shelf"],
    "PACKAGED": ["Dry Store"],
    "BEVERAGES": ["Dry Store", "Cold Room B"],
}

SUPPLIERS = [
    "Nova Wholesale",
    "Harvest Direct",
    "Metro Foods",
    "Coastal Logistics",
    "Regional Co-op",
]

# (email, full name, role, organisation, job title)
DEMO_USERS = [
    ("admin@freshness.example.com", "Administrator", RoleName.ADMIN, "Freshness Platform", "Platform Administrator"),
    ("manager@freshness.example.com", "Retail", RoleName.RETAIL_MANAGER, "FreshMart Retail", "Store Quality Manager"),
    ("warehouse@freshness.example.com", "Warehouse", RoleName.WAREHOUSE_OPERATOR, "FreshMart Logistics", "Cold Chain Operator"),
    ("inspector@freshness.example.com", "Inspector", RoleName.QUALITY_INSPECTOR, "FreshMart Quality", "Food Quality Inspector"),
    ("consumer@freshness.example.com", "Consumer", RoleName.CONSUMER, None, None),
]


# ------------------------------------------------------------------ helpers
def _pick_condition() -> str:
    """Choose a freshness scenario with a realistic skew toward good stock."""
    return RNG.choices(
        ["fresh", "good", "acceptable", "near_spoilage", "spoiled"],
        weights=[34, 30, 18, 12, 6],
        k=1,
    )[0]


def _storage_for(category_slug: str, condition: str) -> tuple[float, float, str, str]:
    """Temperature/humidity consistent with the scenario (bad stock, bad storage)."""
    from app.core.category_rules import get_profile

    rule = get_profile(category_slug).storage_rule
    mid_temp = (rule.temp_min_c + rule.temp_max_c) / 2
    mid_hum = (rule.humidity_min_pct + rule.humidity_max_pct) / 2

    if condition in {"fresh", "good"}:
        temperature = round(RNG.uniform(rule.temp_min_c, rule.temp_max_c), 1)
        humidity = round(RNG.uniform(rule.humidity_min_pct, rule.humidity_max_pct), 1)
        circulation, light = "GOOD", "LOW"
    elif condition == "acceptable":
        temperature = round(rule.temp_max_c + RNG.uniform(0.2, 1.4), 1)
        humidity = round(mid_hum + RNG.uniform(-6, 6), 1)
        circulation, light = "MODERATE", "LOW"
    elif condition == "near_spoilage":
        temperature = round(rule.temp_max_c + RNG.uniform(1.6, 4.0), 1)
        humidity = round(min(99.0, rule.humidity_max_pct + RNG.uniform(2, 9)), 1)
        circulation, light = "MODERATE", "MODERATE"
    else:  # spoiled
        temperature = round(rule.temp_max_c + RNG.uniform(4.0, 8.0), 1)
        humidity = round(min(99.0, rule.humidity_max_pct + RNG.uniform(4, 12)), 1)
        circulation, light = "POOR", "HIGH"

    _ = mid_temp
    return temperature, humidity, circulation, light


def _dates_for(condition: str, shelf_life_days: float) -> tuple[date, date, date]:
    """(purchase_date, storage_date, expected_expiry) consistent with the scenario."""
    today = date.today()
    life = max(2.0, shelf_life_days)

    if condition == "fresh":
        age = RNG.randint(0, max(1, int(life * 0.15)))
    elif condition == "good":
        age = RNG.randint(int(life * 0.15), max(2, int(life * 0.4)))
    elif condition == "acceptable":
        age = RNG.randint(int(life * 0.4), max(3, int(life * 0.65)))
    elif condition == "near_spoilage":
        age = RNG.randint(int(life * 0.65), max(4, int(life * 0.95)))
    else:
        age = RNG.randint(int(life * 0.95), int(life * 1.4) + 1)

    purchase = today - timedelta(days=age)
    storage = purchase + timedelta(days=RNG.choice([0, 0, 1]))
    expiry = purchase + timedelta(days=int(round(life)))
    return purchase, storage, expiry


def _sample_spec_for(category_slug: str, condition: str) -> str:
    """Map (category, condition) onto one of the generated sample images."""
    mapping = {
        ("FRUITS", "fresh"): "fresh_tomato",
        ("FRUITS", "good"): "ripe_banana",
        ("FRUITS", "acceptable"): "bruised_apple",
        ("FRUITS", "near_spoilage"): "overripe_banana",
        ("FRUITS", "spoiled"): "rotten_produce",
        ("VEGETABLES", "fresh"): "fresh_greens",
        ("VEGETABLES", "good"): "fresh_greens",
        ("VEGETABLES", "acceptable"): "wilting_greens",
        ("VEGETABLES", "near_spoilage"): "wilting_greens",
        ("VEGETABLES", "spoiled"): "rotten_produce",
        ("BAKERY", "fresh"): "fresh_bread",
        ("BAKERY", "good"): "fresh_bread",
        ("BAKERY", "acceptable"): "stale_bread",
        ("BAKERY", "near_spoilage"): "mouldy_bread",
        ("BAKERY", "spoiled"): "mouldy_bread",
        ("DAIRY", "fresh"): "fresh_dairy",
        ("DAIRY", "good"): "fresh_dairy",
        ("DAIRY", "acceptable"): "aging_dairy",
        ("DAIRY", "near_spoilage"): "mouldy_dairy",
        ("DAIRY", "spoiled"): "mouldy_dairy",
        ("MEAT_POULTRY", "fresh"): "fresh_meat",
        ("MEAT_POULTRY", "good"): "fresh_meat",
        ("MEAT_POULTRY", "acceptable"): "aging_meat",
        ("MEAT_POULTRY", "near_spoilage"): "spoiling_meat",
        ("MEAT_POULTRY", "spoiled"): "spoiling_meat",
        ("SEAFOOD", "fresh"): "fresh_fish",
        ("SEAFOOD", "good"): "fresh_fish",
        ("SEAFOOD", "acceptable"): "aging_fish",
        ("SEAFOOD", "near_spoilage"): "spoiling_fish",
        ("SEAFOOD", "spoiled"): "spoiling_fish",
    }
    default = {
        "fresh": "packaged_good",
        "good": "packaged_good",
        "acceptable": "packaged_good",
        "near_spoilage": "packaged_damaged",
        "spoiled": "packaged_damaged",
    }
    return mapping.get((category_slug, condition), default[condition])


# -------------------------------------------------------------------- steps
def seed_roles_and_users(db) -> dict[str, User]:
    from app.auth import service as auth_service

    auth_service.ensure_roles(db)
    users: dict[str, User] = {}

    for email, full_name, role, organisation, job_title in DEMO_USERS:
        existing = auth_service.get_user_by_email(db, email)
        if existing is not None:
            users[role.value] = existing
            continue
        user = auth_service.register_user(
            db,
            email=email,
            password=settings.SEED_DEMO_PASSWORD,
            full_name=full_name,
            username=email.split("@")[0],
            role_name=role.value,
            profile={
                "organisation": organisation,
                "job_title": job_title,
                "default_storage_location": (
                    "Cold Room A" if role == RoleName.WAREHOUSE_OPERATOR else None
                ),
                "timezone": "Asia/Kolkata",
                "notify_in_app": True,
            },
            allow_privileged=True,
        )
        user.is_verified = True
        users[role.value] = user

    db.flush()
    logger.info("seeded %d demo users", len(users))
    return users


def seed_products(db, owner: User) -> list[FoodProduct]:
    from app.inventory.categories import resolve_category, sync_categories

    sync_categories(db)

    created: list[FoodProduct] = []
    for index, (name, slug, brand, unit, shelf_life, packaging) in enumerate(PRODUCTS, start=1):
        existing = db.scalar(select(FoodProduct).where(FoodProduct.name == name))
        if existing is not None:
            created.append(existing)
            continue
        category = resolve_category(db, category_slug=slug)
        product = FoodProduct(
            name=name,
            sku=f"SKU-{slug[:3]}-{index:04d}",
            brand=brand,
            description=f"{name} supplied by {brand}.",
            category_id=category.id,
            default_unit=unit,
            shelf_life_days=float(shelf_life),
            default_packaging=packaging,
            storage_instructions=category.description,
            is_active=True,
            created_by_id=owner.id,
        )
        db.add(product)
        created.append(product)
    db.flush()
    logger.info("seeded %d products", len(created))
    return created


def seed_batches(db, products: list[FoodProduct], users: dict[str, User]) -> list[dict]:
    """Create batches with storage conditions. Returns analysis plans."""
    from app.inventory.service import create_batch

    manager = users[RoleName.RETAIL_MANAGER.value]
    consumer = users[RoleName.CONSUMER.value]

    plans: list[dict] = []
    counter = 0

    for product in products:
        slug = product.category.slug
        # 1-2 batches per product so dashboards are populated but seeding is quick.
        for _ in range(RNG.choice([1, 1, 2])):
            counter += 1
            condition = _pick_condition()
            shelf_life = float(product.shelf_life_days or 7)
            purchase, storage_date, expiry = _dates_for(condition, shelf_life)
            temperature, humidity, circulation, light = _storage_for(slug, condition)
            location = RNG.choice(LOCATIONS_BY_CATEGORY.get(slug, ["Cold Room A"]))

            # Consumers get small quantities of everyday items.
            consumer_item = slug in {"FRUITS", "VEGETABLES", "DAIRY", "BAKERY"} and RNG.random() < 0.32
            creator = consumer if consumer_item else manager
            quantity = (
                round(RNG.uniform(0.5, 3.0), 2)
                if consumer_item
                else round(RNG.uniform(8, 140), 2)
            )

            batch = create_batch(
                db,
                {
                    "product_id": product.id,
                    "quantity": quantity,
                    "unit": product.default_unit,
                    "purchase_date": purchase,
                    "storage_date": storage_date,
                    "expected_expiry_date": expiry,
                    "packaging_type": product.default_packaging,
                    "storage_location": None if consumer_item else location,
                    "supplier": None if consumer_item else RNG.choice(SUPPLIERS),
                    "cost_per_unit": round(RNG.uniform(0.6, 14.0), 2),
                    "temperature_c": temperature,
                    "humidity_pct": humidity,
                    "air_circulation": circulation,
                    "light_exposure": light,
                    "add_to_my_inventory": True,
                    "notes": None,
                },
                creator,
            )
            plans.append(
                {
                    "batch_id": batch.id,
                    "condition": condition,
                    "sample": _sample_spec_for(slug, condition),
                    "temperature_c": temperature,
                    "humidity_pct": humidity,
                    "air_circulation": circulation,
                    "light_exposure": light,
                    "analyst": (
                        consumer if consumer_item else users[RoleName.QUALITY_INSPECTOR.value]
                    ),
                    "consumer_item": consumer_item,
                }
            )

    db.flush()
    logger.info("seeded %d batches", len(plans))
    return plans


def seed_storage_readings(db, days: int = 14) -> int:
    """Two weeks of environmental history for trend graphs."""
    from app.core.category_rules import get_profile
    from app.models import StorageReading
    from app.storage.service import evaluate_compliance, rule_for_batch

    batches = list(
        db.scalars(select(FoodBatch).where(FoodBatch.is_archived.is_(False))).unique().all()
    )
    batches_with_location = [b for b in batches if b.storage_location]
    created = 0
    now = datetime.now(UTC)

    for batch in batches_with_location:
        rule = rule_for_batch(batch)
        condition = batch.storage_conditions[0] if batch.storage_conditions else None
        target_temp = condition.temperature_c if condition and condition.temperature_c is not None else (
            (rule["temp_min_c"] + rule["temp_max_c"]) / 2
        )
        target_hum = condition.humidity_pct if condition and condition.humidity_pct is not None else (
            (rule["humidity_min_pct"] + rule["humidity_max_pct"]) / 2
        )
        _ = get_profile(batch.product.category.slug if batch.product else None)

        # Three samples per day.
        for day_offset in range(days, 0, -1):
            for hour in (7, 14, 21):
                recorded = (now - timedelta(days=day_offset)).replace(
                    hour=hour, minute=RNG.randint(0, 59), second=0, microsecond=0
                )
                # Drift toward the current value over time + diurnal noise.
                progress = 1.0 - (day_offset / days)
                temperature = round(
                    target_temp - (1.4 * (1 - progress)) + RNG.uniform(-0.7, 0.9)
                    + (0.5 if hour == 14 else -0.2),
                    2,
                )
                humidity = round(
                    max(5.0, min(99.0, target_hum + RNG.uniform(-4.5, 4.5))), 1
                )
                evaluation = evaluate_compliance(
                    temperature_c=temperature, humidity_pct=humidity, rule=rule
                )
                db.add(
                    StorageReading(
                        batch_id=batch.id,
                        storage_condition_id=condition.id if condition else None,
                        location_name=batch.storage_location,
                        sensor_id=f"TMP-{batch.storage_location[:4].upper().replace(' ', '')}-01",
                        source=SensorSource.MOCK_SENSOR.value,
                        temperature_c=temperature,
                        humidity_pct=humidity,
                        co2_ppm=round(RNG.uniform(420, 620), 1),
                        compliance_status=evaluation["compliance_status"],
                        is_violation=evaluation["compliance_status"]
                        in {"WARNING", "NON_COMPLIANT"},
                        recorded_at=recorded,
                    )
                )
                created += 1
        db.flush()

    logger.info("seeded %d storage readings", created)
    return created


def seed_analyses(db, plans: list[dict], run_ml: bool = True) -> int:
    """Run the real analysis pipeline over generated sample images."""
    from app.freshness.service import analyze_batch
    from app.services.storage_backend import build_storage_key, get_storage

    if not run_ml:
        logger.info("skipping ML analysis (--no-analysis)")
        return 0

    storage = get_storage()
    analysed = 0

    for plan in plans:
        batch = db.get(FoodBatch, plan["batch_id"])
        if batch is None:
            continue

        image_bytes = generate_sample_image(plan["sample"])
        key = build_storage_key(
            f"{plan['sample']}.jpg", prefix="food-images/seed", owner_id=plan["analyst"].id
        )
        storage.save(key, image_bytes, "image/jpeg")

        image = FoodImage(
            batch_id=batch.id,
            uploaded_by_id=plan["analyst"].id,
            storage_key=key,
            storage_backend=storage.name,
            original_filename=f"{plan['sample']}.jpg",
            content_type="image/jpeg",
            size_bytes=len(image_bytes),
            width=520,
            height=520,
            checksum_sha256=storage.checksum(image_bytes),
            caption=f"Seed sample: {plan['sample'].replace('_', ' ')}",
        )
        db.add(image)
        db.flush()

        analyze_batch(
            db,
            batch,
            image_bytes=image_bytes,
            image=image,
            temperature_c=plan["temperature_c"],
            humidity_pct=plan["humidity_pct"],
            air_circulation=plan["air_circulation"],
            light_exposure=plan["light_exposure"],
            packaging_type=batch.packaging_type,
            user=plan["analyst"],
        )
        analysed += 1
        if analysed % 10 == 0:
            db.flush()
            logger.info("analysed %d/%d seed batches", analysed, len(plans))

    db.flush()
    logger.info("ran the analysis pipeline on %d batches", analysed)
    return analysed


def seed_alerts_and_notifications(db, users: dict[str, User]) -> dict:
    from app.notifications.alerts import scan_all_batches
    from app.notifications.service import broadcast_system_notification

    counts = scan_all_batches(db, users[RoleName.WAREHOUSE_OPERATOR.value])

    broadcast_system_notification(
        db,
        title="Welcome to the AI Food Freshness Monitoring Platform",
        message=(
            "Demo data has been loaded. Freshness and shelf-life figures are produced by "
            "transparent baseline models unless you install trained artefacts - see the "
            "'Model provenance' panel for details."
        ),
        severity=AlertSeverity.INFO,
    )
    db.flush()
    logger.info("alert scan raised: %s", counts)
    return counts


def seed_rotation(db) -> int:
    from app.recommendations.rotation import refresh_rotation_priorities

    count = refresh_rotation_priorities(db)
    db.flush()
    return count


# --------------------------------------------------------------------- main
def run(reset: bool = False, run_ml: bool = True, write_samples: bool = True) -> None:
    configure_logging()
    settings.ensure_directories()

    if reset:
        if settings.ENVIRONMENT == "production":
            logger.error("refusing to --reset in a production environment")
            sys.exit(2)
        logger.warning("dropping all tables (--reset)")
        Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)
    logger.info("schema ready (%s)", "sqlite" if settings.is_sqlite else "postgresql")

    if write_samples:
        # Writing the sample library is a developer convenience; a read-only or
        # missing directory must never stop the seed from running.
        try:
            written = write_sample_library()
            logger.info("wrote %d sample images to %s", written, settings.SAMPLE_DIR)
        except OSError as exc:
            logger.warning(
                "could not write the sample image library to %s (%s) - continuing; "
                "the seeder generates the images it needs in memory",
                settings.SAMPLE_DIR,
                exc,
            )

    db = SessionLocal()
    try:
        already = db.scalar(select(func.count(FoodBatch.id))) or 0
        if already and not reset:
            logger.info(
                "database already contains %d batches - seeding demo users/products only. "
                "Use --reset for a clean re-seed.",
                already,
            )
            users = seed_roles_and_users(db)
            seed_products(db, users[RoleName.RETAIL_MANAGER.value])
            db.commit()
            _print_summary(db)
            return

        users = seed_roles_and_users(db)
        products = seed_products(db, users[RoleName.RETAIL_MANAGER.value])
        db.commit()

        plans = seed_batches(db, products, users)
        db.commit()

        seed_storage_readings(db)
        db.commit()

        seed_analyses(db, plans, run_ml=run_ml)
        db.commit()

        seed_rotation(db)
        seed_alerts_and_notifications(db, users)
        db.commit()

        _print_summary(db)
    except Exception:
        db.rollback()
        logger.exception("seeding failed")
        raise
    finally:
        db.close()


def _print_summary(db) -> None:
    from app.models import (
        Alert,
        FoodCategory,
        FreshnessAssessment,
        Notification,
        Recommendation,
        ShelfLifePrediction,
        StorageReading,
    )

    def count(model) -> int:
        return int(db.scalar(select(func.count(model.id))) or 0)

    print()
    print("=" * 74)
    print(" SEED COMPLETE - AI Food Freshness Monitoring Platform")
    print("=" * 74)
    print(f"  Users .................. {count(User)}")
    print(f"  Categories ............. {count(FoodCategory)}")
    print(f"  Products ............... {count(FoodProduct)}")
    print(f"  Batches ................ {count(FoodBatch)}")
    print(f"  Inventory items ........ {count(InventoryItem)}")
    print(f"  Images ................. {count(FoodImage)}")
    print(f"  Freshness assessments .. {count(FreshnessAssessment)}")
    print(f"  Shelf-life predictions . {count(ShelfLifePrediction)}")
    print(f"  Storage readings ....... {count(StorageReading)}")
    print(f"  Recommendations ........ {count(Recommendation)}")
    print(f"  Alerts ................. {count(Alert)}")
    print(f"  Notifications .......... {count(Notification)}")
    print("-" * 74)
    print(" DEMO CREDENTIALS (development only)")
    print(f"   password for every account: {settings.SEED_DEMO_PASSWORD}")
    for email, name, role, *_ in DEMO_USERS:
        print(f"   {role.value:<20} {email:<32} ({name})")
    print("-" * 74)
    print(f" DEMO_MODE={settings.DEMO_MODE}")
    print(
        "   Freshness / spoilage / shelf-life outputs come from transparent baseline\n"
        "   models. They are labelled as such in the API and UI and no accuracy\n"
        "   metrics are claimed for them."
    )
    print("=" * 74)
    print()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the freshness platform database.")
    parser.add_argument("--reset", action="store_true", help="drop all tables first")
    parser.add_argument(
        "--no-analysis", action="store_true", help="skip running the ML pipeline"
    )
    parser.add_argument(
        "--no-samples", action="store_true", help="skip writing data/sample images"
    )
    args = parser.parse_args()
    run(
        reset=args.reset,
        run_ml=not args.no_analysis,
        write_samples=not args.no_samples,
    )


if __name__ == "__main__":
    main()
