"""Report data builders.

Each builder returns a `ReportData` bundle (metadata, filters, summary metrics,
tables and optional chart series). The PDF and XLSX writers consume the same
bundle so both formats always contain identical figures.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.analytics import service as analytics
from app.core.enums import InventoryStatus, ReportType
from app.models import (
    Alert,
    FoodBatch,
    FoodCategory,
    FoodProduct,
    FreshnessAssessment,
    ShelfLifePrediction,
    StorageReading,
)


@dataclass
class Table:
    title: str
    columns: list[str]
    rows: list[list[Any]]
    note: str | None = None
    # Column widths as relative weights (PDF layout hint).
    widths: list[float] | None = None


@dataclass
class ChartSeries:
    title: str
    kind: str  # "bar" | "line" | "pie"
    labels: list[str]
    values: list[float]
    y_label: str | None = None


@dataclass
class ReportData:
    report_type: ReportType
    title: str
    subtitle: str
    generated_at: datetime
    generated_by: str
    filters: dict[str, Any]
    summary: dict[str, Any]
    tables: list[Table] = field(default_factory=list)
    charts: list[ChartSeries] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    @property
    def row_count(self) -> int:
        return sum(len(t.rows) for t in self.tables)


DISCLAIMER = (
    "Freshness scores, shelf-life estimates and spoilage indicators in this report are "
    "AI estimates produced from image features and recorded storage data. They are not "
    "laboratory measurements and carry no guarantee of food safety."
)


# ------------------------------------------------------------------ helpers
def _clean_filters(filters: dict[str, Any]) -> dict[str, Any]:
    return {
        key: (value.isoformat() if isinstance(value, (date, datetime)) else value)
        for key, value in filters.items()
        if value not in (None, [], "")
    }


def _batch_query(
    db: Session,
    *,
    date_from: date | None,
    date_to: date | None,
    category_slug: str | None,
    storage_location: str | None,
    status: list[str] | None,
    freshness_category: list[str] | None,
    limit: int,
):
    stmt = (
        select(FoodBatch)
        .join(FoodProduct, FoodProduct.id == FoodBatch.product_id)
        .join(FoodCategory, FoodCategory.id == FoodProduct.category_id)
        .where(FoodBatch.is_archived.is_(False))
    )
    if date_from:
        stmt = stmt.where(func.date(FoodBatch.created_at) >= date_from)
    if date_to:
        stmt = stmt.where(func.date(FoodBatch.created_at) <= date_to)
    if category_slug:
        stmt = stmt.where(FoodCategory.slug == category_slug.upper())
    if storage_location:
        stmt = stmt.where(FoodBatch.storage_location == storage_location)
    if status:
        stmt = stmt.where(FoodBatch.status.in_([s.upper() for s in status]))
    if freshness_category:
        stmt = stmt.where(
            FoodBatch.current_freshness_category.in_([c.upper() for c in freshness_category])
        )
    return stmt.order_by(FoodBatch.created_at.desc()).limit(limit)


def _fmt(value: Any, digits: int = 1, dash: str = "-") -> str:
    if value is None:
        return dash
    if isinstance(value, (int, float)):
        return f"{float(value):.{digits}f}"
    if isinstance(value, (date, datetime)):
        return value.strftime("%Y-%m-%d")
    return str(value)


# ------------------------------------------------------------ 1. freshness
def build_freshness_report(
    db: Session, *, user_name: str, filters: dict[str, Any]
) -> ReportData:
    limit = int(filters.get("limit", 500))
    stmt = _batch_query(
        db,
        date_from=filters.get("date_from"),
        date_to=filters.get("date_to"),
        category_slug=filters.get("category_slug"),
        storage_location=filters.get("storage_location"),
        status=filters.get("status"),
        freshness_category=filters.get("freshness_category"),
        limit=limit,
    )
    batches = list(db.scalars(stmt).unique().all())

    distribution = analytics.freshness_distribution(db)
    trend = analytics.average_freshness_over_time(db, days=30)
    spoilage = analytics.spoilage_metrics(db)

    scores = [
        float(b.current_freshness_score) for b in batches if b.current_freshness_score is not None
    ]

    rows: list[list[Any]] = []
    for batch in batches:
        assessment = db.scalar(
            select(FreshnessAssessment)
            .where(FreshnessAssessment.batch_id == batch.id)
            .order_by(FreshnessAssessment.created_at.desc())
        )
        rows.append(
            [
                batch.batch_number,
                batch.product.name if batch.product else "-",
                batch.product.category.name if batch.product and batch.product.category else "-",
                _fmt(batch.current_freshness_score, 0),
                batch.current_freshness_category or "Not assessed",
                _fmt(assessment.confidence * 100, 0) + "%" if assessment else "-",
                _fmt(assessment.visual_score, 0) if assessment else "-",
                _fmt(assessment.storage_score, 0) if assessment else "-",
                _fmt(batch.last_assessed_at),
            ]
        )

    return ReportData(
        report_type=ReportType.FRESHNESS,
        title=filters.get("title") or "Freshness Report",
        subtitle="Freshness scores, component breakdown and assessment coverage",
        generated_at=datetime.now(UTC),
        generated_by=user_name,
        filters=_clean_filters(filters),
        summary={
            "Batches in report": len(batches),
            "Assessed batches": len(scores),
            "Average freshness score": round(sum(scores) / len(scores), 1) if scores else None,
            "Lowest score": round(min(scores), 1) if scores else None,
            "Highest score": round(max(scores), 1) if scores else None,
            "Spoilage rate": f"{spoilage['spoilage_rate_pct']}%",
            "Near-spoilage batches": spoilage["near_spoilage_count"],
        },
        tables=[
            Table(
                title="Batch freshness detail",
                columns=[
                    "Batch", "Product", "Category", "Score", "Category",
                    "Confidence", "Visual", "Storage", "Last assessed",
                ],
                rows=rows,
                widths=[1.3, 2.0, 1.2, 0.6, 1.2, 0.9, 0.7, 0.7, 1.1],
            ),
            Table(
                title="Freshness distribution",
                columns=["Freshness category", "Batches", "Share"],
                rows=[
                    [item["category"], item["count"], f"{item['percentage']}%"]
                    for item in distribution["items"]
                ],
            ),
        ],
        charts=[
            ChartSeries(
                title="Freshness distribution",
                kind="bar",
                labels=[i["category"] for i in distribution["items"]],
                values=[float(i["count"]) for i in distribution["items"]],
                y_label="Batches",
            ),
            ChartSeries(
                title="Average freshness score (last 30 days)",
                kind="line",
                labels=[p["date"] for p in trend["points"]],
                values=[float(p["average_score"] or 0) for p in trend["points"]],
                y_label="Score",
            ),
        ],
        notes=[DISCLAIMER],
    )


# ----------------------------------------------------------- 2. shelf life
def build_shelf_life_report(
    db: Session, *, user_name: str, filters: dict[str, Any]
) -> ReportData:
    limit = int(filters.get("limit", 500))
    stmt = _batch_query(
        db,
        date_from=filters.get("date_from"),
        date_to=filters.get("date_to"),
        category_slug=filters.get("category_slug"),
        storage_location=filters.get("storage_location"),
        status=filters.get("status"),
        freshness_category=filters.get("freshness_category"),
        limit=limit,
    )
    batches = list(db.scalars(stmt).unique().all())
    distribution = analytics.shelf_life_distribution(db)

    rows: list[list[Any]] = []
    baseline_count = 0
    trained_count = 0
    for batch in batches:
        prediction = db.scalar(
            select(ShelfLifePrediction)
            .where(ShelfLifePrediction.batch_id == batch.id)
            .order_by(ShelfLifePrediction.created_at.desc())
        )
        if prediction is not None:
            if prediction.is_demo:
                baseline_count += 1
            else:
                trained_count += 1
        rows.append(
            [
                batch.batch_number,
                batch.product.name if batch.product else "-",
                _fmt(batch.remaining_shelf_life_days, 1),
                _fmt(batch.predicted_expiry_date),
                _fmt(batch.expected_expiry_date),
                prediction.risk_level if prediction else "-",
                _fmt(prediction.confidence * 100, 0) + "%" if prediction else "-",
                ("Baseline" if prediction.is_demo else "Trained") if prediction else "-",
            ]
        )

    remaining = [
        float(b.remaining_shelf_life_days)
        for b in batches
        if b.remaining_shelf_life_days is not None
    ]

    return ReportData(
        report_type=ReportType.SHELF_LIFE,
        title=filters.get("title") or "Shelf-Life Report",
        subtitle="Remaining shelf life, predicted expiry and prediction provenance",
        generated_at=datetime.now(UTC),
        generated_by=user_name,
        filters=_clean_filters(filters),
        summary={
            "Batches in report": len(batches),
            "With a prediction": len(remaining),
            "Average remaining days": round(sum(remaining) / len(remaining), 2) if remaining else None,
            "Batches with <= 2 days": sum(1 for r in remaining if r <= 2),
            "Baseline predictions": baseline_count,
            "Trained-model predictions": trained_count,
        },
        tables=[
            Table(
                title="Shelf-life predictions",
                columns=[
                    "Batch", "Product", "Days left", "Predicted expiry",
                    "Label expiry", "Risk", "Confidence", "Model",
                ],
                rows=rows,
                widths=[1.3, 2.0, 0.8, 1.2, 1.2, 0.8, 0.9, 0.9],
            ),
            Table(
                title="Remaining shelf-life distribution",
                columns=["Bucket", "Batches"],
                rows=[[b["bucket"], b["count"]] for b in distribution["buckets"]],
            ),
        ],
        charts=[
            ChartSeries(
                title="Remaining shelf-life distribution",
                kind="bar",
                labels=[b["bucket"] for b in distribution["buckets"]],
                values=[float(b["count"]) for b in distribution["buckets"]],
                y_label="Batches",
            )
        ],
        notes=[
            DISCLAIMER,
            (
                f"{baseline_count} of {baseline_count + trained_count or 1} predictions in this "
                "report come from the transparent kinetic baseline rather than a trained "
                "model. Baseline estimates carry no validated accuracy figure."
            ),
        ],
    )


# ---------------------------------------------------- 3. inventory quality
def build_inventory_quality_report(
    db: Session, *, user_name: str, filters: dict[str, Any]
) -> ReportData:
    limit = int(filters.get("limit", 500))
    stmt = _batch_query(
        db,
        date_from=filters.get("date_from"),
        date_to=filters.get("date_to"),
        category_slug=filters.get("category_slug"),
        storage_location=filters.get("storage_location"),
        status=filters.get("status"),
        freshness_category=filters.get("freshness_category"),
        limit=limit,
    )
    batches = list(db.scalars(stmt).unique().all())
    health = analytics.inventory_health(db)
    categories = analytics.category_quality(db)
    today = date.today()

    rows = [
        [
            batch.batch_number,
            batch.product.name if batch.product else "-",
            batch.product.category.name if batch.product and batch.product.category else "-",
            _fmt(float(batch.quantity or 0), 2),
            batch.unit,
            batch.status,
            _fmt(batch.current_freshness_score, 0),
            batch.storage_location or "-",
            _fmt(batch.expected_expiry_date),
            str((batch.expected_expiry_date - today).days) if batch.expected_expiry_date else "-",
        ]
        for batch in batches
    ]

    return ReportData(
        report_type=ReportType.INVENTORY_QUALITY,
        title=filters.get("title") or "Inventory Quality Report",
        subtitle="Stock levels, status mix and quality by category",
        generated_at=datetime.now(UTC),
        generated_by=user_name,
        filters=_clean_filters(filters),
        summary={
            "Batches in report": len(batches),
            "Total batches tracked": health["total_batches"],
            "Total quantity": health["total_quantity"],
            "Average freshness score": health["average_freshness_score"],
            "Health index": f"{health['health_index']}%" if health["health_index"] else None,
            "Expiring within 3 days": health["expiring_soon_count"],
            "Expired": health["expired_count"],
        },
        tables=[
            Table(
                title="Inventory detail",
                columns=[
                    "Batch", "Product", "Category", "Qty", "Unit", "Status",
                    "Score", "Location", "Expiry", "Days left",
                ],
                rows=rows,
                widths=[1.2, 1.8, 1.1, 0.6, 0.5, 1.1, 0.6, 1.3, 1.0, 0.7],
            ),
            Table(
                title="Quality by category",
                columns=["Category", "Batches", "Avg score", "At risk", "At risk %", "Quantity"],
                rows=[
                    [
                        c["category_name"],
                        c["batch_count"],
                        _fmt(c["average_freshness_score"], 1),
                        c["at_risk_count"],
                        f"{c['at_risk_pct']}%",
                        _fmt(c["total_quantity"], 2),
                    ]
                    for c in categories
                ],
            ),
            Table(
                title="Status breakdown",
                columns=["Status", "Batches"],
                rows=[[status, count] for status, count in health["status_counts"].items()],
            ),
        ],
        charts=[
            ChartSeries(
                title="Batches by status",
                kind="bar",
                labels=list(health["status_counts"].keys()),
                values=[float(v) for v in health["status_counts"].values()],
                y_label="Batches",
            ),
            ChartSeries(
                title="Average freshness by category",
                kind="bar",
                labels=[c["category_name"] for c in categories],
                values=[float(c["average_freshness_score"] or 0) for c in categories],
                y_label="Score",
            ),
        ],
        notes=[DISCLAIMER],
    )


# ---------------------------------------------------- 4. waste reduction
def build_waste_reduction_report(
    db: Session, *, user_name: str, filters: dict[str, Any]
) -> ReportData:
    waste = analytics.waste_risk(db)
    spoilage = analytics.spoilage_metrics(db)
    today = date.today()
    limit = int(filters.get("limit", 500))

    at_risk = list(
        db.scalars(
            select(FoodBatch)
            .join(FoodProduct, FoodProduct.id == FoodBatch.product_id)
            .where(
                FoodBatch.is_archived.is_(False),
                or_(
                    FoodBatch.status.in_(
                        [
                            InventoryStatus.NEAR_SPOILAGE.value,
                            InventoryStatus.SPOILED.value,
                            InventoryStatus.EXPIRED.value,
                        ]
                    ),
                    and_(
                        FoodBatch.remaining_shelf_life_days.is_not(None),
                        FoodBatch.remaining_shelf_life_days <= 3,
                    ),
                ),
            )
            .order_by(FoodBatch.remaining_shelf_life_days.asc().nulls_last())
            .limit(limit)
        ).unique().all()
    )

    rows = [
        [
            batch.batch_number,
            batch.product.name if batch.product else "-",
            _fmt(float(batch.quantity or 0), 2),
            batch.unit,
            batch.status,
            _fmt(batch.remaining_shelf_life_days, 1),
            str((batch.expected_expiry_date - today).days) if batch.expected_expiry_date else "-",
            (
                _fmt(float(batch.quantity or 0) * float(batch.cost_per_unit), 2)
                if batch.cost_per_unit is not None
                else "-"
            ),
            batch.storage_location or "-",
        ]
        for batch in at_risk
    ]

    # Active waste-reduction recommendations give concrete actions.
    from app.models import Recommendation

    actions = list(
        db.scalars(
            select(Recommendation)
            .where(
                Recommendation.is_active.is_(True),
                Recommendation.recommendation_type.in_(
                    ["WASTE_REDUCTION", "INVENTORY_ROTATION", "CONSUMPTION"]
                ),
            )
            .order_by(Recommendation.created_at.desc())
            .limit(60)
        ).unique().all()
    )

    return ReportData(
        report_type=ReportType.WASTE_REDUCTION,
        title=filters.get("title") or "Waste Reduction Report",
        subtitle="Quantity and value at risk, with recommended interventions",
        generated_at=datetime.now(UTC),
        generated_by=user_name,
        filters=_clean_filters(filters),
        summary={
            "Batches at risk": len(at_risk),
            "Quantity at risk": waste["at_risk_quantity"],
            "Total quantity tracked": waste["total_quantity"],
            "Share of stock at risk": f"{waste['at_risk_share_pct']}%",
            "Estimated value at risk": waste["at_risk_value"],
            "Spoiled batches": spoilage["spoiled_count"],
            "Expired batches": spoilage["expired_count"],
        },
        tables=[
            Table(
                title="Batches at risk of becoming waste",
                columns=[
                    "Batch", "Product", "Qty", "Unit", "Status", "Days left",
                    "To label expiry", "Est. value", "Location",
                ],
                rows=rows,
                widths=[1.2, 1.9, 0.6, 0.5, 1.1, 0.8, 1.0, 0.9, 1.3],
            ),
            Table(
                title="Recommended interventions",
                columns=["Batch", "Type", "Priority", "Action", "Rationale"],
                rows=[
                    [
                        r.batch_id,
                        r.recommendation_type,
                        r.priority,
                        r.title,
                        (r.rationale or "")[:110],
                    ]
                    for r in actions
                ],
                note="Generated by the rule-based recommendation engine; each carries a rule id.",
            ),
        ],
        charts=[
            ChartSeries(
                title="Top batches by value at risk",
                kind="bar",
                labels=[item["batch_number"] for item in waste["top_at_risk"]],
                values=[float(item["estimated_value"] or item["quantity"]) for item in waste["top_at_risk"]],
                y_label="Value / quantity",
            )
        ],
        notes=[
            DISCLAIMER,
            waste["note"],
        ],
    )


# ------------------------------------------------- 5. storage compliance
def build_storage_compliance_report(
    db: Session, *, user_name: str, filters: dict[str, Any]
) -> ReportData:
    summary = analytics.storage_compliance_summary(db)
    trends = analytics.environment_trends(db, days=14)
    since = datetime.now(UTC) - timedelta(days=14)

    violations = list(
        db.scalars(
            select(StorageReading)
            .where(StorageReading.recorded_at >= since, StorageReading.is_violation.is_(True))
            .order_by(StorageReading.recorded_at.desc())
            .limit(int(filters.get("limit", 500)))
        ).unique().all()
    )

    violation_rows = [
        [
            _fmt(reading.recorded_at),
            reading.location_name or "-",
            reading.sensor_id or "manual",
            _fmt(reading.temperature_c, 1),
            _fmt(reading.humidity_pct, 0),
            reading.compliance_status or "-",
            reading.source,
        ]
        for reading in violations
    ]

    attention_rows = [
        [
            item["batch_number"],
            item.get("product_name") or "-",
            item.get("location_name") or "-",
            _fmt(item.get("current", {}).get("temperature_c"), 1),
            (
                f"{_fmt(item['required']['temp_min_c'], 0)}-"
                f"{_fmt(item['required']['temp_max_c'], 0)}"
            ),
            _fmt(item.get("current", {}).get("humidity_pct"), 0),
            item["compliance_status"],
            item["risk_level"],
            _fmt(item.get("storage_score"), 0),
        ]
        for item in summary.get("attention_required", [])
    ]

    open_storage_alerts = list(
        db.scalars(
            select(Alert)
            .where(
                Alert.resolved.is_(False),
                Alert.alert_type.in_(
                    ["TEMPERATURE_VIOLATION", "HUMIDITY_VIOLATION", "STORAGE_NON_COMPLIANCE"]
                ),
            )
            .order_by(Alert.created_at.desc())
            .limit(60)
        ).unique().all()
    )

    return ReportData(
        report_type=ReportType.STORAGE_COMPLIANCE,
        title=filters.get("title") or "Storage Compliance Report",
        subtitle="Compliance status, violations and environmental trends",
        generated_at=datetime.now(UTC),
        generated_by=user_name,
        filters=_clean_filters(filters),
        summary={
            "Batches evaluated": summary["total_batches"],
            "Compliance rate": f"{summary['compliance_rate']}%" if summary["compliance_rate"] is not None else None,
            "Average storage score": summary["average_storage_score"],
            "Compliant": summary["counts"].get("COMPLIANT", 0),
            "Warning": summary["counts"].get("WARNING", 0),
            "Non-compliant": summary["counts"].get("NON_COMPLIANT", 0),
            "Readings (14 days)": summary["readings_last_14_days"],
            "Violations (14 days)": summary["violations_last_14_days"],
        },
        tables=[
            Table(
                title="Batches requiring attention",
                columns=[
                    "Batch", "Product", "Location", "Temp C", "Required C",
                    "Humidity %", "Status", "Risk", "Score",
                ],
                rows=attention_rows,
                widths=[1.2, 1.7, 1.3, 0.7, 1.0, 0.9, 1.2, 0.8, 0.6],
            ),
            Table(
                title="Recorded violations (last 14 days)",
                columns=["Recorded", "Location", "Sensor", "Temp C", "Humidity %", "Status", "Source"],
                rows=violation_rows,
            ),
            Table(
                title="Open storage alerts",
                columns=["Alert", "Severity", "Batch", "Message"],
                rows=[
                    [a.alert_type, a.severity, a.batch_id or "-", a.message[:110]]
                    for a in open_storage_alerts
                ],
            ),
        ],
        charts=[
            ChartSeries(
                title="Average temperature (last 14 days)",
                kind="line",
                labels=[p["date"] for p in trends["points"]],
                values=[float(p["avg_temperature_c"] or 0) for p in trends["points"]],
                y_label="deg C",
            ),
            ChartSeries(
                title="Compliance status mix",
                kind="bar",
                labels=list(summary["counts"].keys()),
                values=[float(v) for v in summary["counts"].values()],
                y_label="Batches",
            ),
        ],
        notes=[
            (
                "Recommended storage ranges are configurable engineering defaults, not "
                "medically or legally authoritative limits. Review them against your own "
                "food-safety policy."
            )
        ],
    )


BUILDERS = {
    ReportType.FRESHNESS: build_freshness_report,
    ReportType.SHELF_LIFE: build_shelf_life_report,
    ReportType.INVENTORY_QUALITY: build_inventory_quality_report,
    ReportType.WASTE_REDUCTION: build_waste_reduction_report,
    ReportType.STORAGE_COMPLIANCE: build_storage_compliance_report,
}


def build(
    db: Session, report_type: ReportType, *, user_name: str, filters: dict[str, Any]
) -> ReportData:
    builder = BUILDERS.get(report_type)
    if builder is None:  # pragma: no cover - guarded by the enum
        raise ValueError(f"Unsupported report type: {report_type}")
    return builder(db, user_name=user_name, filters=filters)
