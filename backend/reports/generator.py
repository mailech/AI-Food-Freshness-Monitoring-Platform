import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from openpyxl import Workbook

def generate_pdf_report(title, records, report_type="freshness"):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"Food Freshness Monitoring Platform", styles["Title"]))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(title, styles["Heading2"]))
    elements.append(Spacer(1, 20))

    if report_type == "freshness":
        headers = ["Food Name", "Category", "Freshness Score", "Quality", "Risk Level", "Shelf Life", "Date"]
        data = [headers]
        for r in records:
            data.append([
                r.food_name, r.food_category, f"{r.freshness_score}%",
                r.quality_class, r.risk_level, r.shelf_life_text,
                r.created_at.strftime("%Y-%m-%d %H:%M")
            ])
    elif report_type == "inventory":
        headers = ["Item Name", "Category", "Quantity", "Unit", "Added Date"]
        data = [headers]
        for r in records:
            data.append([
                r.name, r.category, str(r.quantity), r.unit,
                r.created_at.strftime("%Y-%m-%d")
            ])
    else:
        headers = ["Item", "Value"]
        data = [headers]
        for r in records:
            data.append([str(r.get("item", "")), str(r.get("value", ""))])

    if len(data) > 1:
        col_widths = [doc.width / len(headers)] * len(headers)
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8f9fa"), colors.white]),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph("No data available for this report.", styles["Normal"]))

    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_excel_report(title, records, report_type="freshness"):
    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]

    if report_type == "freshness":
        headers = ["Food Name", "Category", "Freshness Score", "Quality Class", "Risk Level", "Shelf Life", "Color Score", "Texture Score", "Spoilage Prob", "Date"]
        ws.append(headers)
        for r in records:
            ws.append([
                r.food_name, r.food_category, r.freshness_score,
                r.quality_class, r.risk_level, r.shelf_life_text,
                r.color_score, r.texture_score, r.spoilage_probability,
                r.created_at.strftime("%Y-%m-%d %H:%M")
            ])
    elif report_type == "inventory":
        headers = ["Item Name", "Category", "Quantity", "Unit", "Barcode", "Added Date"]
        ws.append(headers)
        for r in records:
            ws.append([r.name, r.category, r.quantity, r.unit, r.barcode, r.created_at.strftime("%Y-%m-%d")])

    for col in ws.columns:
        max_length = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(30, max_length + 2)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
