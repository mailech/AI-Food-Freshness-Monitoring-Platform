"""Report generation service."""

from __future__ import annotations

import re
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.enums import AuditAction, ReportFormat, ReportStatus, ReportType
from app.core.errors import AppError, NotFoundError
from app.core.logging_config import get_logger
from app.models import Report, User
from app.reports import builders
from app.reports.pdf_writer import render_pdf
from app.reports.xlsx_writer import render_xlsx
from app.services.audit import record_audit

logger = get_logger("app.reports")

MEDIA_TYPES = {
    ReportFormat.PDF.value: "application/pdf",
    ReportFormat.XLSX.value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def _report_dir() -> Path:
    path = Path(settings.REPORT_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _filename(report_type: ReportType, report_format: ReportFormat) -> str:
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    stem = _SAFE.sub("-", f"{report_type.value.lower()}-report-{stamp}")
    return f"{stem}.{report_format.value.lower()}"


def generate(
    db: Session,
    *,
    report_type: ReportType,
    report_format: ReportFormat,
    user: User,
    filters: dict[str, Any] | None = None,
    request_meta: dict | None = None,
) -> Report:
    """Build, render and persist a report; returns the DB row."""
    started = time.perf_counter()
    filters = filters or {}

    row = Report(
        report_type=report_type.value,
        report_format=report_format.value,
        title=filters.get("title") or f"{report_type.value.replace('_', ' ').title()} Report",
        status=ReportStatus.PENDING.value,
        created_by_id=user.id,
        filters=builders._clean_filters(filters),
    )
    db.add(row)
    db.flush()

    try:
        data = builders.build(
            db, report_type, user_name=user.full_name or user.email, filters=filters
        )
        payload = (
            render_pdf(data) if report_format == ReportFormat.PDF else render_xlsx(data)
        )

        filename = _filename(report_type, report_format)
        destination = _report_dir() / filename
        destination.write_bytes(payload)

        row.title = data.title
        row.status = ReportStatus.COMPLETED.value
        row.summary = {
            key: value for key, value in data.summary.items() if value is not None
        }
        row.row_count = data.row_count
        row.storage_key = filename
        row.filename = filename
        row.size_bytes = len(payload)
        row.generation_ms = int((time.perf_counter() - started) * 1000)
        db.flush()

        record_audit(
            db,
            action=AuditAction.REPORT_GENERATE,
            user=user,
            entity_type="report",
            entity_id=str(row.id),
            description=f"Generated {report_type.value} report as {report_format.value}",
            metadata={
                "rows": row.row_count,
                "size_bytes": row.size_bytes,
                "generation_ms": row.generation_ms,
                "filters": row.filters,
            },
            request_meta=request_meta,
        )
        logger.info(
            "report generated id=%s type=%s format=%s rows=%s bytes=%s in %sms",
            row.id, report_type.value, report_format.value, row.row_count,
            row.size_bytes, row.generation_ms,
        )
    except Exception as exc:  # noqa: BLE001 - record the failure, then surface it
        row.status = ReportStatus.FAILED.value
        row.error_message = f"{type(exc).__name__}: {exc}"[:500]
        row.generation_ms = int((time.perf_counter() - started) * 1000)
        db.flush()
        logger.exception("report generation failed for %s", report_type.value)
        raise AppError(
            "The report could not be generated.",
            code="REPORT_GENERATION_FAILED",
            status_code=500,
            details={"report_id": row.id, "reason": row.error_message},
        ) from exc

    return row


def read_bytes(report: Report) -> bytes:
    if not report.storage_key:
        raise NotFoundError("This report has no stored file.", code="REPORT_FILE_MISSING")
    path = _report_dir() / report.storage_key
    if not path.is_file():
        raise NotFoundError(
            "The report file is no longer available on disk. Please regenerate it.",
            code="REPORT_FILE_MISSING",
        )
    return path.read_bytes()


def media_type(report: Report) -> str:
    return MEDIA_TYPES.get(report.report_format, "application/octet-stream")


def list_reports(
    db: Session,
    *,
    user: User | None = None,
    report_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
    own_only: bool = False,
) -> tuple[list[Report], int]:
    stmt = select(Report)
    count_stmt = select(func.count(Report.id))
    if own_only and user is not None:
        stmt = stmt.where(Report.created_by_id == user.id)
        count_stmt = count_stmt.where(Report.created_by_id == user.id)
    if report_type:
        stmt = stmt.where(Report.report_type == report_type.upper())
        count_stmt = count_stmt.where(Report.report_type == report_type.upper())

    total = int(db.scalar(count_stmt) or 0)
    rows = list(
        db.scalars(
            stmt.order_by(desc(Report.created_at), desc(Report.id))
            .limit(page_size)
            .offset(max(0, (page - 1) * page_size))
        ).all()
    )
    return rows, total


def serialise(report: Report) -> dict[str, Any]:
    payload = {c.name: getattr(report, c.name) for c in report.__table__.columns}
    payload["download_url"] = (
        f"{settings.API_V1_PREFIX}/reports/{report.id}/download"
        if report.status == ReportStatus.COMPLETED.value
        else None
    )
    return payload


def delete(db: Session, report: Report) -> None:
    if report.storage_key:
        path = _report_dir() / report.storage_key
        if path.is_file():
            path.unlink()
    db.delete(report)
    db.flush()
