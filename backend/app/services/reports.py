"""Read-only source collection and persistence for immutable report snapshots."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any

from sqlalchemy import Date, cast, select
from sqlalchemy.orm import Session

from app.models.enums import ReportType
from app.models.food_batch import FoodBatch
from app.models.freshness_analysis import FreshnessAnalysis
from app.models.recommendation import Recommendation
from app.models.report import Report
from app.models.shelf_life_prediction import ShelfLifePrediction
from app.models.storage_condition import StorageCondition
from app.schemas.reports import ReportCreate


def _json_value(value: Any) -> Any:
    """Convert only SQLAlchemy scalar values to JSON-compatible snapshot values."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {key: _json_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_value(item) for item in value]
    return value


def _date_filter(statement, column, date_from: date | None, date_to: date | None):
    if date_from is not None:
        statement = statement.where(cast(column, Date) >= date_from)
    if date_to is not None:
        statement = statement.where(cast(column, Date) <= date_to)
    return statement


def _batch_data(batch: FoodBatch) -> dict[str, Any]:
    """Return stored inventory attributes without inferring quality information."""
    return _json_value({
        "id": batch.id,
        "batch_number": batch.batch_number,
        "quantity": batch.quantity,
        "unit": batch.unit,
        "storage_location": batch.storage_location,
        "purchase_date": batch.purchase_date,
        "expiry_date": batch.expiry_date,
        "food_item": {
            "id": batch.food_item.id,
            "name": batch.food_item.name,
            "category": batch.food_item.category,
        },
    })


def _freshness_records(db: Session, payload: ReportCreate) -> list[dict[str, Any]]:
    statement = _date_filter(select(FreshnessAnalysis).order_by(FreshnessAnalysis.analyzed_at.desc()),
                             FreshnessAnalysis.analyzed_at, payload.date_from, payload.date_to)
    return [_json_value({
        "id": item.id, "food_batch": _batch_data(item.food_batch),
        "freshness_score": item.freshness_score,
        "freshness_category": item.freshness_category,
        "spoilage_probability": item.spoilage_probability,
        "analysis_result": item.analysis_result,
        "analyzed_at": item.analyzed_at,
    }) for item in db.scalars(statement)]


def _shelf_life_records(db: Session, payload: ReportCreate) -> list[dict[str, Any]]:
    statement = _date_filter(select(ShelfLifePrediction).order_by(ShelfLifePrediction.predicted_at.desc()),
                             ShelfLifePrediction.predicted_at, payload.date_from, payload.date_to)
    return [_json_value({
        "id": item.id, "food_batch": _batch_data(item.food_batch),
        "remaining_days": item.remaining_days,
        "predicted_expiry_date": item.predicted_expiry_date,
        "confidence_score": item.confidence_score,
        "temperature": item.temperature, "humidity": item.humidity,
        "packaging": item.packaging, "storage_duration": item.storage_duration,
        "prediction_result": item.prediction_result, "predicted_at": item.predicted_at,
    }) for item in db.scalars(statement)]


def _inventory_records(db: Session, payload: ReportCreate) -> list[dict[str, Any]]:
    statement = _date_filter(select(FoodBatch).order_by(FoodBatch.created_at.desc()), FoodBatch.created_at,
                             payload.date_from, payload.date_to)
    return [_batch_data(batch) for batch in db.scalars(statement)]


def _waste_reduction_records(db: Session, payload: ReportCreate) -> list[dict[str, Any]]:
    statement = _date_filter(select(Recommendation).order_by(Recommendation.created_at.desc()),
                             Recommendation.created_at, payload.date_from, payload.date_to)
    return [_json_value({
        "id": item.id, "food_batch": _batch_data(item.food_batch),
        "recommendation_type": item.recommendation_type, "priority": item.priority,
        "message": item.message, "status": item.status, "completed_at": item.completed_at,
        "created_at": item.created_at,
    }) for item in db.scalars(statement)]


def _storage_records(db: Session, payload: ReportCreate) -> list[dict[str, Any]]:
    statement = _date_filter(select(StorageCondition).order_by(StorageCondition.recorded_at.desc()),
                             StorageCondition.recorded_at, payload.date_from, payload.date_to)
    return [_json_value({
        "id": item.id, "food_batch": _batch_data(item.food_batch),
        "temperature": item.temperature, "humidity": item.humidity,
        "air_circulation": item.air_circulation, "light_level": item.light_level,
        "recorded_at": item.recorded_at,
    }) for item in db.scalars(statement)]


def _build_report_data(db: Session, payload: ReportCreate) -> dict[str, Any]:
    collectors = {
        ReportType.FRESHNESS_REPORT: _freshness_records,
        ReportType.SHELF_LIFE_REPORT: _shelf_life_records,
        ReportType.INVENTORY_QUALITY_REPORT: _inventory_records,
        ReportType.WASTE_REDUCTION_REPORT: _waste_reduction_records,
        ReportType.STORAGE_COMPLIANCE_REPORT: _storage_records,
    }
    records = collectors[payload.report_type](db, payload)
    return {
        "summary": {"report_type": payload.report_type.value, "record_count": len(records)},
        "records": records,
        "filters": {
            "date_from": payload.date_from.isoformat() if payload.date_from else None,
            "date_to": payload.date_to.isoformat() if payload.date_to else None,
        },
    }


def generate_report(db: Session, *, user_id: int, payload: ReportCreate) -> Report:
    """Persist an immutable JSONB snapshot built from current stored source records."""
    report_data = _build_report_data(db, payload)
    report = Report(
        user_id=user_id,
        report_type=payload.report_type,
        date_from=payload.date_from,
        date_to=payload.date_to,
        record_count=len(report_data["records"]),
        report_data=report_data,
        status="generated",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_report(db: Session, report_id: int) -> Report | None:
    return db.get(Report, report_id)


def list_reports(db: Session, *, user_id: int, report_type: ReportType | None = None,
                 date_from: date | None = None, date_to: date | None = None,
                 status: str | None = None) -> list[Report]:
    """Return a user's stored report snapshots, newest first."""
    statement = select(Report).where(Report.user_id == user_id)
    if report_type is not None:
        statement = statement.where(Report.report_type == report_type)
    if date_from is not None:
        statement = statement.where(Report.date_from >= date_from)
    if date_to is not None:
        statement = statement.where(Report.date_to <= date_to)
    if status is not None:
        statement = statement.where(Report.status == status)
    return list(db.scalars(statement.order_by(Report.generated_at.desc(), Report.id.desc())))


def delete_report(db: Session, report: Report) -> None:
    """Delete only the report snapshot, never any source record."""
    db.delete(report)
    db.commit()
