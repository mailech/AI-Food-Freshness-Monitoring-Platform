/**
 * FreshCheck - Notifications Controller
 */

const NOTIFICATIONS_DATA = [
  {
    id: 1,
    title: 'Apple will expire tomorrow',
    subtitle: 'Please consume soon to avoid waste.',
    time: '2 min ago',
    type: 'warnings', // Warnings (Orange)
    iconText: 'A',
    badgeClass: 'badge-warning'
  },
  {
    id: 2,
    title: 'High temperature detected',
    subtitle: 'Storage temperature is higher than recommended.',
    time: '15 min ago',
    type: 'alerts', // Alerts (Red)
    iconText: 'A',
    badgeClass: 'badge-alert'
  },
  {
    id: 3,
    title: 'Milk is fresh',
    subtitle: 'Milk freshness analyzed: 78%',
    time: '1 hour ago',
    type: 'information', // Information (Green)
    iconText: 'A',
    badgeClass: 'badge-info'
  },
  {
    id: 4,
    title: 'Chicken is near expiry',
    subtitle: 'Please consume within 1 day.',
    time: '2 hours ago',
    type: 'warnings', // Warnings (Orange)
    iconText: 'A',
    badgeClass: 'badge-warning'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initUserProfile();
  renderNotifications('all');
});

/**
 * Initializes User Sidebar Profile Information
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
 * Renders notifications based on selected category tab
 */
function renderNotifications(category) {
  const container = document.getElementById('notificationContainer');
  container.innerHTML = '';

  const filtered = category === 'all' 
    ? NOTIFICATIONS_DATA 
    : NOTIFICATIONS_DATA.filter(item => item.type === category);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-bell-slash"></i>
        <p>No notifications found in this category.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'notification-item';
    itemEl.innerHTML = `
      <div class="notification-content">
        <div class="icon-badge ${item.badgeClass}">${item.iconText}</div>
        <div class="notification-text">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.subtitle)}</p>
        </div>
      </div>
      <span class="notification-time">${item.time}</span>
    `;
    container.appendChild(itemEl);
  });
}

/**
 * Filters list and updates active tab state
 */
function filterNotifications(category, element) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  }
  renderNotifications(category);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}