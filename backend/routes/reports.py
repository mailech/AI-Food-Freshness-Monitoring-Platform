from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import pandas as pd
from datetime import datetime

from ..database import get_db
from ..models.sql_models import InventoryItem, User
from ..utils.security import get_current_user

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter(prefix="/api/reports", tags=["Reports Export"])

def get_inventory_df(db: Session, current_user: User) -> pd.DataFrame:
    query = db.query(InventoryItem)
    if current_user.role not in ["admin", "retail_manager", "warehouse_operator", "food_inspector"]:
        query = query.filter(InventoryItem.user_id == current_user.id)
        
    items = query.all()
    
    data = []
    for item in items:
        data.append({
            "ID": str(item.id),
            "Name": item.name,
            "Category": item.category.name,
            "Quantity": f"{item.quantity} {item.unit}",
            "Status": item.status,
            "Freshness Score (%)": item.freshness_score,
            "Storage Temp (°C)": item.storage_temp or "N/A",
            "Storage Humidity (%)": item.storage_humidity or "N/A",
            "Expiry Date": item.expiry_date.strftime("%Y-%m-%d")
        })
        
    return pd.DataFrame(data)

@router.get("/csv")
def download_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    df = get_inventory_df(db, current_user)
    if df.empty:
        df = pd.DataFrame(columns=["Message"], data=[["No inventory records found."]])
        
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=inventory_report.csv"
    return response

@router.get("/excel")
def download_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    df = get_inventory_df(db, current_user)
    if df.empty:
        df = pd.DataFrame(columns=["Message"], data=[["No inventory records found."]])
        
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Inventory Report', index=False)
        
    output.seek(0)
    response = StreamingResponse(output, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    response.headers["Content-Disposition"] = "attachment; filename=inventory_report.xlsx"
    return response

@router.get("/pdf")
def download_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    df = get_inventory_df(db, current_user)
    
    # Initialize letter size canvas buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=colors.HexColor("#1A202C"),
        spaceAfter=15
    )
    subtitle_style = ParagraphStyle(
        'SubStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor("#718096"),
        spaceAfter=20
    )
    
    # Header block
    story.append(Paragraph("AI Food Freshness Monitoring Platform", title_style))
    story.append(Paragraph(f"Inventory Status Report - Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Operator: {current_user.name} ({current_user.role.upper()})", subtitle_style))
    
    # Prepare tables data
    table_data = []
    if df.empty:
        table_data.append(["No records available to report."])
        t = Table(table_data, colWidths=[540])
        t.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ]))
        story.append(t)
    else:
        # Table Headers
        headers = ["Name", "Category", "Qty", "Status", "Freshness", "Expiry"]
        table_data.append(headers)
        
        for _, row in df.iterrows():
            table_data.append([
                row["Name"],
                row["Category"],
                row["Quantity"],
                row["Status"],
                f"{row['Freshness Score (%)']}%",
                row["Expiry Date"]
            ])
            
        col_widths = [140, 90, 70, 70, 70, 100]
        t = Table(table_data, colWidths=col_widths)
        
        # Grid styles
        grid_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2D3748")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
        ])
        
        # Apply custom row backgrounds based on freshness status
        for idx, row in enumerate(df.iterrows(), start=1):
            status = row[1]["Status"]
            if status == "Spoiled" or status == "Expired":
                bg = colors.HexColor("#FED7D7") # Light Red
            elif status == "Decaying":
                bg = colors.HexColor("#FEEBC8") # Light Orange
            else:
                bg = colors.HexColor("#C6F6D5") # Light Green
            grid_style.add('BACKGROUND', (3, idx), (3, idx), bg)
            
        t.setStyle(grid_style)
        story.append(t)
        
    doc.build(story)
    buffer.seek(0)
    
    response = StreamingResponse(buffer, media_type="application/pdf")
    response.headers["Content-Disposition"] = "attachment; filename=inventory_report.pdf"
    return response
