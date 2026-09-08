"""Authenticated report snapshot endpoints."""

from typing import Annotated
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status as http_status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.enums import ReportType, UserRole
from app.models.report import Report
from app.models.user import User
from app.schemas.reports import ReportCreate, ReportResponse
from app.services.reports import delete_report, generate_report, get_report, list_reports
from app.services.report_exports import export_report

router = APIRouter(prefix="/reports", tags=["reports"])
AuthenticatedUser = Annotated[User, Depends(get_current_user)]
DatabaseSession = Annotated[Session, Depends(get_db)]


def _report_or_404(db: Session, report_id: int, current_user: User) -> Report:
    """Return an owned report, with administrator-wide access."""
    report = get_report(db, report_id)
    if report is None or (
        report.user_id != current_user.id and current_user.role != UserRole.ADMINISTRATOR
    ):
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Report not found.")
    return report


@router.get("/health")
def reports_health() -> dict[str, str]:
    return {"module": "reports", "status": "ready"}


@router.post("/", response_model=ReportResponse, status_code=http_status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, db: DatabaseSession, current_user: AuthenticatedUser) -> Report:
    """Generate and persist an immutable snapshot from existing project records."""
    return generate_report(db, user_id=current_user.id, payload=payload)


@router.get("/", response_model=list[ReportResponse])
def read_reports(
    db: DatabaseSession,
    current_user: AuthenticatedUser,
    report_type: ReportType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status: str | None = None,
) -> list[Report]:
    """Return the authenticated user's report history, newest first."""
    return list_reports(
        db,
        user_id=current_user.id,
        report_type=report_type,
        date_from=date_from,
        date_to=date_to,
        status=status,
    )


@router.get("/history", response_model=list[ReportResponse])
def read_report_history(db: DatabaseSession, current_user: AuthenticatedUser) -> list[Report]:
    """Return the authenticated user's complete report history, newest first."""
    return list_reports(db, user_id=current_user.id)


def _export_response(report: Report, db: Session, export_format: str) -> FileResponse:
    try:
        path = export_report(db, report, export_format)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate the report export.",
        ) from exc
    media_type = "application/pdf" if export_format == "pdf" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return FileResponse(path, media_type=media_type, filename=path.name)


@router.get("/{report_id}/export/pdf")
def export_report_pdf(report_id: int, db: DatabaseSession, current_user: AuthenticatedUser) -> FileResponse:
    """Download a PDF rendered solely from an existing report snapshot."""
    return _export_response(_report_or_404(db, report_id, current_user), db, "pdf")


@router.get("/{report_id}/export/excel")
def export_report_excel(report_id: int, db: DatabaseSession, current_user: AuthenticatedUser) -> FileResponse:
    """Download an Excel workbook rendered solely from an existing report snapshot."""
    return _export_response(_report_or_404(db, report_id, current_user), db, "excel")


@router.get("/{report_id}", response_model=ReportResponse)
def read_report(report_id: int, db: DatabaseSession, current_user: AuthenticatedUser) -> Report:
    return _report_or_404(db, report_id, current_user)


@router.delete("/{report_id}", status_code=http_status.HTTP_200_OK)
def remove_report(report_id: int, db: DatabaseSession, current_user: AuthenticatedUser) -> Response:
    """Delete only the owned report snapshot; source records are never changed."""
    delete_report(db, _report_or_404(db, report_id, current_user))
    return Response(status_code=http_status.HTTP_200_OK)
