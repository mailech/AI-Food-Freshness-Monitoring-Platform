from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import Base, SessionLocal, engine
from app.models.food_item import FoodItem
from app.routers.auth import router as auth_router
from app.routers.inventory import router as inventory_router


def seed_initial_inventory():
    """Seeds sample inventory items if the database table is empty."""
    db = SessionLocal()
    try:
        if db.query(FoodItem).count() == 0:
            sample_items = [
                FoodItem(
                    name="Hass Avocados",
                    category="Produce",
                    batch_id="AV-9920",
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
                    consumption_suggestion="Safe for premium retail distribution."
                ),
                FoodItem(
                    name="Roma Tomatoes",
                    category="Produce",
                    batch_id="TM-1044",
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
                    consumption_suggestion="Ideal for immediate processing or retail sales."
                ),
                FoodItem(
                    name="Organic Spinach",
                    category="Leafy Greens",
                    batch_id="SP-8831",
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
                    consumption_suggestion="Prioritize distribution within 48 hours."
                ),
                FoodItem(
                    name="Yellow Peaches",
                    category="Produce",
                    batch_id="PC-2210",
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
                    consumption_suggestion="Discount or process immediately for juice/jam."
                )
            ]
            db.add_all(sample_items)
            db.commit()
    except Exception as e:
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed default data if needed
    Base.metadata.create_all(bind=engine)
    seed_initial_inventory()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Fresh.OS — AI Food Freshness Monitoring Platform API",
    lifespan=lifespan
)

# CORS configuration
origins = settings.ALLOWED_ORIGINS
if isinstance(origins, str):
    origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(inventory_router)


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