from datetime import datetime, timezone
from typing import Dict, List
from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.food_item import FoodItem
from app.models.user import User, UserRole
from app.schemas.dashboard import AlertItem, DashboardSummaryResponse, StorageConditions
from app.services.shelflife_service import calculate_shelf_life_days

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves summary metrics for the dashboard.
    For consumer role: scoped to their own scanned items (personal stats, personal alerts, personal recent items).
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
        avg_temp = 4.0
        avg_hum = 85.0
    else:
        scores = [item.freshness_score for item in items if item.freshness_score is not None]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 90.0

        temps = [item.storage_temperature for item in items if item.storage_temperature is not None]
        avg_temp = round(sum(temps) / len(temps), 1) if temps else 4.0

        hums = [item.humidity for item in items if item.humidity is not None]
        avg_hum = round(sum(hums) / len(hums), 1) if hums else 85.0

    # Category Breakdown
    cat_counts: Dict[str, int] = {}
    for item in items:
        cat = item.category or "Produce"
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    # Alerts: items with freshness_status indicating risk, or score < 70
    alerts: List[AlertItem] = []
    for item in items:
        status_lower = (item.freshness_status or "").lower()
        risk_lower = (item.spoilage_risk or "").lower()
        is_alert = "spoil" in status_lower or "alert" in status_lower or risk_lower in ["high", "medium"] or (item.freshness_score and item.freshness_score < 75)
        
        if is_alert:
            # Calculate Q10 shelf life remaining
            rem_days = calculate_shelf_life_days(
                category=item.category,
                temp=item.storage_temperature,
                humidity=item.humidity
            )
            alerts.append(
                AlertItem(
                    id=item.id,
                    name=item.name,
                    batch_id=item.batch_id,
                    freshness_status=item.freshness_status,
                    spoilage_risk=item.spoilage_risk,
                    estimated_expiry_days=rem_days,
                    message=f"Accelerated degradation detected. Est. {rem_days} days remaining."
                )
            )

    active_alerts_count = len(alerts)

    # Compliance calculation (percentage of items stored at 2°C - 8°C and 70% - 95% humidity)
    compliant_items = 0
    for item in items:
        t = item.storage_temperature if item.storage_temperature is not None else 4.0
        h = item.humidity if item.humidity is not None else 85.0
        if 2.0 <= t <= 8.0 and 70.0 <= h <= 95.0:
            compliant_items += 1

    compliance_pct = round((compliant_items / total_count * 100.0), 1) if total_count > 0 else 100.0
    comp_status = "Within Range" if compliance_pct >= 85.0 else ("Warning" if compliance_pct >= 60.0 else "Critical")

    # Estimated waste saved (approx .85 saved per tracked item in optimal status)
    waste_saved = round(sum(item.quantity * 1.75 for item in items if (item.freshness_score or 0) >= 70.0), 2)

    # Recent items summary list with dynamic elapsed time computation
    recent_items_list = []
    now = datetime.now(timezone.utc)
    for item in sorted(items, key=lambda x: x.id, reverse=True)[:5]:
        base_days = item.estimated_expiry_days if item.estimated_expiry_days is not None else calculate_shelf_life_days(item.category, item.storage_temperature, item.humidity)
        rem_days = base_days
        status_disp = item.freshness_status
        score_disp = item.freshness_score or 90.0
        if item.created_at:
            created = item.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            elapsed_days = max(0, (now - created).days)
            rem_days = max(0, base_days - elapsed_days)
            if elapsed_days > 0 and item.freshness_score is not None:
                total_days = max(1, base_days)
                ratio = rem_days / total_days
                score_disp = round(max(10.0, item.freshness_score * ratio), 1)
                if rem_days == 0:
                    status_disp = "Spoiled"
                elif rem_days <= 2:
                    status_disp = "Near Spoilage"
                elif rem_days <= 4:
                    status_disp = "Acceptable"
        recent_items_list.append({
            "id": item.id,
            "name": item.name,
            "batch_id": item.batch_id,
            "category": item.category,
            "freshness_status": status_disp,
            "freshness_score": score_disp,
            "quantity": item.quantity,
            "unit": item.unit,
            "image_url": item.image_url,
            "estimated_expiry_days": rem_days
        })

    return DashboardSummaryResponse(
        total_inventory_count=total_count,
        avg_freshness_score=avg_score,
        active_alerts_count=active_alerts_count,
        estimated_waste_saved_usd=waste_saved,
        inventory_by_category=cat_counts,
        storage_conditions=StorageConditions(
            avg_temperature=avg_temp,
            avg_humidity=avg_hum,
            compliance_status=comp_status,
            compliance_percentage=compliance_pct
        ),
        priority_alerts=alerts,
        recent_items=recent_items_list
    )
