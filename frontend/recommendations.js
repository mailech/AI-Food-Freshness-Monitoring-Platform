let allRecommendations = [];

document.addEventListener("DOMContentLoaded", fetchRecommendations);

async function fetchRecommendations() {
  const container = document.getElementById("recommendationsContainer");
  const token = localStorage.getItem("freshcheck_token") || 
                localStorage.getItem("token") || 
                sessionStorage.getItem("token");

  if (!token) {
    container.innerHTML = `<p style="color: #f59e0b; padding: 10px;">User authentication token missing. Please log in again.</p>`;
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:5000/api/recommendations", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      container.innerHTML = `<p style="color: #ef4444; padding: 10px;">Session expired or unauthorized token. Please re-login.</p>`;
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      container.innerHTML = `<p style="color: #ef4444; padding: 10px;">Error: ${data.message || data.error || 'Server error occurred'}</p>`;
      return;
    }

    allRecommendations = data.recommendations || [];

    if (allRecommendations.length === 0) {
      container.innerHTML = "<p style='color: #9ca3af; padding: 10px;'>No food recommendations found in your database.</p>";
      return;
    }

    renderRecommendations(allRecommendations);

  } catch (err) {
    console.error("Fetch Error:", err);
    container.innerHTML = `<p style="color: #ef4444; padding: 10px;">Connection Error: Unable to reach Flask server at <code>http://127.0.0.1:5000</code>. Verify your backend server is running.</p>`;
  }
}

function renderRecommendations(items) {
  const container = document.getElementById("recommendationsContainer");

  if (!items || items.length === 0) {
    container.innerHTML = "<p style='color: #9ca3af; padding: 10px;'>No items match this category.</p>";
    return;
  }

  container.innerHTML = items.map(item => {
    // Standardize title and extract name
    const rawTitle = item.title || item.name || "Item";
    const name = rawTitle.replace(/is fresh|is rotten|is warning/gi, "").replace("Store ", "").trim();
    const initial = name.charAt(0).toUpperCase();

    const statusStr = (item.status || item.freshness_label || "fresh").toLowerCase();

    let circleClass = "fresh";
    let statusText = "Fresh";

    if (statusStr.includes("rotten") || item.tag === "Attention") {
      circleClass = "alert";
      statusText = "Rotten";
    } else if (statusStr.includes("warning") || item.tag === "Analysis Required") {
      circleClass = "warning";
      statusText = "Warning";
    }

    return `
      <div class="item-row">
        <div class="item-left">
          <div class="circle-avatar ${circleClass}">${initial}</div>
          <div class="item-details">
            <h4>${name.toLowerCase()} is ${statusText.toLowerCase()}</h4>
            <p>${item.description || 'Optimal freshness recorded.'}</p>
          </div>
        </div>
        <div class="item-right-status">
          ${statusText}
        </div>
      </div>
    `;
  }).join("");
}

function filterItems(type, element) {
  document.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
  element.classList.add('active');

  if (type === 'all') {
    renderRecommendations(allRecommendations);
  } else if (type === 'alerts') {
    renderRecommendations(allRecommendations.filter(i => 
      i.tag === 'Attention' || (i.status && i.status.toLowerCase().includes('rotten'))
    ));
  } else if (type === 'warnings') {
    renderRecommendations(allRecommendations.filter(i => 
      i.tag === 'Analysis Required' || (i.status && i.status.toLowerCase().includes('warning'))
    ));
  } else if (type === 'information') {
    renderRecommendations(allRecommendations.filter(i => 
      i.tag === 'Storage' || (i.status && i.status.toLowerCase().includes('fresh'))
    ));
  }
}