"""Report generation and download endpoints."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.enums import Permission, ReportFormat, ReportType
from app.core.errors import NotFoundError, PermissionDeniedError
from app.deps import CurrentUser, DbSession, Pagination, RequestMeta, require_permissions
from app.models import Report
from app.reports import service as report_service
from app.schemas.analysis import ReportOut, ReportRequest, report_type_catalogue
from app.schemas.common import Message, Page

router = APIRouter(prefix="/reports", tags=["Reports"])


def _generate(
    db, user, meta, report_type: ReportType, payload: ReportRequest
) -> ReportOut:
    filters: dict[str, Any] = payload.model_dump(exclude={"report_format"})
    row = report_service.generate(
        db,
        report_type=report_type,
        report_format=payload.report_format,
        user=user,
        filters=filters,
        request_meta=meta,
    )
    db.commit()
    db.refresh(row)
    return ReportOut.model_validate(report_service.serialise(row))


@router.get("/types", response_model=list[dict], summary="Available report types")
def report_types(user: CurrentUser) -> list[dict]:
    return [t.model_dump() for t in report_type_catalogue()]


@router.get("", response_model=Page[ReportOut], summary="List generated reports")
def list_reports(
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.REPORT_GENERATE))],
    pagination: Pagination,
    report_type: str | None = None,
    mine: bool = Query(default=False, description="Only reports I generated"),
) -> Page[ReportOut]:
    rows, total = report_service.list_reports(
        db,
        user=user,
        report_type=report_type,
        page=pagination.page,
        page_size=pagination.page_size,
        own_only=mine,
    )
    return Page.build(
        [ReportOut.model_validate(report_service.serialise(r)) for r in rows],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


# --------------------------------------------------------------- generation
@router.post(
    "/freshness",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a Freshness Report (PDF or XLSX)",
)
def freshness_report(
    payload: ReportRequest,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.REPORT_GENERATE))],
) -> ReportOut:
    return _generate(db, user, meta, ReportType.FRESHNESS, payload)


@router.post(
    "/shelf-life",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a Shelf-Life Report",
)
def shelf_life_report(
    payload: ReportRequest,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.REPORT_GENERATE))],
) -> ReportOut:
    return _generate(db, user, meta, ReportType.SHELF_LIFE, payload)


@router.post(
    "/inventory",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate an Inventory Quality Report",
)
def inventory_report(
    payload: ReportRequest,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.REPORT_GENERATE))],
) -> ReportOut:
    return _generate(db, user, meta, ReportType.INVENTORY_QUALITY, payload)


@router.post(
    "/waste-reduction",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a Waste Reduction Report",
)
def waste_report(
    payload: ReportRequest,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.REPORT_GENERATE))],
) -> ReportOut:
    return _generate(db, user, meta, ReportType.WASTE_REDUCTION, payload)


@router.post(
    "/storage-compliance",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a Storage Compliance Report",
)
def storage_report(
    payload: ReportRequest,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[Any, Depends(require_permissions(Permission.REPORT_GENERATE))],
) -> ReportOut:
    return _generate(db, user, meta, ReportType.STORAGE_COMPLIANCE, payload)


# ----------------------------------------------------------------- download
@router.get("/{report_id}", response_model=ReportOut, summary="Get report metadata")
def get_report(
    report_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.REPORT_GENERATE))],
) -> ReportOut:
    report = db.get(Report, report_id)
    if report is None:
        raise NotFoundError("Report not found.", code="REPORT_NOT_FOUND")
    return ReportOut.model_validate(report_service.serialise(report))


@router.get(
    "/{report_id}/download",
    summary="Download a generated report",
    response_class=Response,
    responses={
        200: {
            "content": {
                "application/pdf": {},
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {},
            },
            "description": "The report file.",
        }
    },
)
def download_report(
    report_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.REPORT_GENERATE))],
) -> Response:
    report = db.get(Report, report_id)
    if report is None:
        raise NotFoundError("Report not found.", code="REPORT_NOT_FOUND")

    payload = report_service.read_bytes(report)
    return Response(
        content=payload,
        media_type=report_service.media_type(report),
        headers={
            "Content-Disposition": f'attachment; filename="{report.filename}"',
            "Content-Length": str(len(payload)),
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/{report_id}", response_model=Message, summary="Delete a report")
def delete_report(
    report_id: int,
    db: DbSession,
    user: Annotated[Any, Depends(require_permissions(Permission.REPORT_GENERATE))],
) -> Message:
    from app.core.enums import RoleName

    report = db.get(Report, report_id)
    if report is None:
        raise NotFoundError("Report not found.", code="REPORT_NOT_FOUND")
    if report.created_by_id != user.id and user.role_name != RoleName.ADMIN.value:
        raise PermissionDeniedError("You may only delete reports you generated.")

    report_service.delete(db, report)
    db.commit()
    return Message(message="Report deleted.")
