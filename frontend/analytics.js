/**
 * FreshCheck - Analytics Page Controllers & Visualizations
 */

document.addEventListener('DOMContentLoaded', () => {
  initUserProfile();
  renderCategoryChart();
  renderStatusChart();
  renderShelfLifeChart();
  renderWasteChart();

  document.getElementById('btnExport').addEventListener('click', () => {
    alert('Exporting Analytics Report as PDF...');
  });
});

/**
 * Initializes User Profile in Sidebar
 */
function initUserProfile() {
  const name = localStorage.getItem('freshCheck_userName') || 'User Name';
  const email = localStorage.getItem('freshCheck_userContact') || 'User.@example.com';

  const nameParts = name.trim().split(' ');
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
    : nameParts[0][0].toUpperCase();

  document.getElementById('sideName').innerText = name;
  document.getElementById('sideEmail').innerText = email;
  document.getElementById('sideAvatar').innerText = initials;
}

/**
 * 1. Food Category Distribution (Pie Chart)
 */
function renderCategoryChart() {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  
  const data = {
    labels: ['Fruits', 'Dairy', 'Meat', 'Bakery', 'Others'],
    datasets: [{
      data: [40, 20, 15, 15, 10],
      backgroundColor: ['#15803d', '#f97316', '#ea580c', '#0284c7', '#06b6d4'],
      borderWidth: 0
    }]
  };

  new Chart(ctx, {
    type: 'pie',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });

  // Populate Custom Legend
  const legendContainer = document.getElementById('categoryLegend');
  legendContainer.innerHTML = '';
  data.labels.forEach((label, index) => {
    legendContainer.innerHTML += `
      <li class="legend-item">
        <span class="legend-label">
          <span class="legend-dot" style="background-color: ${data.datasets[0].backgroundColor[index]}"></span>
          ${label}
        </span>
        <span class="legend-value">${data.datasets[0].data[index]}%</span>
      </li>
    `;
  });
}

/**
 * 2. Fresh vs Spoiled (Doughnut Chart)
 */
function renderStatusChart() {
  const ctx = document.getElementById('statusChart').getContext('2d');

  const data = {
    labels: ['Fresh', 'Good', 'Near Expiry', 'Spoiled'],
    datasets: [{
      data: [71, 17, 8, 4],
      backgroundColor: ['#15803d', '#22c55e', '#eab308', '#dc2626'],
      borderWidth: 0
    }]
  };

  new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: { legend: { display: false } }
    }
  });

  // Populate Custom Legend
  const legendContainer = document.getElementById('statusLegend');
  legendContainer.innerHTML = '';
  data.labels.forEach((label, index) => {
    legendContainer.innerHTML += `
      <li class="legend-item">
        <span class="legend-label">
          <span class="legend-dot" style="background-color: ${data.datasets[0].backgroundColor[index]}"></span>
          ${label}
        </span>
        <span class="legend-value">${data.datasets[0].data[index]}%</span>
      </li>
    `;
  });
}

/**
 * 3. Shelf Life Trend (Line Chart)
 */
function renderShelfLifeChart() {
  const ctx = document.getElementById('shelfLifeChart').getContext('2d');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['1 May', '8 May', '15 May', '22 May', '29 May'],
      datasets: [
        {
          label: 'Optimal Shelf Life',
          data: [75, 60, 75, 48, 60],
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.15)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Average Freshness',
          data: [35, 55, 40, 25, 22],
          borderColor: '#22c55e',
          backgroundColor: 'transparent',
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af' }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: '#9ca3af', stepSize: 25 }
        }
      }
    }
  });
}

/**
 * 4. Waste Reduction (Bar Chart)
 */
function renderWasteChart() {
  const ctx = document.getElementById('wasteChart').getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        data: [11, 12.5, 15, 17.5],
        backgroundColor: '#15803d',
        borderRadius: 6,
        barThickness: 28
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af' }
        },
        y: {
          min: 0,
          max: 20,
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: {
            color: '#9ca3af',
            stepSize: 5,
            callback: value => value + '%'
          }
        }
      }
    }
  });
}