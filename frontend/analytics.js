/**
 * FreshCheck - Real-Time Dynamic Analytics Engine
 */

let categoryChartInstance = null;
let statusChartInstance = null;
let shelfLifeChartInstance = null;
let wasteChartInstance = null;

let currentFoodItems = [];

document.addEventListener('DOMContentLoaded', async () => {
  initUserProfile();
  await fetchAndRenderAnalytics();

  const timePeriodSelect = document.getElementById('timePeriodSelect');
  if (timePeriodSelect) {
    timePeriodSelect.addEventListener('change', fetchAndRenderAnalytics);
  }

  const btnExport = document.getElementById('btnExport');
  if (btnExport) {
    btnExport.addEventListener('click', () => window.print());
  }
});

// Real-time synchronization across browser tabs and actions
window.addEventListener('storage', (e) => {
  if (e.key === 'freshCheck_inventory' || e.key === 'foodItems') {
    fetchAndRenderAnalytics();
  }
});
window.addEventListener('freshcheck_data_updated', fetchAndRenderAnalytics);

function initUserProfile() {
  const name = localStorage.getItem('freshCheck_userName') || 'User Name';
  const email = localStorage.getItem('freshCheck_userContact') || 'user@example.com';

  const nameParts = name.trim().split(' ');
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
    : nameParts[0][0].toUpperCase();

  const sideName = document.getElementById('sideName');
  const sideEmail = document.getElementById('sideEmail');
  const sideAvatar = document.getElementById('sideAvatar');

  if (sideName) sideName.innerText = name;
  if (sideEmail) sideEmail.innerText = email;
  if (sideAvatar) sideAvatar.innerText = initials;
}

/**
 * Fetches real user inventory data from the Flask REST API
 */
async function fetchAndRenderAnalytics() {
  try {
    const token = localStorage.getItem('freshcheck_token');
    const response = await fetch('http://127.0.0.1:5000/api/food', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      currentFoodItems = await response.json();
    } else {
      currentFoodItems = JSON.parse(
        localStorage.getItem('freshCheck_inventory') || 
        localStorage.getItem('foodItems') || 
        '[]'
      );
    }
  } catch (err) {
    console.warn('API connection failed. Loading local data fallback.', err);
    currentFoodItems = JSON.parse(
      localStorage.getItem('freshCheck_inventory') || 
      localStorage.getItem('foodItems') || 
      '[]'
    );
  }

  const filteredItems = filterItemsByPeriod(currentFoodItems);
  updateNotificationBadge(currentFoodItems);
  renderAllCharts(filteredItems);
}

/**
 * Filter data dynamically based on time dropdown selection
 */
function filterItemsByPeriod(items) {
  const select = document.getElementById('timePeriodSelect');
  if (!select) return items;

  const value = select.value;
  const now = new Date();

  return items.filter(item => {
    const dateStr = item.created_at || item.added_date || item.expiry_date || item.expiryDate;
    if (!dateStr) return true;

    const itemDate = new Date(dateStr);
    if (value === 'this_month') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    } else if (value === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return itemDate.getMonth() === lastMonth.getMonth() && itemDate.getFullYear() === lastMonth.getFullYear();
    } else if (value === 'this_year') {
      return itemDate.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

function renderAllCharts(items) {
  renderCategoryChart(items);
  renderStatusChart(items);
  renderShelfLifeChart(items);
  renderWasteChart(items);
}

/**
 * 1. Food Category Distribution (Real DB Aggregation)
 */
function renderCategoryChart(items) {
  const chartCanvas = document.getElementById('categoryChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');

  const categoryCounts = {};
  items.forEach(item => {
    const cat = item.category || item.food_category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const labels = Object.keys(categoryCounts);
  const counts = Object.values(categoryCounts);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const percentages = counts.map(v => Math.round((v / total) * 100));

  const colors = ['#15803d', '#22c55e', '#f97316', '#ea580c', '#0284c7', '#8b5cf6', '#eab308'];

  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        data: percentages.length > 0 ? percentages : [100],
        backgroundColor: labels.length > 0 ? colors.slice(0, labels.length) : ['#334155'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });

  const legendContainer = document.getElementById('categoryLegend');
  if (legendContainer) {
    legendContainer.innerHTML = '';
    if (labels.length === 0) {
      legendContainer.innerHTML = `<li class="text-slate-400 text-sm">No items found</li>`;
    } else {
      labels.forEach((label, idx) => {
        legendContainer.innerHTML += `
          <li class="legend-item">
            <span class="legend-label">
              <span class="legend-dot" style="background-color: ${colors[idx]}"></span>
              ${label}
            </span>
            <span class="legend-value">${percentages[idx]}%</span>
          </li>
        `;
      });
    }
  }
}

/**
 * 2. Fresh vs Warning vs Spoiled Status Distribution
 */
function renderStatusChart(items) {
  const chartCanvas = document.getElementById('statusChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let fresh = 0, warning = 0, spoiled = 0;

  items.forEach(item => {
    const status = (item.status || item.freshness_status || '').toLowerCase();
    const expStr = item.expiry_date || item.expiryDate;

    if (status === 'fresh') fresh++;
    else if (status === 'spoiled' || status === 'rotten') spoiled++;
    else if (expStr && expStr !== 'N/A') {
      const expDate = new Date(expStr);
      expDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) spoiled++;
      else if (diffDays <= 3) warning++;
      else fresh++;
    } else {
      fresh++;
    }
  });

  const total = (fresh + warning + spoiled) || 1;
  const percentages = [
    Math.round((fresh / total) * 100),
    Math.round((warning / total) * 100),
    Math.round((spoiled / total) * 100)
  ];

  const labels = ['Fresh', 'Warning', 'Spoiled'];
  const colors = ['#22c55e', '#eab308', '#ef4444'];

  if (statusChartInstance) statusChartInstance.destroy();

  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: items.length > 0 ? percentages : [0, 0, 0],
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: { legend: { display: false } }
    }
  });

  const legendContainer = document.getElementById('statusLegend');
  if (legendContainer) {
    legendContainer.innerHTML = '';
    labels.forEach((label, idx) => {
      legendContainer.innerHTML += `
        <li class="legend-item">
          <span class="legend-label">
            <span class="legend-dot" style="background-color: ${colors[idx]}"></span>
            ${label}
          </span>
          <span class="legend-value">${items.length > 0 ? percentages[idx] : 0}%</span>
        </li>
      `;
    });
  }
}

/**
 * 3. Shelf Life Trend (Aggregates average remaining shelf days)
 */
function renderShelfLifeChart(items) {
  const chartCanvas = document.getElementById('shelfLifeChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group real inventory days remaining by category
  const categories = {};
  items.forEach(item => {
    const cat = item.category || item.food_category || 'Other';
    const expStr = item.expiry_date || item.expiryDate;
    if (expStr) {
      const expDate = new Date(expStr);
      expDate.setHours(0, 0, 0, 0);
      const remainingDays = Math.max(0, Math.ceil((expDate - today) / (1000 * 60 * 60 * 24)));
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(remainingDays);
    }
  });

  const chartLabels = Object.keys(categories).length > 0 ? Object.keys(categories) : ['Category A', 'Category B', 'Category C'];
  const avgDays = chartLabels.map(cat => {
    if (!categories[cat] || categories[cat].length === 0) return 0;
    const sum = categories[cat].reduce((a, b) => a + b, 0);
    return Math.round(sum / categories[cat].length);
  });

  if (shelfLifeChartInstance) shelfLifeChartInstance.destroy();

  shelfLifeChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: 'Avg Remaining Days',
          data: avgDays,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
        y: { min: 0, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af' } }
      }
    }
  });
}

/**
 * 4. Real Waste Reduction Efficiency Calculation
 */
function renderWasteChart(items) {
  const chartCanvas = document.getElementById('wasteChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalItems = items.length;
  let spoiledCount = 0;

  items.forEach(item => {
    const status = (item.status || item.freshness_status || '').toLowerCase();
    const expStr = item.expiry_date || item.expiryDate;

    if (status === 'spoiled' || status === 'rotten') {
      spoiledCount++;
    } else if (expStr) {
      const expDate = new Date(expStr);
      expDate.setHours(0, 0, 0, 0);
      if (expDate < today) spoiledCount++;
    }
  });

  // Calculate efficiency percentage based on saved non-spoiled inventory
  const efficiency = totalItems > 0 
    ? Math.round(((totalItems - spoiledCount) / totalItems) * 100) 
    : 100;

  const metricSpan = document.getElementById('wasteMetric');
  if (metricSpan) metricSpan.innerText = `${efficiency}% Efficient`;

  if (wasteChartInstance) wasteChartInstance.destroy();

  wasteChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Total Added', 'Fresh Active', 'Spoiled/Wasted'],
      datasets: [{
        data: [totalItems, Math.max(0, totalItems - spoiledCount), spoiledCount],
        backgroundColor: ['#0284c7', '#22c55e', '#ef4444'],
        borderRadius: 6,
        barThickness: 32
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
        y: { min: 0, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af', precision: 0 } }
      }
    }
  });
}

function updateNotificationBadge(items) {
  const badgeElement = document.getElementById('notificationBadge');
  if (!badgeElement) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const urgentCount = items.filter(item => {
    const expStr = item.expiry_date || item.expiryDate;
    if (!expStr || expStr === 'N/A') return false;
    const expDate = new Date(expStr);
    expDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).length;

  badgeElement.innerText = urgentCount;
  badgeElement.style.display = urgentCount > 0 ? 'inline-block' : 'none';
}