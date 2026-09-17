document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("freshcheck_token") || sessionStorage.getItem("freshcheck_token");

  // Load User Profile Info from LocalStorage
  const userName = localStorage.getItem("freshCheck_userName") || 
                   JSON.parse(localStorage.getItem("currentUser") || "{}").fullname || 
                   "User Name";

  const userEmail = localStorage.getItem("freshCheck_userContact") || 
                    JSON.parse(localStorage.getItem("currentUser") || "{}").email || 
                    "user@example.com";

  const welcomeNameElem = document.getElementById("welcomeName");
  const welcomeSubtextElem = document.getElementById("welcomeSubtext");
  const userNameElem = document.getElementById("userName");
  const userContactElem = document.getElementById("userContact");
  const userAvatarElem = document.getElementById("userAvatar");

  if (welcomeNameElem) welcomeNameElem.textContent = userName.split(" ")[0];
  if (userNameElem) userNameElem.textContent = userName;
  if (userContactElem) userContactElem.textContent = userEmail;
  if (userAvatarElem) userAvatarElem.textContent = userName.charAt(0).toUpperCase();

  // Load Main Data
  await fetchDashboardData(token);

  // Demo Preview Buttons Handling
  const btnNewUser = document.getElementById("btnNewUser");
  const btnExistingUser = document.getElementById("btnExistingUser");

  if (btnNewUser && btnExistingUser) {
    btnNewUser.addEventListener("click", () => renderEmptyState());
    btnExistingUser.addEventListener("click", () => fetchDashboardData(token));
  }
});

async function fetchDashboardData(token) {
  try {
    const response = await fetch("http://127.0.0.1:5000/api/dashboard", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }
    });

    if (response.ok) {
      const data = await response.json();
      const items = data.items || data.food_items || [];

      if (items.length === 0) {
        renderEmptyState();
      } else {
        renderDashboardData(items, data);
      }
    } else {
      renderEmptyState();
    }
  } catch (error) {
    console.warn("Backend API not reachable:", error);
    renderEmptyState();
  }
}

function renderDashboardData(items) {
  const newUserView = document.getElementById("newUserView");
  const existingUserView = document.getElementById("existingUserView");
  const tableBody = document.getElementById("dashboardTableBody");
  const welcomeSubtext = document.getElementById("welcomeSubtext");

  if (newUserView) newUserView.classList.add("hidden");
  if (existingUserView) existingUserView.classList.remove("hidden");
  if (welcomeSubtext) welcomeSubtext.textContent = "Here is your live food freshness overview.";

  // Top Card Counters
  let freshCount = 0;
  let expiringCount = 0;
  let spoiledCount = 0;

  items.forEach(item => {
    const rawStatus = (item.status || '').toString().trim().toLowerCase();
    if (rawStatus === 'spoiled' || rawStatus === 'rotten') {
      spoiledCount++;
    } else if (rawStatus.includes('expir') || rawStatus.includes('warning')) {
      expiringCount++;
    } else {
      freshCount++;
    }
  });

  const freshCountElem = document.getElementById("freshCount");
  const expiringCountElem = document.getElementById("expiringCount");
  const spoiledCountElem = document.getElementById("spoiledCount");

  if (freshCountElem) freshCountElem.textContent = freshCount;
  if (expiringCountElem) expiringCountElem.textContent = expiringCount;
  if (spoiledCountElem) spoiledCountElem.textContent = spoiledCount;

  // Render Table Rows
  if (tableBody) {
    tableBody.innerHTML = items.map(item => {
      const currentStatus = item.status ? item.status.toString().trim() : 'Fresh';
      const statusLower = currentStatus.toLowerCase();
      const isSpoiled = statusLower === 'spoiled' || statusLower === 'rotten';

      let statusClass = 'fresh';
      if (isSpoiled) {
        statusClass = 'spoiled';
      } else if (statusLower.includes('expir') || statusLower.includes('warning')) {
        statusClass = 'warning';
      }

      // 1. Expiry Date & Shelf Life Logic Fix
      const scannedDate = item.scanned_date || item.created_at || 'N/A';
      const expiryDateDisplay = isSpoiled ? scannedDate : (item.expiry_date || 'N/A');
      const shelfLifeDisplay = isSpoiled ? '0 Days' : (item.shelf_life_days !== undefined ? item.shelf_life_days + ' Days' : '5 Days');

      // 2. AI Confidence Dynamic Percentage Fix
      let confidenceVal = "95%"; // Default fallback
      if (item.ai_confidence !== undefined && item.ai_confidence !== null) {
        let conf = parseFloat(item.ai_confidence);
        confidenceVal = conf <= 1 ? Math.round(conf * 100) + '%' : Math.round(conf) + '%';
      } else if (item.confidence !== undefined && item.confidence !== null) {
        let conf = parseFloat(item.confidence);
        confidenceVal = conf <= 1 ? Math.round(conf * 100) + '%' : Math.round(conf) + '%';
      }

      return `
        <tr>
          <td><strong>${item.food_name || item.name || 'Food Item'}</strong></td>
          <td>${item.category || 'General'}</td>
          <td>${scannedDate}</td>
          <td>${expiryDateDisplay}</td>
          <td>${confidenceVal}</td>
          <td>${shelfLifeDisplay}</td>
          <td><span class="status-badge ${statusClass}">${currentStatus}</span></td>
        </tr>
      `;
    }).join('');
  }
}

function renderEmptyState() {
  const newUserView = document.getElementById("newUserView");
  const existingUserView = document.getElementById("existingUserView");
  const welcomeSubtext = document.getElementById("welcomeSubtext");

  if (newUserView) newUserView.classList.remove("hidden");
  if (existingUserView) existingUserView.classList.add("hidden");
  if (welcomeSubtext) welcomeSubtext.textContent = "Welcome! Add your first item to start tracking.";

  const freshCount = document.getElementById("freshCount");
  const expiringCount = document.getElementById("expiringCount");
  const spoiledCount = document.getElementById("spoiledCount");

  if (freshCount) freshCount.textContent = "0";
  if (expiringCount) expiringCount.textContent = "0";
  if (spoiledCount) spoiledCount.textContent = "0";
}