document.addEventListener("DOMContentLoaded", async () => {
  // 1. Populate Profile Inputs from stored user data
  const userNameInput = document.getElementById("userName");
  const userEmailInput = document.getElementById("userEmail");

  const savedName = localStorage.getItem("freshCheck_userName");
  const savedEmail = localStorage.getItem("freshCheck_userContact");

  if (userNameInput && savedName) userNameInput.value = savedName;
  if (userEmailInput && savedEmail) userEmailInput.value = savedEmail;

  // 2. Handle Profile Update Form Submission
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const updatedName = userNameInput.value.trim();
      const updatedEmail = userEmailInput.value.trim();

      if (updatedName && updatedEmail) {
        localStorage.setItem("freshCheck_userName", updatedName);
        localStorage.setItem("freshCheck_userContact", updatedEmail);

        const userObj = { name: updatedName, email: updatedEmail };
        localStorage.setItem("user", JSON.stringify(userObj));

        // Call sync function from auth-check.js to update sidebar instantly
        if (typeof syncUserProfile === "function") {
          syncUserProfile();
        }

        alert("Profile updated successfully!");
      }
    });
  }

  // 3. Update Notification Counter according to real food items added
  await updateRealDataSectors();

  // 4. Handle Clear Data Action
  const btnClearData = document.getElementById("btnClearData");
  if (btnClearData) {
    btnClearData.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all local data? This cannot be undone.")) {
        localStorage.clear();
        alert("All local data cleared successfully!");
        window.location.reload();
      }
    });
  }
});

/**
 * Calculates expiring items and updates badge counts dynamically across pages
 */
async function updateRealDataSectors() {
  const badgeElement = document.getElementById("notificationBadge");
  let foodItems = [];

  // Try fetching real food items from Flask backend
  try {
    const token = localStorage.getItem("freshcheck_token");
    const response = await fetch("http://127.0.0.1:5000/api/food", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      foodItems = await response.json();
    } else {
      foodItems = JSON.parse(localStorage.getItem("foodItems") || "[]");
    }
  } catch (err) {
    foodItems = JSON.parse(localStorage.getItem("foodItems") || "[]");
  }

  // Calculate expiring items (Items expiring within 3 days)
  const today = new Date();
  let expiringCount = 0;

  foodItems.forEach((item) => {
    if (item.expiry_date || item.expiryDate) {
      const expDate = new Date(item.expiry_date || item.expiryDate);
      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 3) {
        expiringCount++;
      }
    }
  });

  // Update badge count dynamically
  if (badgeElement) {
    badgeElement.innerText = expiringCount;
    if (expiringCount === 0) {
      badgeElement.style.display = "none";
    } else {
      badgeElement.style.display = "inline-block";
    }
  }
}