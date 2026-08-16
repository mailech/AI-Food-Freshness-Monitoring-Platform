from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import AnalysisRecord, FoodItem, User
from auth.dependencies import get_current_user
from reports.generator import generate_pdf_report, generate_excel_report

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/freshness")
def freshness_report(limit: int = 100, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(AnalysisRecord)
    if user.role == "Consumer":
        query = query.filter(AnalysisRecord.user_id == user.id)
    records = query.order_by(AnalysisRecord.created_at.desc()).limit(limit).all()
    return [{"id": r.id, "food_name": r.food_name, "category": r.food_category, "freshness_score": r.freshness_score, "quality_class": r.quality_class, "risk_level": r.risk_level, "shelf_life": r.shelf_life_text, "date": str(r.created_at)} for r in records]

@router.get("/inventory")
def inventory_report(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(FoodItem)
    if user.role == "Consumer":
        query = query.filter(FoodItem.added_by == user.id)
    items = query.all()
    return [{"id": i.id, "name": i.name, "category": i.category, "quantity": i.quantity, "unit": i.unit, "date": str(i.created_at)} for i in items]

@router.get("/export/pdf")
def export_pdf(report_type: str = "freshness", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if report_type == "freshness":
        query = db.query(AnalysisRecord)
        if user.role == "Consumer":
            query = query.filter(AnalysisRecord.user_id == user.id)
        records = query.order_by(AnalysisRecord.created_at.desc()).limit(200).all()
        buffer = generate_pdf_report("Freshness Analysis Report", records, "freshness")
    else:
        query = db.query(FoodItem)
        if user.role == "Consumer":
            query = query.filter(FoodItem.added_by == user.id)
        records = query.all()
        buffer = generate_pdf_report("Inventory Report", records, "inventory")

    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={report_type}_report.pdf"})

@router.get("/export/excel")
def export_excel(report_type: str = "freshness", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if report_type == "freshness":
        query = db.query(AnalysisRecord)
        if user.role == "Consumer":
            query = query.filter(AnalysisRecord.user_id == user.id)
        records = query.order_by(AnalysisRecord.created_at.desc()).limit(200).all()
        buffer = generate_excel_report("Freshness Report", records, "freshness")
    else:
        query = db.query(FoodItem)
        if user.role == "Consumer":
            query = query.filter(FoodItem.added_by == user.id)
        records = query.all()
        buffer = generate_excel_report("Inventory Report", records, "inventory")

    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={report_type}_report.xlsx"})
