import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from app.core.config import settings
from app.database import Base, SessionLocal, engine
from app.models.food_item import FoodItem
from app.routers.auth import router as auth_router
from app.routers.inventory import router as inventory_router
from app.routers.dashboard import router as dashboard_router
from app.routers.reports import router as reports_router
from app.routers.notifications import router as notifications_router
from app.routers.scan import router as scan_router



def seed_initial_inventory():
    """Seeds sample demo items only when SEED_SAMPLE_DATA is True and items are not already seeded."""
    if not settings.SEED_SAMPLE_DATA:
        print("[Fresh.OS Startup] Sample data seeding skipped (SEED_SAMPLE_DATA is False).")
        return

    db = SessionLocal()
    try:
        existing_demo = db.query(FoodItem).filter(FoodItem.is_sample_data == True).count()
        if existing_demo == 0:
            sample_items = [
                FoodItem(
                    name="Hass Avocados",
                    category="Produce",
                    batch_id="DEMO-001",
                    quantity=2400.0,
                    unit="kg",
                    freshness_score=98.0,
                    freshness_status="Fresh",
                    spoilage_risk="Low",
                    storage_temperature=4.0,
                    humidity=85.0,
                    estimated_expiry_days=14,
                    origin_location="Green Valley Farms",
                    image_url="https://lh3.googleusercontent.com/aida-public/AB6AXuAIzJTYP14kGeI_aBOzz0uAsNVXGKmZwuSdxvtNsoRDMcvgV2a9MiMvoRqfUrv8DstqUUzBRCmht628-r6CmT2_EvPC4jS6e1CJCNLFRSKbvmZ9ew1_Z_-Lx9oUXrx_BpLLVuzZi4-97owRfgeZIY2ZYgHje4G1KLe2xosiQc9IQ2heB8pfCqW4NlvWAv8L2Vhbesl0uShm7k8sQ0SbKlUiBaHKoBPgbj2wpWtf2DcTpgV3KOdM0rND",
                    storage_tip="Maintain current temperature (4°C). Do not mist directly.",
                    consumption_suggestion="Safe for premium retail distribution.",
                    is_sample_data=True
                ),
                FoodItem(
                    name="Roma Tomatoes",
                    category="Produce",
                    batch_id="DEMO-002",
                    quantity=850.0,
                    unit="kg",
                    freshness_score=85.0,
                    freshness_status="Good",
                    spoilage_risk="Low",
                    storage_temperature=6.0,
                    humidity=80.0,
                    estimated_expiry_days=7,
                    origin_location="Sun Valley Produce",
                    image_url="https://lh3.googleusercontent.com/aida-public/AB6AXuCJG7_CvTqbAfm_UGf5qUFCfPiw2UCmmXMYktoaIru45kSs1RX9MMLvFjgVmKT2ZTgQViLVrcAhYXcOUp72Puh0Ov_JLw1CMPgepmr_sAleXLZghdI3z32Cpyb-0a3-FbmG9qtk_qrqnyEHIDQIX0XphztgIZs1PLh5DOAQngTFI66IFKH-NSHogDjXeIfETFMsLBSMsr4Kd5MGH8mecDif5xDzE1M4Y90VQkQkG5Hv9yXqmlrq-3XN",
                    storage_tip="Store in cool, well-ventilated area.",
                    consumption_suggestion="Ideal for immediate processing or retail sales.",
                    is_sample_data=True
                ),
                FoodItem(
                    name="Organic Spinach",
                    category="Leafy Greens",
                    batch_id="DEMO-003",
                    quantity=120.0,
                    unit="kg",
                    freshness_score=75.0,
                    freshness_status="Acceptable",
                    spoilage_risk="Medium",
                    storage_temperature=2.0,
                    humidity=90.0,
                    estimated_expiry_days=4,
                    origin_location="Organic Harvest Co.",
                    image_url="https://lh3.googleusercontent.com/aida-public/AB6AXuAJZSZblXrhaVu1HrP8gBwmZa6aoh-EShbgyBbAYkZopsWka36mXrY_49dGp4GwkCuUtqKiEZ5o4RkSQvVgfoKRDK6lwsWb-Pr7BIpJXtwkS_zxZPXO8Uqj4bhKEIs7QxWUSasgoN0wpboszV_SOODOiJ4P7-qvJwma-OKjIa1-q7U1hFds6Ggma97dbEHsfkj4EP1Ey10Yu9zl0YMHoSIzaF8FoE5CJ0THaXT8jKYhYFkMStmuMuqg",
                    storage_tip="Keep refrigerated at 2°C with high ambient humidity.",
                    consumption_suggestion="Prioritize distribution within 48 hours.",
                    is_sample_data=True
                ),
                FoodItem(
                    name="Yellow Peaches",
                    category="Produce",
                    batch_id="DEMO-004",
                    quantity=45.0,
                    unit="kg",
                    freshness_score=45.0,
                    freshness_status="Near Spoilage",
                    spoilage_risk="High",
                    storage_temperature=5.0,
                    humidity=85.0,
                    estimated_expiry_days=1,
                    origin_location="Orchard Fresh",
                    image_url="https://lh3.googleusercontent.com/aida-public/AB6AXuAPa6I-F9CJ1jl-Ri8pKCLvkVTEfwLC7Vm_TDkQvwSuE7IVAUJ3ggv0Gc0mXCePiRQSw8QwShqRkj5qvym0Qs9HVjuJAko--6u_7LKg1Fx7fE_bHEeWRZ-4xRvB6ZBzP-FrVu9SvC3Rk3BjVMPKV07kVYj8DCvg_2Y3MnsZrMW5p9ecGtW4Z5cgUfTGjoFVmSisWDLt5gKb11tfbF_DhdKKbccIU7nPiUd3thm6CNquNVivDzO_iJeE",
                    storage_tip="Immediate refrigeration required. Accelerated ripening detected.",
                    consumption_suggestion="Discount or process immediately for juice/jam.",
                    is_sample_data=True
                )
            ]
            db.add_all(sample_items)
            db.commit()
            print("[Fresh.OS Startup] Successfully seeded 4 demo inventory items (batch_ids DEMO-001..DEMO-004, is_sample_data=True).")
        else:
            print(f"[Fresh.OS Startup] Demo sample data already present ({existing_demo} items). Skipping seeding.")
    except Exception as e:
        db.rollback()
        print(f"[Fresh.OS Startup] Error during inventory seeding: {e}")
    finally:
        db.close()


def seed_initial_user():
    """Seeds a sample demo user if SEED_SAMPLE_DATA is True and no users exist."""
    if not settings.SEED_SAMPLE_DATA:
        return
    db = SessionLocal()
    try:
        from app.models.user import User, UserRole
        from app.auth.security import hash_password
        if db.query(User).filter_by(email="demo@freshos.com").count() == 0:
            demo_user = User(
                email="demo@freshos.com",
                hashed_password=hash_password("Password123!"),
                full_name="Alex Demo",
                role=UserRole.RETAIL_MANAGER,
                is_active=True
            )
            db.add(demo_user)
            db.commit()
            print("[Fresh.OS Startup] Successfully seeded demo staff user: demo@freshos.com / Password123!")

        consumer_user = db.query(User).filter_by(email="consumer@freshos.com").first()
        if not consumer_user:
            consumer_user = User(
                email="consumer@freshos.com",
                hashed_password=hash_password("Password123!"),
                full_name="Emma Consumer",
                role=UserRole.CONSUMER,
                is_active=True
            )
            db.add(consumer_user)
            db.commit()
            db.refresh(consumer_user)
            print("[Fresh.OS Startup] Successfully seeded demo consumer user: consumer@freshos.com / Password123!")

        # Ensure consumer has a sample near spoilage personal item
        existing_personal = db.query(FoodItem).filter_by(user_id=consumer_user.id, is_personal=True).count()
        if existing_personal == 0:
            personal_item = FoodItem(
                name="Organic Strawberries",
                category="Berries",
                batch_id="PERS-STR-01",
                quantity=1.0,
                unit="box",
                freshness_score=48.0,
                freshness_status="Near Spoilage",
                spoilage_risk="High",
                storage_temperature=8.0,
                humidity=85.0,
                estimated_expiry_days=2,
                origin_location="Local Farm",
                is_personal=True,
                user_id=consumer_user.id
            )
            db.add(personal_item)
            db.commit()
            print("[Fresh.OS Startup] Seeded personal near spoilage storage item for consumer.")
    except Exception as e:
        db.rollback()
        print(f"[Fresh.OS Startup] Error during user seeding: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Log masked PostgreSQL connection info and verify connection
    parsed_url = make_url(settings.DATABASE_URL)
    masked_url = parsed_url.render_as_string(hide_password=True)
    print(f"[Fresh.OS Startup] Database connection string: {masked_url}")
    print(f"[Fresh.OS Startup] Backend: {parsed_url.get_backend_name()} | Database: {parsed_url.database} | Host: {parsed_url.host}:{parsed_url.port} | User: {parsed_url.username}")

    with engine.connect() as conn:
        db_ver = conn.execute(text("SELECT version();")).scalar()
        print(f"[Fresh.OS Startup] Connected to PostgreSQL successfully: {db_ver.split(',')[0]}")

    # Create tables in PostgreSQL and handle safe seeding
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE food_items ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE;"))
    seed_initial_inventory()
    seed_initial_user()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Fresh.OS — AI Food Freshness Monitoring Platform API",
    lifespan=lifespan
)

# Comprehensive CORS configuration supporting file://, null origin, localhost, and 127.0.0.1
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "null", "file://", "http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def ensure_cors_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    if request.method == "OPTIONS":
        res = Response(status_code=200)
        res.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        res.headers["Access-Control-Allow-Headers"] = "*"
        res.headers["Access-Control-Allow-Credentials"] = "true"
        return res

    response = await call_next(request)
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# Mount frontend website for direct http://localhost:8000/site access
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "fresh-os-website"))
if os.path.exists(frontend_dir):
    app.mount("/site", StaticFiles(directory=frontend_dir, html=True), name="frontend")

# Include routers
app.include_router(auth_router)
app.include_router(inventory_router)
app.include_router(dashboard_router)
app.include_router(reports_router)
app.include_router(notifications_router)
app.include_router(scan_router)



@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Fresh.OS API",
        "version": settings.VERSION,
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }