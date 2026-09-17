/**
 * FreshCheck - Notifications Controller
 * Dynamically computes notifications from real food inventory data.
 */

let dynamicNotifications = [];
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  initUserProfile();
  await loadAndProcessNotifications();
});

/**
 * Initializes User Sidebar Profile Information
 */
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
 * Fetches food inventory and converts active items into dynamic notification cards
 */
async function loadAndProcessNotifications() {
  let foodItems = [];

  try {
    const token = localStorage.getItem('freshcheck_token') || sessionStorage.getItem('freshcheck_token');
    const response = await fetch('http://127.0.0.1:5000/api/dashboard', {
      headers: { 
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      foodItems = data.items || data.food_items || [];
    } else {
      foodItems = JSON.parse(localStorage.getItem('foodItems') || '[]');
    }
  } catch (err) {
    console.warn("Backend connection failed, falling back to local storage:", err);
    foodItems = JSON.parse(localStorage.getItem('foodItems') || '[]');
  }

  dynamicNotifications = generateNotificationsFromFood(foodItems);
  updateBadgeCount();
  renderNotifications(activeCategory);
}

/**
 * Processes list of food items into Alert, Warning, and Information categories
 */
function generateNotificationsFromFood(items) {
  const notifications = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  items.forEach((item) => {
    const itemName = item.food_name || item.name || 'Food Item';
    const firstLetter = itemName.charAt(0).toUpperCase();
    const status = (item.status || 'Fresh').toString().trim().toLowerCase();
    const isSpoiled = status === 'spoiled' || status === 'rotten';

    // 1. SPOILED/ROTTEN STATUS -> Alert (Red)
    if (isSpoiled) {
      notifications.push({
        id: item.id || Math.random(),
        title: `${itemName} is spoiled!`,
        subtitle: 'Expired or rotten condition detected. Please discard safely.',
        time: 'Action required',
        type: 'alerts',
        iconText: firstLetter,
        badgeClass: 'badge-alert'
      });
      return;
    }

    const expDateStr = item.expiry_date || item.expiryDate;

    if (!expDateStr || expDateStr === 'N/A') {
      notifications.push({
        id: item.id || Math.random(),
        title: `${itemName} status added`,
        subtitle: `Freshness status: ${item.status || 'Fresh'}`,
        time: 'Recently',
        type: 'information',
        iconText: firstLetter,
        badgeClass: 'badge-info'
      });
      return;
    }

    const expDate = new Date(expDateStr);
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // EXPIRED BY DATE -> Alert (Red)
      notifications.push({
        id: item.id || Math.random(),
        title: `${itemName} has expired!`,
        subtitle: `Expired ${Math.abs(diffDays)} day(s) ago. Please discard safely.`,
        time: 'Action required',
        type: 'alerts',
        iconText: firstLetter,
        badgeClass: 'badge-alert'
      });
    } else if (diffDays <= 3 || status.includes('expir') || status.includes('warning')) {
      // NEAR EXPIRY -> Warning (Orange)
      const dayText = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`;
      notifications.push({
        id: item.id || Math.random(),
        title: `${itemName} expires ${dayText}`,
        subtitle: 'Please consume soon to avoid waste.',
        time: `${diffDays}d left`,
        type: 'warnings',
        iconText: firstLetter,
        badgeClass: 'badge-warning'
      });
    } else {
      // FRESH -> Information (Green)
      notifications.push({
        id: item.id || Math.random(),
        title: `${itemName} is fresh`,
        subtitle: `Expires in ${diffDays} days. Optimal freshness recorded.`,
        time: 'Fresh',
        type: 'information',
        iconText: firstLetter,
        badgeClass: 'badge-info'
      });
    }
  });

  return notifications;
}

/**
 * Updates sidebar badge count for urgent notifications (alerts and warnings)
 */
function updateBadgeCount() {
  const badgeElement = document.getElementById('notificationBadge');
  if (!badgeElement) return;

  const urgentCount = dynamicNotifications.filter(
    (n) => n.type === 'alerts' || n.type === 'warnings'
  ).length;

  badgeElement.innerText = urgentCount;
  badgeElement.style.display = urgentCount > 0 ? 'inline-block' : 'none';
}

/**
 * Renders notifications based on selected category tab
 */
function renderNotifications(category) {
  activeCategory = category;
  const container = document.getElementById('notificationContainer');
  if (!container) return;

  container.innerHTML = '';

  const filtered = category === 'all' 
    ? dynamicNotifications 
    : dynamicNotifications.filter((item) => item.type === category);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-bell-slash"></i>
        <p>No notifications found in this category.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((item) => {
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
  document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  }
  renderNotifications(category);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}