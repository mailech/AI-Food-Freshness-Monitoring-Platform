from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from app.services.db import db
from datetime import datetime
import uuid

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("")
def get_reports(report_type: Optional[str] = Query(None)):
    reports = list(db.reports)
    if report_type and report_type != "All":
        reports = [r for r in reports if r["report_type"].lower() == report_type.lower()]
    return reports

@router.post("/generate")
def generate_report(payload: Dict[str, Any]):
    rep_type = payload.get("report_type", "Freshness Report")
    title = payload.get("title") or f"Automated {rep_type} ({datetime.now().strftime('%b %d, %Y')})"
    generated_by = payload.get("generated_by", "Quality Inspector")
    
    new_report = {
        "id": f"rep-{uuid.uuid4().hex[:6]}",
        "title": title,
        "report_type": rep_type,
        "created_at": datetime.now().strftime("%Y-%m-%d"),
        "generated_by": generated_by,
        "summary": f"Generated on-demand {rep_type} evaluating {len(db.foods)} items across all cold and ambient storage zones.",
        "status": "Ready",
        "data": {
            "monitored_batches": len(db.foods),
            "generated_timestamp": datetime.now().isoformat(),
            "export_format": "PDF / CSV"
        }
    }
    db.reports.insert(0, new_report)
    return new_report
