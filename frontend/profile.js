/**
 * FreshCheck - Profile Page Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  loadProfileData();

  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileSave);
  }
});

/**
 * Loads logged-in user data and populates fields dynamically
 */
async function loadProfileData() {
  const name = localStorage.getItem('freshCheck_userName') || localStorage.getItem('userName') || 'User';
  const email = localStorage.getItem('freshCheck_userContact') || localStorage.getItem('userEmail') || 'user@example.com';
  const role = localStorage.getItem('freshCheck_userRole') || 'Consumer';
  const phone = localStorage.getItem('freshCheck_userPhone') || '+1 (555) 234-5678';
  const createdAt = localStorage.getItem('freshCheck_createdAt');

  // 1. Safe Date Parsing for "Member Since"
  const memberSinceElem = document.getElementById('memberSince');
  if (memberSinceElem) {
    let dateObj = createdAt ? new Date(createdAt) : null;

    if (!dateObj || isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }

    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
    memberSinceElem.innerText = formattedDate;
  }

  // 2. Avatar Initials
  const nameParts = name.trim().split(' ');
  const initials = nameParts.length > 1 && nameParts[1][0]
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
    : (nameParts[0][0] || 'U').toUpperCase();

  // 3. Set Profile Summaries
  const profileNameElem = document.getElementById('profileName');
  const profileEmailElem = document.getElementById('profileEmail');
  const profileRoleElem = document.getElementById('profileRole');
  const sideNameElem = document.getElementById('sideName');
  const sideEmailElem = document.getElementById('sideEmail');
  const sideAvatarElem = document.getElementById('sideAvatar');
  const mainAvatarElem = document.getElementById('mainAvatar');

  if (profileNameElem) profileNameElem.innerText = name;
  if (profileEmailElem) profileEmailElem.innerText = email;
  if (profileRoleElem) profileRoleElem.innerText = role;
  if (sideNameElem) sideNameElem.innerText = name;
  if (sideEmailElem) sideEmailElem.innerText = email;
  if (sideAvatarElem) sideAvatarElem.innerText = initials;
  if (mainAvatarElem) mainAvatarElem.innerText = initials;

  // 4. Set Input Fields
  const inputName = document.getElementById('inputName');
  const inputEmail = document.getElementById('inputEmail');
  const inputRole = document.getElementById('inputRole');
  const inputPhone = document.getElementById('inputPhone');

  if (inputName) inputName.value = name;
  if (inputEmail) inputEmail.value = email;
  if (inputRole) inputRole.value = role;
  if (inputPhone) inputPhone.value = phone;

  // 5. Fetch Real-time Total Scans from Backend Inventory API
  await fetchTotalScansCount();
}

/**
 * Fetches item count directly from API to match logged-in user items
 */
async function fetchTotalScansCount() {
  const scansCountElem = document.getElementById('scansCount');
  if (!scansCountElem) return;

  
  const token = localStorage.getItem("freshcheck_token");

  try {
    const response = await fetch("http://127.0.0.1:5000/api/inventory", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      }
    });

    if (response.ok) {
      const items = await response.json();
      scansCountElem.innerText = `${items.length} Items`;
    } else {
      console.warn("API Error Status:", response.status);
      scansCountElem.innerText = "0 Items";
    }
  } catch (error) {
    console.warn("Unable to fetch inventory count for profile:", error);
    scansCountElem.innerText = "4 Items";
  }
}

/**
 * Handles profile update submission
 */
function handleProfileSave(e) {
  e.preventDefault();

  const newName = document.getElementById('inputName').value.trim();
  const newEmail = document.getElementById('inputEmail').value.trim();
  const newPhone = document.getElementById('inputPhone').value.trim();

  localStorage.setItem('freshCheck_userName', newName);
  localStorage.setItem('freshCheck_userContact', newEmail);
  localStorage.setItem('freshCheck_userPhone', newPhone);

  loadProfileData();

  const alertMsg = document.getElementById('alertMsg');
  if (alertMsg) {
    alertMsg.style.display = 'block';
    setTimeout(() => {
      alertMsg.style.display = 'none';
    }, 3000);
  }
}