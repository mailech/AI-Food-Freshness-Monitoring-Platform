from typing import Dict, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.food_item import FoodItem
from app.models.user import User, UserRole
from app.schemas.reports import ReportDataResponse, ReportItem, ReportSummaryResponse
from app.services.shelflife_service import calculate_shelf_life_days

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/summary", response_model=ReportSummaryResponse)
def get_reports_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves summary analytics metrics.
    For consumer role: scoped to their own scanned items.
    For staff roles (warehouse_operator, retail_manager, food_quality_inspector, admin): store-wide metrics.
    """
    query = db.query(FoodItem)
    if current_user.role == UserRole.CONSUMER:
        query = query.filter(FoodItem.user_id == current_user.id)
    else:
        query = query.filter(FoodItem.is_personal == False)

    items = query.all()
    total_count = len(items)

    if total_count == 0:
        avg_score = 0.0
        alerts_count = 0
    else:
        scores = [item.freshness_score for item in items if item.freshness_score is not None]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 90.0
        alerts_count = sum(1 for item in items if (item.freshness_score or 0) < 75.0)

    cat_counts: Dict[str, int] = {}
    for item in items:
        cat = item.category or "Produce"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    return ReportSummaryResponse(
        waste_reduced_percentage=28.0,
        items_tracked_total=total_count,
        avg_freshness_score=avg_score,
        alerts_triggered_count=alerts_count,
        category_breakdown=cat_counts
    )


@router.get("/data", response_model=ReportDataResponse)
def get_reports_data(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves detailed inventory report records for analytics table and exports (jsPDF / CSV).
    For consumer role: scoped to their own scanned items.
    For staff roles (warehouse_operator, retail_manager, food_quality_inspector, admin): store-wide records.
    """
    query = db.query(FoodItem)
    if current_user.role == UserRole.CONSUMER:
        query = query.filter(FoodItem.user_id == current_user.id)
    else:
        query = query.filter(FoodItem.is_personal == False)

    total = query.count()
    offset = (page - 1) * limit
    items = query.order_by(FoodItem.id.desc()).offset(offset).limit(limit).all()

    report_items: List[ReportItem] = []
    for item in items:
        rem_days = calculate_shelf_life_days(
            category=item.category,
            temp=item.storage_temperature,
            humidity=item.humidity
        )
        saved_usd = round(item.quantity * 1.5, 2) if (item.freshness_score or 0) >= 70.0 else 0.0

        report_items.append(
            ReportItem(
                id=item.id,
                name=item.name,
                category=item.category or "Produce",
                batch_id=item.batch_id,
                freshness_score=item.freshness_score or 90.0,
                freshness_status=item.freshness_status or "Fresh",
                estimated_expiry_days=rem_days,
                estimated_waste_saved_usd=saved_usd
            )
        )

    return ReportDataResponse(
        items=report_items,
        total=total
    )
