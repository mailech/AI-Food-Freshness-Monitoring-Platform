  


document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("freshcheck_token") || sessionStorage.getItem("freshcheck_token");
  // Load User Profile Info from LocalStorage
  const userName = localStorage.getItem("userName") || "Sayantika Mahanta";
  const userEmail = localStorage.getItem("userEmail") || "sayantikamahanta02@gmail.com";

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
  const newUserView = document.getElementById("newUserView");
  const existingUserView = document.getElementById("existingUserView");
  const welcomeSubtext = document.getElementById("welcomeSubtext");

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
    console.warn("Backend API not reachable, checking fallback:", error);
    renderEmptyState();
  }
}

function renderDashboardData(items, summary) {
  const newUserView = document.getElementById("newUserView");
  const existingUserView = document.getElementById("existingUserView");
  const tableBody = document.getElementById("dashboardTableBody");
  const welcomeSubtext = document.getElementById("welcomeSubtext");

  if (newUserView) newUserView.classList.add("hidden");
  if (existingUserView) existingUserView.classList.remove("hidden");
  if (welcomeSubtext) welcomeSubtext.textContent = "Here is your live food freshness overview.";

  // Calculate Counts
  let freshCount = summary?.fresh_count ?? items.filter(i => (i.status || '').toLowerCase() === 'fresh').length;
  let expiringCount = summary?.expiring_count ?? items.filter(i => (i.status || '').toLowerCase().includes('expir')).length;
  let spoiledCount = summary?.spoiled_count ?? items.filter(i => (i.status || '').toLowerCase() === 'spoiled').length;

  document.getElementById("freshCount").textContent = freshCount;
  document.getElementById("expiringCount").textContent = expiringCount || document.getElementById("warningCount")?.textContent || 0;
  document.getElementById("spoiledCount").textContent = spoiledCount;

  // Render Table
  if (tableBody) {
    tableBody.innerHTML = items.map(item => {
      let statusClass = 'fresh';
      const statusLower = (item.status || 'Fresh').toLowerCase();
      if (statusLower.includes('expir') || statusLower.includes('warning')) statusClass = 'warning';
      if (statusLower.includes('spoil')) statusClass = 'spoiled';

      return `
        <tr>
          <td><strong>${item.food_name || item.name || 'Food Item'}</strong></td>
          <td>${item.category || 'General'}</td>
          <td>${item.scanned_date || item.created_at || 'Today'}</td>
          <td>${item.expiry_date || 'N/A'}</td>
          <td>${
              item.ai_confidence !== undefined
             ? Math.round(item.ai_confidence * 100) + '%'
             : (item.confidence !== undefined
             ? Math.round(item.confidence * 100) + '%'
             : '95%')
             }</td>
          <td>${item.shelf_life_days ? item.shelf_life_days + ' Days' : '5 Days'}</td>
          <td><span class="status-badge ${statusClass}">${item.status || 'Fresh'}</span></td>
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

  document.getElementById("freshCount").textContent = "0";
  document.getElementById("expiringCount").textContent = "0";
  document.getElementById("spoiledCount").textContent = "0";
}