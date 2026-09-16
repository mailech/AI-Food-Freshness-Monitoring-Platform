"""PDF report writer (reportlab).

Charts are drawn with reportlab's own `graphics` primitives, so no headless
matplotlib process is needed inside the API container.
"""

from __future__ import annotations

import io

from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table as PdfTable,
    TableStyle,
)

from app.config import settings
from app.reports.builders import ChartSeries, ReportData, Table

# Palette aligned with the frontend's food-quality visual language.
BRAND = colors.HexColor("#15803d")        # green 700
BRAND_LIGHT = colors.HexColor("#dcfce7")  # green 100
INK = colors.HexColor("#1f2937")          # gray 800
MUTED = colors.HexColor("#6b7280")        # gray 500
GRID = colors.HexColor("#e5e7eb")         # gray 200
WARN = colors.HexColor("#b45309")
DANGER = colors.HexColor("#b91c1c")

MAX_TABLE_ROWS = 300


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "RTitle", parent=base["Title"], fontSize=19, leading=23, textColor=BRAND,
            alignment=TA_LEFT, spaceAfter=2,
        ),
        "subtitle": ParagraphStyle(
            "RSubtitle", parent=base["Normal"], fontSize=10.5, leading=14, textColor=MUTED,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "RH2", parent=base["Heading2"], fontSize=12.5, leading=16, textColor=INK,
            spaceBefore=12, spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "RBody", parent=base["Normal"], fontSize=8.8, leading=12, textColor=INK
        ),
        "small": ParagraphStyle(
            "RSmall", parent=base["Normal"], fontSize=7.6, leading=10, textColor=MUTED
        ),
        "cell": ParagraphStyle(
            "RCell", parent=base["Normal"], fontSize=7.4, leading=9.4, textColor=INK
        ),
        "note": ParagraphStyle(
            "RNote", parent=base["Normal"], fontSize=7.8, leading=10.6, textColor=WARN,
            backColor=colors.HexColor("#fffbeb"), borderPadding=5, spaceBefore=6,
        ),
    }


def _header_footer(canvas, doc) -> None:
    canvas.saveState()
    width, height = doc.pagesize

    # Header band
    canvas.setFillColor(BRAND)
    canvas.rect(0, height - 13 * mm, width, 13 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(12 * mm, height - 8.6 * mm, settings.REPORT_ORGANISATION)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(
        width - 12 * mm, height - 8.6 * mm, "AI-assisted quality report"
    )

    # Footer
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.2)
    canvas.drawString(
        12 * mm, 8 * mm,
        "AI estimates - not a laboratory measurement. Confirm by physical inspection.",
    )
    canvas.drawRightString(width - 12 * mm, 8 * mm, f"Page {canvas.getPageNumber()}")
    canvas.setStrokeColor(GRID)
    canvas.setLineWidth(0.4)
    canvas.line(12 * mm, 11 * mm, width - 12 * mm, 11 * mm)
    canvas.restoreState()


def _summary_table(summary: dict, available_width: float) -> PdfTable:
    items = [(k, v) for k, v in summary.items() if v is not None]
    # Two metric pairs per row.
    rows: list[list] = []
    for index in range(0, len(items), 2):
        chunk = items[index : index + 2]
        row: list = []
        for key, value in chunk:
            row.extend([str(key), str(value)])
        while len(row) < 4:
            row.append("")
        rows.append(row)

    table = PdfTable(rows, colWidths=[available_width * w for w in (0.3, 0.2, 0.3, 0.2)])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.4),
                ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
                ("TEXTCOLOR", (2, 0), (2, -1), MUTED),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
                ("FONTNAME", (3, 0), (3, -1), "Helvetica-Bold"),
                ("TEXTCOLOR", (1, 0), (1, -1), INK),
                ("TEXTCOLOR", (3, 0), (3, -1), INK),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f9fafb")),
                ("GRID", (0, 0), (-1, -1), 0.4, GRID),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


_STATUS_COLOURS = {
    "SPOILED": DANGER,
    "EXPIRED": DANGER,
    "NON_COMPLIANT": DANGER,
    "CRITICAL": DANGER,
    "NEAR_SPOILAGE": WARN,
    "WARNING": WARN,
    "HIGH": WARN,
    "FRESH": BRAND,
    "GOOD": BRAND,
    "COMPLIANT": BRAND,
}


def _data_table(table: Table, styles: dict, available_width: float) -> list:
    flowables: list = [Paragraph(table.title, styles["h2"])]
    if table.note:
        flowables.append(Paragraph(table.note, styles["small"]))

    if not table.rows:
        flowables.append(Paragraph("No matching records for the selected filters.", styles["small"]))
        return flowables

    truncated = len(table.rows) > MAX_TABLE_ROWS
    rows = table.rows[:MAX_TABLE_ROWS]

    header = [Paragraph(f"<b>{c}</b>", styles["cell"]) for c in table.columns]
    body = [[Paragraph(str(cell), styles["cell"]) for cell in row] for row in rows]

    weights = table.widths or [1.0] * len(table.columns)
    total = sum(weights) or 1.0
    col_widths = [available_width * (w / total) for w in weights]

    pdf_table = PdfTable([header, *body], colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_LIGHT),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#14532d")),
        ("GRID", (0, 0), (-1, -1), 0.35, GRID),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
    ]
    # Highlight risk-bearing cells so a reader can scan the table quickly.
    for row_index, row in enumerate(rows, start=1):
        for col_index, cell in enumerate(row):
            colour = _STATUS_COLOURS.get(str(cell).strip().upper())
            if colour is not None:
                style.append(
                    ("TEXTCOLOR", (col_index, row_index), (col_index, row_index), colour)
                )
    pdf_table.setStyle(TableStyle(style))
    flowables.append(pdf_table)

    if truncated:
        flowables.append(
            Paragraph(
                f"Showing the first {MAX_TABLE_ROWS} of {len(table.rows)} rows. Export the "
                "XLSX version for the complete data set.",
                styles["small"],
            )
        )
    return flowables


def _chart(series: ChartSeries, available_width: float) -> Drawing | None:
    if not series.labels or not series.values:
        return None

    # Keep the axis readable: cap the number of plotted categories.
    labels = series.labels
    values = series.values
    if len(labels) > 14:
        step = len(labels) // 14 + 1
        labels = labels[::step]
        values = values[::step]

    width = min(available_width, 480)
    height = 150
    drawing = Drawing(width, height)
    drawing.add(
        String(0, height - 12, series.title, fontName="Helvetica-Bold", fontSize=9, fillColor=INK)
    )

    if series.kind == "line":
        chart = HorizontalLineChart()
        chart.data = [values]
        chart.lines[0].strokeColor = BRAND
        chart.lines[0].strokeWidth = 1.6
    else:
        chart = VerticalBarChart()
        chart.data = [values]
        chart.bars[0].fillColor = BRAND
        chart.barWidth = 6
        chart.groupSpacing = 5

    chart.x = 34
    chart.y = 28
    chart.width = width - 46
    chart.height = height - 52
    chart.valueAxis.valueMin = 0
    maximum = max(values) if values else 1.0
    chart.valueAxis.valueMax = max(1.0, maximum * 1.15)
    chart.valueAxis.labels.fontSize = 6.5
    chart.categoryAxis.categoryNames = [str(label)[:10] for label in labels]
    chart.categoryAxis.labels.fontSize = 6
    chart.categoryAxis.labels.angle = 30
    chart.categoryAxis.labels.dy = -6
    chart.categoryAxis.labels.boxAnchor = "ne"

    drawing.add(chart)
    if series.y_label:
        drawing.add(
            String(0, 6, series.y_label, fontName="Helvetica", fontSize=6.5, fillColor=MUTED)
        )
    return drawing


def render_pdf(data: ReportData) -> bytes:
    """Render a `ReportData` bundle into PDF bytes."""
    styles = _styles()
    buffer = io.BytesIO()
    # Landscape gives the wide detail tables room to breathe.
    pagesize = landscape(A4)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=pagesize,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=18 * mm,
        bottomMargin=14 * mm,
        title=data.title,
        author=settings.REPORT_ORGANISATION,
        subject=data.subtitle,
    )
    available = doc.width

    story: list = [
        Paragraph(data.title, styles["title"]),
        Paragraph(data.subtitle, styles["subtitle"]),
    ]

    meta_bits = [
        f"<b>Generated:</b> {data.generated_at:%Y-%m-%d %H:%M UTC}",
        f"<b>By:</b> {data.generated_by}",
        f"<b>Report type:</b> {data.report_type}",
    ]
    if data.filters:
        filter_text = ", ".join(f"{k}={v}" for k, v in data.filters.items())
        meta_bits.append(f"<b>Filters:</b> {filter_text}")
    else:
        meta_bits.append("<b>Filters:</b> none (all records)")
    story.append(Paragraph(" &nbsp;|&nbsp; ".join(meta_bits), styles["small"]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Key metrics", styles["h2"]))
    story.append(_summary_table(data.summary, available))

    if data.charts:
        story.append(Paragraph("Charts", styles["h2"]))
        for series in data.charts:
            drawing = _chart(series, available)
            if drawing is not None:
                story.append(KeepTogether([drawing, Spacer(1, 6)]))

    for index, table in enumerate(data.tables):
        if index > 0:
            story.append(Spacer(1, 6))
        story.extend(_data_table(table, styles, available))

    if data.notes:
        story.append(PageBreak())
        story.append(Paragraph("Notes and limitations", styles["h2"]))
        for note in data.notes:
            story.append(Paragraph(note, styles["note"]))

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buffer.getvalue()
