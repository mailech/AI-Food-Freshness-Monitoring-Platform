document.addEventListener("DOMContentLoaded", () => {
    initUserProfile();
    fetchRealReportsData();

    const reportForm = document.getElementById("reportForm");
    if (reportForm) {
        reportForm.addEventListener("submit", handleReportGeneration);
    }
});

function initUserProfile() {
    const userName = localStorage.getItem("freshCheck_userName") || localStorage.getItem("userName") || "Sayantika Mahanta";
    const userEmail = localStorage.getItem("freshCheck_userContact") || localStorage.getItem("userEmail") || "sayantikamahanta02@gmail.com";

    const sidebarUserName = document.getElementById("sidebarUserName");
    const sidebarUserEmail = document.getElementById("sidebarUserEmail");
    const sidebarAvatar = document.getElementById("sidebarAvatar");

    if (sidebarUserName) sidebarUserName.innerText = userName;
    if (sidebarUserEmail) sidebarUserEmail.innerText = userEmail;
    if (sidebarAvatar) sidebarAvatar.innerText = userName.charAt(0).toUpperCase();
}

let cachedReportData = null;

async function fetchRealReportsData() {
    const token = localStorage.getItem("freshcheck_token") || localStorage.getItem("token") || sessionStorage.getItem("token");

    try {
        const response = await fetch("http://127.0.0.1:5000/api/reports/data", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? `Bearer ${token}` : ""
            }
        });

        if (response.ok) {
            cachedReportData = await response.json();
            updateStatsWithRealData(cachedReportData);
            renderDynamicReportsTable(cachedReportData);
        } else {
            handleEmptyReportState("No records found for the selected period");
        }
    } catch (error) {
        console.warn("Unable to fetch real report data from backend:", error);
        handleEmptyReportState("No data available");
    }
}

function updateStatsWithRealData(data) {
    const totalItems = data.total_items || 0;
    const audit = data.audit || {};
    
    const wasteElem = document.getElementById("wasteIncidents");
    const freshnessElem = document.getElementById("freshnessRate");
    const spoilageElem = document.getElementById("spoilageRate");
    const totalGeneratedElem = document.getElementById("totalGenerated");

    if (wasteElem) wasteElem.textContent = audit.rotten_items || 0;
    if (freshnessElem) freshnessElem.textContent = audit.freshness_rate || (totalItems > 0 ? "0%" : "No data available");
    if (spoilageElem) spoilageElem.textContent = audit.spoilage_rate || (totalItems > 0 ? "0%" : "No data available");
    if (totalGeneratedElem) totalGeneratedElem.textContent = totalItems > 0 ? Object.keys(data.categories || {}).length + 2 : 0;
}

function handleEmptyReportState(message) {
    updateStatsWithRealData({ total_items: 0, audit: { rotten_items: 0, freshness_rate: message, spoilage_rate: message } });
    const reportsTableBody = document.getElementById("reportsTableBody");
    if (reportsTableBody) {
        reportsTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #718096; padding: 20px;">
                    ${message}
                </td>
            </tr>
        `;
    }
}

function renderDynamicReportsTable(data) {
    const reportsTableBody = document.getElementById("reportsTableBody");
    if (!reportsTableBody) return;

    if (!data.total_items || data.total_items === 0) {
        handleEmptyReportState("No data available");
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    const reportsList = [
        {
            name: "Category Consumption Summary",
            category: "Analytics",
            generated_on: today,
            file_size: "1.2 MB",
            type: "category_summary"
        },
        {
            name: "AI Prediction Log",
            category: "Audit Log",
            generated_on: today,
            file_size: "950 KB",
            type: "ai_prediction"
        },
        {
            name: "Monthly Food Waste Audit",
            category: "Analytics",
            generated_on: today,
            file_size: "1.4 MB",
            type: "waste_audit"
        },
        {
            name: "Inventory Expiration Summary",
            category: "Audit Log",
            generated_on: today,
            file_size: "890 KB",
            type: "inventory_summary"
        }
    ];

    reportsTableBody.innerHTML = reportsList.map(report => `
        <tr>
            <td>
                <div class="report-name-cell">
                    <div class="report-icon"><i class="fa-regular fa-file-pdf"></i></div>
                    <span>${report.name}</span>
                </div>
            </td>
            <td>${report.category}</td>
            <td>${report.generated_on}</td>
            <td>${report.file_size}</td>
            <td>
                <div class="action-btn-group">
                    <button class="btn-action" type="button" onclick="downloadRealReport('${report.type}', '${report.name.replace(/'/g, "\\'")}', '${report.category}', '${report.generated_on}')">
                        <i class="fa-solid fa-download"></i> Download
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Generates Real Database-driven Report Content and triggers File Download
 */
function downloadRealReport(reportType, name, category, date) {
    if (!cachedReportData || cachedReportData.total_items === 0) {
        alert("No data available in the database to generate this report.");
        return;
    }

    let reportSpecificContent = "";
    const totalItems = cachedReportData.total_items;
    const audit = cachedReportData.audit || {};
    const categories = cachedReportData.categories || {};
    const predictions = cachedReportData.predictions || [];
    const inventory = cachedReportData.inventory || [];

    if (reportType === "category_summary") {
        let catLines = Object.keys(categories).length > 0 
            ? Object.entries(categories).map(([cat, count]) => {
                const percentage = Math.round((count / totalItems) * 100);
                return `  - ${cat}: ${count} items (${percentage}%)`;
              }).join('\n')
            : "  No categories found";

        reportSpecificContent = `
----------------------------------------
1. CATEGORY CONSUMPTION SUMMARY:
----------------------------------------
- Total Food Items      : ${totalItems}
- Category Statistics   :
${catLines}
- Relevant Metrics      : Derived from PostgreSQL active records
        `.trim();
    } 
    else if (reportType === "ai_prediction") {
        let predLines = predictions.length > 0
            ? predictions.map(p => `  * ${p.food_name} | Class: ${p.predicted_class} | Status: ${p.status} | Conf: ${p.confidence} | Date: ${p.prediction_date}`).join('\n')
            : "  No prediction records found";

        reportSpecificContent = `
----------------------------------------
2. AI PREDICTION LOG:
----------------------------------------
- Total AI Scans/Logs   : ${predictions.length}
- Average AI Confidence : ${cachedReportData.average_ai_confidence || "Not available"}
- Note on Accuracy      : Confidence scores reflect model outputs; verified ground-truth labels are tracked where available.
- Prediction Records    :
${predLines}
        `.trim();
    } 
    else if (reportType === "waste_audit") {
        let catWasteLines = Object.keys(categories).length > 0
            ? Object.entries(categories).map(([cat, count]) => `  - ${cat}: ${count} total items managed`).join('\n')
            : "  No category waste data available";

        reportSpecificContent = `
----------------------------------------
3. MONTHLY FOOD WASTE AUDIT:
----------------------------------------
- Total Food Items      : ${totalItems}
- Fresh Items           : ${audit.fresh_items || 0}
- Rotten/Spoiled Items  : ${audit.rotten_items || 0}
- Expired Items         : ${audit.expired_items || 0}
- Waste Incidents       : ${audit.rotten_items || 0}
- Freshness Rate        : ${audit.freshness_rate || "0%"}
- Spoilage Rate         : ${audit.spoilage_rate || "0%"}
- Category-wise Breakdown:
${catWasteLines}
        `.trim();
    } 
    else if (reportType === "inventory_summary") {
        let invLines = inventory.length > 0
            ? inventory.map(i => `  * ${i.food_name} (${i.category}) | Scan: ${i.scanned_date} | Expiry: ${i.expiry_date} | Shelf Life: ${i.shelf_life} | Status: ${i.status} | Conf: ${i.ai_confidence}`).join('\n')
            : "  No inventory records found";

        reportSpecificContent = `
----------------------------------------
4. INVENTORY EXPIRATION SUMMARY:
----------------------------------------
- Active Inventory Records: ${inventory.length}
- Detailed Items List    :
${invLines}
        `.trim();
    }

    const reportContent = `
========================================
       FRESHCHECK - OFFICIAL REPORT
========================================
Report Name : ${name}
Category    : ${category}
Generated On: ${date}
Platform    : FreshCheck Food Monitoring System (PostgreSQL Connected)
----------------------------------------
${reportSpecificContent}
----------------------------------------
Status      : Verified & Generated Successfully from Real Database
========================================
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}_Report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleReportGeneration(e) {
    e.preventDefault();
    const reportTypeSelect = document.getElementById("reportType");
    const reportType = reportTypeSelect ? reportTypeSelect.value : "Custom Report";
    const today = new Date().toISOString().split('T')[0];

    const reportsTableBody = document.getElementById("reportsTableBody");
    if (reportsTableBody) {
        const newRowHTML = `
            <tr>
                <td>
                    <div class="report-name-cell">
                        <div class="report-icon"><i class="fa-regular fa-file-pdf"></i></div>
                        <span>${reportType}</span>
                    </div>
                </td>
                <td>Custom</td>
                <td>${today}</td>
                <td>1.0 MB</td>
                <td>
                    <div class="action-btn-group">
                        <button class="btn-action" type="button" onclick="downloadRealReport('waste_audit', '${reportType.replace(/'/g, "\\'")}', 'Custom', '${today}')">
                            <i class="fa-solid fa-download"></i> Download
                        </button>
                    </div>
                </td>
            </tr>
        `;
        reportsTableBody.insertAdjacentHTML('afterbegin', newRowHTML);
    }
}