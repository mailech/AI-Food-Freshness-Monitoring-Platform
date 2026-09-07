/**
 * FreshCheck - Inventory Dynamic Controller & Real-Time Sync Engine
 */

let activeInventory = [];

document.addEventListener('DOMContentLoaded', async () => {
  initUserProfile();
  await fetchInventoryData();

  // Attach search & category filter listeners
  const searchInput = document.getElementById('searchInput');
  const filterCategory = document.getElementById('filterCategory');

  if (searchInput) {
    searchInput.addEventListener('input', filterAndRenderTable);
  }
  if (filterCategory) {
    filterCategory.addEventListener('change', filterAndRenderTable);
  }
});

// Global Event Listeners for real-time updates across tabs/windows or scanner popups
window.addEventListener('storage', (e) => {
  if (e.key === 'freshCheck_inventory' || e.key === 'foodItems') {
    fetchInventoryData();
  }
});

window.addEventListener('freshcheck_data_updated', () => {
  fetchInventoryData();
});

/**
 * Loads sidebar user profile information
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
 * Fetches inventory from Flask backend API or fallback LocalStorage
 */
async function fetchInventoryData() {
  try {
    const token = localStorage.getItem('freshcheck_token');
    const response = await fetch('http://127.0.0.1:5000/api/food', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      activeInventory = await response.json();
    } else {
      activeInventory = JSON.parse(
        localStorage.getItem('freshCheck_inventory') || 
        localStorage.getItem('foodItems') || 
        '[]'
      );
    }
  } catch (err) {
    activeInventory = JSON.parse(
      localStorage.getItem('freshCheck_inventory') || 
      localStorage.getItem('foodItems') || 
      '[]'
    );
  }

  updateNotificationBadge(activeInventory);
  filterAndRenderTable();
}

/**
 * Filters and renders food item rows in the table
 */
function filterAndRenderTable() {
  const tableBody = document.getElementById('inventoryTableBody');
  if (!tableBody) return;

  const searchInput = document.getElementById('searchInput');
  const filterCategory = document.getElementById('filterCategory');

  const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
  const selectedCategory = filterCategory ? filterCategory.value : 'All';

  const filtered = activeInventory.filter(item => {
    const itemName = (item.name || item.food_name || '').toLowerCase();
    const category = item.category || 'Others';

    const matchesSearch = itemName.includes(searchVal);
    const matchesCategory = selectedCategory === 'All' || category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  tableBody.innerHTML = '';

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fa-solid fa-box-open"></i>
            <p>No food items found matching your criteria.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(item => {
    const itemName = item.name || item.food_name || 'Food Item';
    const category = item.category || 'Others';
    const purchaseDate = item.purchaseDate || item.purchase_date || item.created_at || 'N/A';
    const expiryDate = item.expiryDate || item.expiry_date || 'N/A';
    
    const status = item.status || calculateStatus(expiryDate);
    const badgeClass = getBadgeClass(status);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="item-name-cell">
          <div class="item-icon"><i class="${getCategoryIcon(category)}"></i></div>
          <span>${escapeHtml(itemName)}</span>
        </div>
      </td>
      <td>${escapeHtml(category)}</td>
      <td>${escapeHtml(purchaseDate)}</td>
      <td>${escapeHtml(expiryDate)}</td>
      <td>
        <span class="badge ${badgeClass}">
          <i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> ${status}
        </span>
      </td>
      <td>
        <button class="btn-delete" onclick="deleteItem('${item.id}')" title="Delete Item">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * Calculates freshness status based on target expiry date
 */
function calculateStatus(expiryDateStr) {
  if (!expiryDateStr || expiryDateStr === 'N/A') return 'Fresh';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);

  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Spoiled';
  if (diffDays <= 3) return 'Warning';
  return 'Fresh';
}

function getBadgeClass(status) {
  switch (status.toLowerCase()) {
    case 'fresh': return 'badge-fresh';
    case 'warning': return 'badge-warning';
    case 'spoiled': return 'badge-spoiled';
    default: return 'badge-fresh';
  }
}

function getCategoryIcon(category) {
  switch (category) {
    case 'Fruits': return 'fa-solid fa-apple-whole';
    case 'Vegetables': return 'fa-solid fa-carrot';
    case 'Dairy': return 'fa-solid fa-cheese';
    case 'Meat & Seafood': return 'fa-solid fa-drumstick-bite';
    case 'Bakery': return 'fa-solid fa-bread-slice';
    default: return 'fa-solid fa-utensils';
  }
}

/**
 * Function to add scanned or manually submitted items directly to the list
 */
function addNewScannedItem(newItem) {
  const formattedItem = {
    id: newItem.id || Date.now(),
    name: newItem.name || newItem.food_name || 'Scanned Food Item',
    category: newItem.category || 'Others',
    purchaseDate: newItem.purchaseDate || newItem.purchase_date || new Date().toISOString().split('T')[0],
    expiryDate: newItem.expiryDate || newItem.expiry_date || 'N/A',
    status: newItem.status || calculateStatus(newItem.expiryDate || newItem.expiry_date)
  };

  activeInventory.unshift(formattedItem);

  localStorage.setItem('freshCheck_inventory', JSON.stringify(activeInventory));
  localStorage.setItem('foodItems', JSON.stringify(activeInventory));

  window.dispatchEvent(new Event('freshcheck_data_updated'));
  syncItemToBackend(formattedItem);
}

/**
 * Syncs added items to Flask API backend
 */
async function syncItemToBackend(item) {
  try {
    const token = localStorage.getItem('freshcheck_token');
    await fetch('http://127.0.0.1:5000/api/food', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(item)
    });
  } catch (err) {
    console.warn('Backend server unavailable. Item saved locally.', err);
  }
}

/**
 * Deletes item via API endpoint and local storage
 */
async function deleteItem(id) {
  if (!confirm('Are you sure you want to remove this item from your inventory?')) return;

  try {
    const token = localStorage.getItem('freshcheck_token');
    await fetch(`http://127.0.0.1:5000/api/food/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.warn('API deletion fallback to local storage', err);
  }

  activeInventory = activeInventory.filter(item => String(item.id) !== String(id));
  localStorage.setItem('freshCheck_inventory', JSON.stringify(activeInventory));
  localStorage.setItem('foodItems', JSON.stringify(activeInventory));

  updateNotificationBadge(activeInventory);
  filterAndRenderTable();
}

/**
 * Updates sidebar notification badge count
 */
function updateNotificationBadge(items) {
  const badgeElement = document.getElementById('notificationBadge');
  if (!badgeElement) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const urgentCount = items.filter(item => {
    const expStr = item.expiry_date || item.expiryDate;
    if (!expStr) return false;
    const expDate = new Date(expStr);
    expDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).length;

  badgeElement.innerText = urgentCount;
  badgeElement.style.display = urgentCount > 0 ? 'inline-block' : 'none';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}