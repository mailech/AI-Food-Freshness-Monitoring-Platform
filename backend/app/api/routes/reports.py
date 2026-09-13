import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.db.session import get_db
from app.models.entities import FoodItem, Batch, StorageLocation, FreshnessScan, Alert
from app.core.config import settings

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/summary")
def get_reports_summary(db: Session = Depends(get_db)):
    total_items = db.query(FoodItem).count()
    total_scans = db.query(FreshnessScan).count()
    total_batches = db.query(Batch).count()
    total_alerts = db.query(Alert).count()
    
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "total_inventory_items": total_items,
        "total_freshness_scans": total_scans,
        "total_batches_tracked": total_batches,
        "total_alerts_logged": total_alerts,
        "available_formats": ["PDF", "Excel (.xlsx)", "CSV"]
    }

@router.get("/export/pdf")
def export_pdf_report(
    category: str = Query(None),
    report_type: str = Query("freshness_audit"),
    db: Session = Depends(get_db)
):
    query = db.query(FoodItem)
    if category:
        query = query.filter(FoodItem.category == category)
    items = query.order_by(FoodItem.current_freshness_score.asc()).all()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'SubStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=14
    )
    
    # Header
    elements.append(Paragraph("FOOD FRESHNESS & QUALITY AUDIT REPORT", title_style))
    elements.append(Paragraph(f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | System: Food Freshness Monitoring Platform", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#059669'), spaceAfter=14))
    
    # Overview Summary Table
    avg_score = sum(it.current_freshness_score for it in items) / max(1, len(items))
    fresh_count = sum(1 for it in items if it.quality_category == 'Fresh')
    spoil_count = sum(1 for it in items if it.quality_category in ['Near Spoilage', 'Spoiled'])
    
    summary_data = [
        ["Total Tracked Items", str(len(items)), "Average Freshness Score", f"{avg_score:.1f}%"],
        ["Optimal Fresh Produce", str(fresh_count), "Spoilage / At Risk Items", str(spoil_count)]
    ]
    summary_table = Table(summary_data, colWidths=[130, 130, 140, 140])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#334155')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 16))
    
    # Items Table
    elements.append(Paragraph("Inventory & Inspection Records", styles['Heading2']))
    elements.append(Spacer(1, 6))
    
    table_data = [["ID", "Item Name", "Category", "Freshness", "Grade", "Packaging", "Status"]]
    for it in items[:40]:  # Up to 40 items per PDF page
        table_data.append([
            str(it.id),
            it.name[:22],
            it.category[:15],
            f"{it.current_freshness_score:.1f}%",
            it.quality_category,
            it.packaging_type[:15],
            it.status.capitalize()
        ])
        
    items_table = Table(table_data, colWidths=[30, 130, 100, 70, 80, 80, 50])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F1F5F9')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # Footer Note
    elements.append(Paragraph("Official Quality Assurance Certified Record | Antigravity AI Engine", subtitle_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"freshness_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/excel")
def export_excel_report(db: Session = Depends(get_db)):
    items = db.query(FoodItem).all()
    data = []
    for it in items:
        data.append({
            "Item ID": it.id,
            "Name": it.name,
            "Category": it.category,
            "Quantity": it.quantity,
            "Unit": it.unit,
            "Packaging": it.packaging_type,
            "Initial Freshness (%)": it.initial_freshness_score,
            "Current Freshness (%)": it.current_freshness_score,
            "Quality Category": it.quality_category,
            "Estimated Expiry": it.estimated_expiry_date.strftime('%Y-%m-%d') if it.estimated_expiry_date else 'N/A',
            "Status": it.status,
            "Days Stored": it.days_stored
        })
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Freshness Inventory')
    output.seek(0)
    
    filename = f"food_freshness_inventory_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/csv")
def export_csv_report(db: Session = Depends(get_db)):
    items = db.query(FoodItem).all()
    data = []
    for it in items:
        data.append({
            "Item ID": it.id,
            "Name": it.name,
            "Category": it.category,
            "Quantity": it.quantity,
            "Unit": it.unit,
            "Packaging": it.packaging_type,
            "Initial Freshness (%)": it.initial_freshness_score,
            "Current Freshness (%)": it.current_freshness_score,
            "Quality Category": it.quality_category,
            "Estimated Expiry": it.estimated_expiry_date.strftime('%Y-%m-%d') if it.estimated_expiry_date else 'N/A',
            "Status": it.status,
            "Days Stored": it.days_stored
        })
    df = pd.DataFrame(data)
    output = io.StringIO()
    df.to_csv(output, index=False)
    
    filename = f"food_freshness_inventory_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
