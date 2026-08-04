/**
 * FreshCheck - Reports Controller
 */

const DEFAULT_REPORTS = [
  { id: 1, name: 'July 2026 Waste Reduction Summary', category: 'Waste Analysis', date: '2026-07-31', size: '1.2 MB' },
  { id: 2, name: 'Q2 Food Freshness & Expiry Audit', category: 'Audit Log', date: '2026-07-15', size: '2.4 MB' },
  { id: 3, name: 'Dairy & Produce Shelf-Life Log', category: 'Category Log', date: '2026-07-01', size: '890 KB' },
  { id: 4, name: 'AI Freshness Prediction Diagnostics', category: 'AI Accuracy', date: '2026-06-25', size: '3.1 MB' }
];

document.addEventListener('DOMContentLoaded', () => {
  initUserProfile();
  initDateFilters();
  renderReportsTable();

  document.getElementById('reportForm').addEventListener('submit', handleGenerateReport);
});

/**
 * Initializes User Profile Sidebar Details
 */
function initUserProfile() {
  const name = localStorage.getItem('freshCheck_userName') || 'Alex Morgan';
  const email = localStorage.getItem('freshCheck_userContact') || 'alex.m@example.com';

  const nameParts = name.trim().split(' ');
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
    : nameParts[0][0].toUpperCase();

  document.getElementById('sideName').innerText = name;
  document.getElementById('sideEmail').innerText = email;
  document.getElementById('sideAvatar').innerText = initials;
}

/**
 * Pre-fills default date inputs
 */
function initDateFilters() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
  document.getElementById('endDate').value = today.toISOString().split('T')[0];
}

/**
 * Renders report history list
 */
function renderReportsTable() {
  const tableBody = document.getElementById('reportsTableBody');
  const reports = JSON.parse(localStorage.getItem('freshCheck_reports') || '[]');

  const allReports = reports.length > 0 ? reports : DEFAULT_REPORTS;

  tableBody.innerHTML = '';

  allReports.forEach(report => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="report-name-cell">
          <div class="report-icon"><i class="fa-regular fa-file-pdf"></i></div>
          <span>${escapeHtml(report.name)}</span>
        </div>
      </td>
      <td>${escapeHtml(report.category)}</td>
      <td>${report.date}</td>
      <td>${report.size}</td>
      <td>
        <div class="action-btn-group">
          <button class="btn-action" onclick="downloadReport('${escapeHtml(report.name)}', 'PDF')">
            <i class="fa-solid fa-file-pdf"></i> PDF
          </button>
          <button class="btn-action" onclick="downloadReport('${escapeHtml(report.name)}', 'CSV')">
            <i class="fa-solid fa-file-csv"></i> CSV
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * Handles generating a new report entry
 */
function handleGenerateReport(e) {
  e.preventDefault();

  const reportType = document.getElementById('reportType').value;
  const todayFormatted = new Date().toISOString().split('T')[0];

  const newReport = {
    id: Date.now(),
    name: `${reportType} (${todayFormatted})`,
    category: 'Custom Report',
    date: todayFormatted,
    size: '1.5 MB'
  };

  const existingReports = JSON.parse(localStorage.getItem('freshCheck_reports') || '[]');
  const updatedReports = existingReports.length > 0 ? existingReports : [...DEFAULT_REPORTS];
  
  updatedReports.unshift(newReport);
  localStorage.setItem('freshCheck_reports', JSON.stringify(updatedReports));

  renderReportsTable();
  alert(`Successfully generated report: ${newReport.name}`);
}

/**
 * Simulated report download trigger
 */
function downloadReport(reportName, format) {
  alert(`Downloading "${reportName}" as ${format}...`);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}