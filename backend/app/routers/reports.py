from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.ml.reports import build_pdf, build_xlsx
from app.models import User
from app.models.inventory import FoodItem
from app.routers.auth import get_current_user
from app.services.scoring import gather_item_state

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_KINDS = {"freshness", "shelf-life", "inventory-quality", "waste-reduction", "storage-compliance"}


@router.get("/{kind}")
def export_report(
    kind: str,
    format: str = Query("pdf", pattern="^(pdf|xlsx)$"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if kind not in REPORT_KINDS:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Unknown report '{kind}'. Valid: {', '.join(sorted(REPORT_KINDS))}",
        )
    items = db.query(FoodItem).filter(FoodItem.owner_id == user.id).all()
    states = [gather_item_state(db, item) for item in items]

    if format == "xlsx":
        content = build_xlsx(kind, user.full_name, states)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"{kind}_report.xlsx"
    else:
        content = build_pdf(kind, user.full_name, states)
        media_type = "application/pdf"
        filename = f"{kind}_report.pdf"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
