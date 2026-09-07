from fastapi import APIRouter, Query
from typing import List, Optional, Dict, Any
from app.models.schemas import ReportItem
from app.db.session import SessionLocal
from app.models.orm import ReportORM
import uuid
from datetime import datetime

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("", response_model=List[ReportItem])
def get_reports(report_type: Optional[str] = Query(None)):
    db = SessionLocal()
    try:
        query = db.query(ReportORM)
        if report_type and report_type.lower() != "all":
            query = query.filter(ReportORM.report_type.ilike(f"%{report_type}%"))
        reports = query.order_by(ReportORM.created_at.desc()).all()
        return [
            ReportItem(
                id=r.id,
                title=r.title,
                report_type=r.report_type,
                created_at=r.created_at,
                generated_by=r.generated_by,
                summary=r.summary,
                status=r.status,
                data=r.data or {}
            )
            for r in reports
        ]
    finally:
        db.close()

@router.post("/generate", response_model=ReportItem)
def generate_report(payload: Dict[str, Any]):
    db = SessionLocal()
    try:
        rep_id = f"rep-{uuid.uuid4().hex[:6]}"
        now_str = datetime.utcnow().strftime("%Y-%m-%d")
        report = ReportORM(
            id=rep_id,
            title=payload.get("title", "Custom Freshness & Quality Report"),
            report_type=payload.get("report_type", "Freshness Report"),
            created_at=now_str,
            generated_by=payload.get("generated_by", "Quality Inspector"),
            summary=payload.get("summary", "Automated system quality and freshness summary."),
            status="Ready",
            data=payload.get("data", {"generated": True})
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return ReportItem(
            id=report.id,
            title=report.title,
            report_type=report.report_type,
            created_at=report.created_at,
            generated_by=report.generated_by,
            summary=report.summary,
            status=report.status,
            data=report.data or {}
        )
    finally:
        db.close()
