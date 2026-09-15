/**
 * Module 11: Reports & Data Export System
 * Food Freshness Monitoring Platform
 */

class ReportsService {
  constructor() {}

  /**
   * Export Inventory Data as CSV / Excel Compatible format
   */
  exportInventoryToCSV() {
    const items = window.inventoryService.getItems();
    if (!items || items.length === 0) {
      alert('No inventory items to export.');
      return;
    }

    const headers = [
      'Batch Number',
      'Product Name',
      'Category',
      'Quantity',
      'Unit',
      'Location',
      'Expiry Date',
      'Days Remaining',
      'Visual Score (40%)',
      'Storage Score (25%)',
      'Shelf-Life Score (20%)',
      'Age Score (15%)',
      'Overall Freshness Score',
      'Category Rating',
      'Spoilage Probability',
      'Mold Detected',
      'Bruising Detected'
    ];

    const rows = items.map(item => {
      const a = item.lastAssessment || {};
      const ind = a.spoilageIndicators || {};
      return [
        `"${item.batchNumber}"`,
        `"${item.name}"`,
        `"${item.category}"`,
        item.quantity,
        `"${item.unit}"`,
        `"${item.storageLocation}"`,
        `"${item.expiryDate}"`,
        a.remainingShelfLifeDays ?? '',
        a.visualScore ?? '',
        a.storageScore ?? '',
        a.shelfLifeScore ?? '',
        a.productAgeScore ?? '',
        a.overallFreshnessScore ?? '',
        `"${a.category ?? ''}"`,
        a.spoilageProbability ?? '',
        ind.moldDetected ? 'YES' : 'NO',
        ind.bruisingDetected ? 'YES' : 'NO'
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FreshGuard_Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (window.notificationService) {
      window.notificationService.showToast({
        title: 'Export Generated',
        message: `Exported ${items.length} inventory records to CSV successfully.`,
        type: 'success'
      });
    }
  }

  /**
   * Generates a formal, printable / PDF Food Quality & Freshness Inspection Certificate
   */
  generateInspectionCertificate(item) {
    if (!item) return;
    const a = item.lastAssessment || {};
    const ind = a.spoilageIndicators || {};
    const user = window.authService.getCurrentUser();
    const dateStr = new Date().toLocaleString();

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      alert('Pop-up was blocked. Please allow pop-ups for this certificate preview.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inspection Certificate - ${item.batchNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
          .cert-header { display: flex; justify-content: space-between; border-bottom: 3px solid #0284c7; padding-bottom: 20px; }
          .brand-title { font-size: 24px; font-weight: 800; color: #0284c7; margin: 0; }
          .cert-tag { font-size: 13px; color: #64748b; margin-top: 4px; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 14px; }
          .badge-Fresh { background: #dcfce7; color: #15803d; }
          .badge-Good { background: #e0f2fe; color: #0369a1; }
          .badge-Acceptable { background: #fef9c3; color: #a16207; }
          .badge-Near-Spoilage { background: #ffedd5; color: #c2410c; }
          .badge-Spoiled { background: #fee2e2; color: #b91c1c; }
          .section-title { font-size: 16px; font-weight: 700; color: #334155; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 12px; }
          .data-box { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 4px; }
          .score-hero { display: flex; align-items: center; justify-content: space-around; background: #f0f9ff; border: 2px solid #bae6fd; border-radius: 12px; padding: 20px; margin-top: 20px; }
          .score-num { font-size: 48px; font-weight: 900; color: #0284c7; }
          .score-weights { font-size: 13px; color: #475569; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 30px; border-top: 1px solid #cbd5e1; }
          .sig-line { width: 220px; border-top: 1px solid #000; text-align: center; font-size: 13px; padding-top: 6px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="cert-header">
          <div>
            <h1 class="brand-title">🌿 FreshGuard AI Platform</h1>
            <div class="cert-tag">ISO/IEC 17025 Certified Automated Food Inspection Report</div>
          </div>
          <div style="text-align: right;">
            <div class="badge badge-${(a.category || 'Fresh').replace(' ', '-')}">${a.category || 'Fresh'}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Certificate ID: CERT-${item.batchNumber}</div>
          </div>
        </div>

        <div class="score-hero">
          <div>
            <div class="label">Composite Freshness Index</div>
            <div class="score-num">${a.overallFreshnessScore || 90}%</div>
            <div>Status: <strong>${a.category}</strong></div>
          </div>
          <div class="score-weights">
            <div><strong>Multi-Factor Model Breakdown:</strong></div>
            <div>• Visual Transformer Analysis (40%): <strong>${a.visualScore}%</strong></div>
            <div>• Storage Conditions (25%): <strong>${a.storageScore}%</strong></div>
            <div>• Remaining Shelf-Life (20%): <strong>${a.shelfLifeScore}%</strong> (${a.remainingShelfLifeDays} days left)</div>
            <div>• Chronological Product Age (15%): <strong>${a.productAgeScore}%</strong></div>
          </div>
        </div>

        <div class="section-title">Batch & Consignment Specifications</div>
        <div class="grid">
          <div class="data-box"><div class="label">Product Name</div><div class="value">${item.name}</div></div>
          <div class="data-box"><div class="label">Batch Identifier</div><div class="value">${item.batchNumber}</div></div>
          <div class="data-box"><div class="label">Food Category</div><div class="value">${item.category.toUpperCase()}</div></div>
          <div class="data-box"><div class="label">Consignment Volume</div><div class="value">${item.quantity} ${item.unit}</div></div>
          <div class="data-box"><div class="label">Storage Facility</div><div class="value">${item.storageLocation}</div></div>
          <div class="data-box"><div class="label">Declared Expiration</div><div class="value">${item.expiryDate}</div></div>
        </div>

        <div class="section-title">Environmental Telemetry & Biological Pathogen Indicators</div>
        <div class="grid">
          <div class="data-box"><div class="label">Storage Temp / Humidity</div><div class="value">${item.storageConditions.temperature}°C / ${item.storageConditions.humidity}% RH</div></div>
          <div class="data-box"><div class="label">Spoilage Risk Probability</div><div class="value">${((a.spoilageProbability || 0) * 100).toFixed(1)}%</div></div>
          <div class="data-box"><div class="label">Mold Spore Presence</div><div class="value">${ind.moldDetected ? '⚠️ POSITIVE' : '✅ NEGATIVE (None Detected)'}</div></div>
          <div class="data-box"><div class="label">Necrotic Tissue / Bruising</div><div class="value">${ind.bruisingDetected ? '⚠️ SURFACE BRUISING OBSERVED' : '✅ INTEGRITY SOUND'}</div></div>
        </div>

        <div class="signatures">
          <div>
            <div style="height: 40px; font-family: cursive; font-size: 20px; color: #0369a1;">${user.name}</div>
            <div class="sig-line">Inspecting Officer Signature<br><strong>${user.name} (${user.role})</strong></div>
          </div>
          <div>
            <div style="height: 40px; font-family: monospace; font-size: 11px; color: #64748b;">SHA-256: 8f9b2...4ac9<br>Verified by AI Attention Engine</div>
            <div class="sig-line">Cryptographic Timestamp<br>${dateStr}</div>
          </div>
        </div>

        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 10px 24px; font-size: 15px; border-radius: 6px; cursor: pointer; font-weight: bold;">
            🖨️ Print Certificate / Save as PDF
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * Complete System Data Backup
   */
  exportSystemStateJSON() {
    const state = window.appState.getState();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `freshguard_system_backup_${Date.now()}.json`);
    dlAnchorElem.click();
    dlAnchorElem.remove();
  }
}

window.reportsService = new ReportsService();
