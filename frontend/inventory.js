/**
 * FreshCheck - Inventory Dynamic Controller
 */

// Default mock inventory if user hasn't added items yet
const MOCK_INVENTORY = [
  { id: 1, name: 'Fresh Bananas', category: 'Fruits', purchaseDate: '2026-07-29', expiryDate: '2026-08-05', status: 'Fresh' },
  { id: 2, name: 'Whole Milk 1L', category: 'Dairy', purchaseDate: '2026-07-28', expiryDate: '2026-08-02', status: 'Warning' },
  { id: 3, name: 'Organic Spinach', category: 'Vegetables', purchaseDate: '2026-07-20', expiryDate: '2026-07-27', status: 'Spoiled' },
  { id: 4, name: 'Chicken Breast', category: 'Meat & Seafood', purchaseDate: '2026-07-31', expiryDate: '2026-08-06', status: 'Fresh' }
];

document.addEventListener('DOMContentLoaded', () => {
  initUserProfile();
  renderInventory();

  // Attach search & filter handlers
  document.getElementById('searchInput').addEventListener('input', renderInventory);
  document.getElementById('filterCategory').addEventListener('change', renderInventory);
});

/**
 * Loads sidebar user profile information
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
 * Fetches and displays inventory items from localStorage or fallback mock data
 */
function renderInventory() {
  const tableBody = document.getElementById('inventoryTableBody');
  const searchVal = document.getElementById('searchInput').value.toLowerCase();
  const selectedCategory = document.getElementById('filterCategory').value;

  // Retrieve stored user items
  let storedItems = JSON.parse(localStorage.getItem('freshCheck_inventory') || '[]');

  // Fallback to default mock list if no custom items exist
  if (storedItems.length === 0 && localStorage.getItem('freshCheck_isNewUser') !== 'true') {
    storedItems = MOCK_INVENTORY;
  }

  // Filter items based on search and category
  const filteredItems = storedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchVal);
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  tableBody.innerHTML = '';

  if (filteredItems.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fa-solid fa-box-open"></i>
            <p>No food items found matching your filters.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Render rows
  filteredItems.forEach(item => {
    const status = item.status || calculateStatus(item.expiryDate);
    const badgeClass = getBadgeClass(status);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="item-name-cell">
          <div class="item-icon"><i class="${getCategoryIcon(item.category)}"></i></div>
          <span>${escapeHtml(item.name)}</span>
        </div>
      </td>
      <td>${escapeHtml(item.category)}</td>
      <td>${item.purchaseDate}</td>
      <td>${item.expiryDate || 'N/A'}</td>
      <td>
        <span class="badge ${badgeClass}">
          <i class="fa-solid fa-circle" style="font-size:0.5rem;"></i> ${status}
        </span>
      </td>
      <td>
        <button class="btn-delete" onclick="deleteItem(${item.id})" title="Delete Item">
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

  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Spoiled';
  if (diffDays <= 2) return 'Warning';
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

function deleteItem(id) {
  let storedItems = JSON.parse(localStorage.getItem('freshCheck_inventory') || '[]');
  storedItems = storedItems.filter(item => item.id !== id);
  localStorage.setItem('freshCheck_inventory', JSON.stringify(storedItems));
  renderInventory();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}