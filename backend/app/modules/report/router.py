from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Optional
import io

from app.core.database import get_db
from app.modules.report.schemas import ReportFilterRequest, ReportPreviewResponse
from app.modules.report.service import ReportService

router = APIRouter()

@router.get("/preview", response_model=ReportPreviewResponse)
async def get_report_preview(
    report_type: str = Query(..., description="Type of report: freshness, shelf-life, quality, waste, storage"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    storage_location: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
) -> Any:
    filters = ReportFilterRequest(
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        category=category,
        storage_location=storage_location
    )
    try:
        report_data = await ReportService.generate_report_data(db, filters)
        return report_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report preview: {str(e)}")

@router.get("/export")
async def export_report(
    report_type: str = Query(..., description="Type of report: freshness, shelf-life, quality, waste, storage"),
    format: str = Query("pdf", description="Format: pdf, excel"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    storage_location: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
) -> Any:
    filters = ReportFilterRequest(
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        category=category,
        storage_location=storage_location
    )
    try:
        report_data = await ReportService.generate_report_data(db, filters)
        
        if format.lower() == "pdf":
            pdf_bytes = ReportService.generate_pdf(report_type, report_data)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=freshlens_{report_type}_report.pdf"
                }
            )
        elif format.lower() == "excel":
            excel_bytes = ReportService.generate_excel(report_type, report_data)
            return Response(
                content=excel_bytes,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=freshlens_{report_type}_report.xlsx"
                }
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid export format. Supported formats: pdf, excel")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export report: {str(e)}")
