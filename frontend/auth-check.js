// Function to update sidebar profile across ALL HTML pages
function syncUserProfile() {
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarUserEmail = document.getElementById("sidebarUserEmail");
  const sidebarAvatar = document.getElementById("sidebarAvatar");

  // Read saved profile data
  const savedName = localStorage.getItem("freshCheck_userName");
  const savedEmail = localStorage.getItem("freshCheck_userContact");

  // Check fallback JSON object if keys are empty
  let userObj = {};
  try {
    userObj = JSON.parse(localStorage.getItem("user") || "{}");
  } catch (e) {
    userObj = {};
  }

  const displayName = savedName || userObj.name || "User Name";
  const displayEmail = savedEmail || userObj.email || "user@example.com";

  // Update DOM Elements if they exist on the current page
  if (sidebarUserName) sidebarUserName.innerText = displayName;
  if (sidebarUserEmail) sidebarUserEmail.innerText = displayEmail;

  if (sidebarAvatar) {
    const initials = displayName
      .split(" ")
      .map(part => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    sidebarAvatar.innerText = initials || "U";
  }
}

// Run synchronization as soon as any page DOM is loaded
document.addEventListener("DOMContentLoaded", syncUserProfile);