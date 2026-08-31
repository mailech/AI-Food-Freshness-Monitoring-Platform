"""Report generation (SRS Module 11): PDF (reportlab) and XLSX (openpyxl).

Report types: freshness, shelf-life, inventory quality, waste reduction,
storage compliance.
"""

import io
from datetime import datetime, timezone

from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet

REPORT_COLUMNS = {
    "freshness": ["Item", "Category", "Overall Score", "Health", "Visual", "Storage"],
    "shelf-life": ["Item", "Category", "Base Days", "Remaining Days", "Forecast Expiry", "Risk"],
    "inventory-quality": ["Item", "Category", "Score", "Health", "Confidence %"],
    "waste-reduction": ["Item", "Category", "Health", "Remaining Days", "Quantity At Risk", "Recommendation"],
    "storage-compliance": ["Item", "Compliant", "Temperature C", "Humidity %", "Violations"],
}


def _rows(kind: str, states: list[dict]) -> list[list[str]]:
    rows = []
    for s in states:
        item = s["item"]
        composite = s["composite"]
        prediction = s["prediction"]
        compliance = s.get("compliance") or {}
        reading = s.get("reading")
        if kind == "freshness":
            c = composite.components
            rows.append([item.name, item.category.name, str(composite.overall_score), composite.health_category, str(c.visual), str(c.storage)])
        elif kind == "shelf-life":
            rows.append([
                item.name,
                item.category.name,
                str(prediction.base_shelf_life_days),
                str(prediction.remaining_days),
                prediction.forecast_expiry_date.isoformat(),
                prediction.early_spoilage_likelihood,
            ])
        elif kind == "inventory-quality":
            rows.append([
                item.name,
                item.category.name,
                str(composite.overall_score),
                composite.health_category,
                str(composite.confidence),
            ])
        elif kind == "waste-reduction":
            qty = sum(float(b.quantity) for b in s["batches"])
            rec = "Discard" if composite.health_category == "Spoiled" else (
                "Consume or freeze soon" if composite.health_category in ("Near Spoilage",) or prediction.remaining_days <= 2
                else "OK"
            )
            rows.append([item.name, item.category.name, composite.health_category, str(prediction.remaining_days), f"{qty:g}", rec])
        elif kind == "storage-compliance":
            rows.append([
                item.name,
                "yes" if compliance.get("compliant") else ("no" if compliance else "no readings"),
                str(reading.temperature_c) if reading and reading.temperature_c is not None else "-",
                str(reading.humidity_pct) if reading and reading.humidity_pct is not None else "-",
                "; ".join(compliance.get("violations", [])) or "-",
            ])
    return rows


def _title(kind: str) -> str:
    return {
        "freshness": "Freshness Report",
        "shelf-life": "Shelf-Life Report",
        "inventory-quality": "Inventory Quality Report",
        "waste-reduction": "Waste Reduction Report",
        "storage-compliance": "Storage Compliance Report",
    }[kind]


def build_xlsx(kind: str, owner_name: str, states: list[dict]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = _title(kind)[:31]
    ws.append([_title(kind)])
    ws.append([f"Owner: {owner_name}"])
    ws.append([f"Generated: {datetime.now(timezone.utc).isoformat(timespec='seconds')}"])
    ws.append([])
    ws.append(REPORT_COLUMNS[kind])
    for row in _rows(kind, states):
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def build_pdf(kind: str, owner_name: str, states: list[dict]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    story = [
        Paragraph(_title(kind), styles["Title"]),
        Paragraph(f"Owner: {owner_name}", styles["Normal"]),
        Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            styles["Normal"],
        ),
        Spacer(1, 12),
    ]
    data = [REPORT_COLUMNS[kind]] + (_rows(kind, states) or [["(no items)"] + [""] * (len(REPORT_COLUMNS[kind]) - 1)])
    table = Table(data, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
            ]
        )
    )
    story.append(table)
    doc.build(story)
    return buf.getvalue()
