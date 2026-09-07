// /**
//  * FreshCheck - Dashboard Controller
//  * Fetches inventory from GET /api/food and renders real food items without hardcoded defaults.
//  */

// document.addEventListener("DOMContentLoaded", () => {
//     loadDashboardData();
// });

// async function loadDashboardData() {
//     const tableBody = document.getElementById("inventoryTableBody");
//     const totalItemsCount = document.getElementById("totalItemsCount");
//     const freshItemsCount = document.getElementById("freshItemsCount");
//     const expiringItemsCount = document.getElementById("expiringItemsCount");
//     const spoiledItemsCount = document.getElementById("spoiledItemsCount");
//     const token = localStorage.getItem('token'); //  sessionStorage.getItem('token')
//     let foodItems = [];

//     try {
//         const response = await fetch("http://127.0.0.1:5000/api/food", {
//             method: "GET",
//             headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${token}`
//       }
//         });

//         if (response.ok) {
//             foodItems = await response.json();
//         } else {
//             throw new Error(`API error HTTP ${response.status}`);
//         }
//     } catch (err) {
//         console.warn("Backend API unavailable. Checking fallback storage...", err);
//         try {
//             foodItems = JSON.parse(localStorage.getItem("freshCheck_inventory") || "[]");
//         } catch (e) {
//             foodItems = [];
//         }
//     }

//     renderSummaryCards(foodItems, { totalItemsCount, freshItemsCount, expiringItemsCount, spoiledItemsCount });
//     renderInventoryTable(foodItems, tableBody);
// }

// function renderSummaryCards(items, elements) {
//     let fresh = 0;
//     let expiring = 0;
//     let spoiled = 0;

//     items.forEach(item => {
//         const st = (item.status || "").toLowerCase();
//         if (st === "fresh") fresh++;
//         else if (st === "expiring soon" || st === "expiring") expiring++;
//         else if (st === "spoiled" || st === "expired") spoiled++;
//     });

//     if (elements.totalItemsCount) elements.totalItemsCount.innerText = items.length;
//     if (elements.freshItemsCount) elements.freshItemsCount.innerText = fresh;
//     if (elements.expiringItemsCount) elements.expiringItemsCount.innerText = expiring;
//     if (elements.spoiledItemsCount) elements.spoiledItemsCount.innerText = spoiled;
// }

// function renderInventoryTable(items, container) {
//     if (!container) return;

//     if (!items || items.length === 0) {
//         container.innerHTML = `
//             <tr>
//                 <td colspan="7" style="text-align: center; padding: 20px; color: #888;">
//                     No food items found in inventory. Add your first item using the "Add Food" form.
//                 </td>
//             </tr>
//         `;
//         return;
//     }

//     container.innerHTML = items.map(item => {
//         const foodName = item.food_name || "Unknown Item";
//         const category = item.category || "General";
//         const scannedDate = item.scanned_date || "N/A";
//         const expiryDate = item.expiry_date || "N/A";
//         const shelfLife = item.shelf_life_days !== undefined ? `${item.shelf_life_days} days` : "N/A";
        
//         let confVal = item.ai_confidence;
//         let formattedConf = "N/A";
//         if (confVal !== undefined && confVal !== null) {
//             let num = parseFloat(confVal);
//             if (!isNaN(num)) {
//                 if (num > 1.0) num = num / 100.0;
//                 formattedConf = `${Math.round(num * 100)}%`;
//             }
//         }

//         const status = item.status || "Fresh";
//         const statusBadgeClass = getStatusClass(status);

//         return `
//             <tr>
//                 <td style="font-weight: 600;">${escapeHtml(foodName)}</td>
//                 <td>${escapeHtml(category)}</td>
//                 <td>${escapeHtml(scannedDate)}</td>
//                 <td>${escapeHtml(expiryDate)}</td>
//                 <td>${escapeHtml(shelfLife)}</td>
//                 <td>${formattedConf}</td>
//                 <td><span class="status-badge ${statusBadgeClass}">${escapeHtml(status)}</span></td>
//             </tr>
//         `;
//     }).join("");
// }

// function getStatusClass(status) {
//     const st = (status || "").toLowerCase();
//     if (st === "fresh") return "badge-fresh";
//     if (st === "expiring soon" || st === "expiring") return "badge-expiring";
//     if (st === "spoiled" || st === "expired") return "badge-spoiled";
//     return "badge-general";
// }

// function escapeHtml(str) {
//     return String(str)
//         .replace(/&/g, "&amp;")
//         .replace(/</g, "&lt;")
//         .replace(/>/g, "&gt;")
//         .replace(/"/g, "&quot;");
// }  


document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

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
          <td>${item.purchase_date || item.created_at || 'Today'}</td>
          <td>${item.expiry_date || 'N/A'}</td>
          <td>${item.ai_confidence || item.confidence || '95'}%</td>
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