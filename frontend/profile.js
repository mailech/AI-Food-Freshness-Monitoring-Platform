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
 * Loads logged-in user data from LocalStorage and populates fields
 */
function loadProfileData() {
  const name = localStorage.getItem('freshCheck_userName') || 'User Name';
  const email = localStorage.getItem('freshCheck_userContact') || 'User.@example.com';
  const phone = localStorage.getItem('freshCheck_userPhone') || '+1 (555) 234-5678';
  const isNewUser = localStorage.getItem('freshCheck_isNewUser') === 'true';

  // Compute initials
  const nameParts = name.trim().split(' ');
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
    : nameParts[0][0].toUpperCase();

  // Set Profile Summaries
  document.getElementById('profileName').innerText = name;
  document.getElementById('profileEmail').innerText = email;
  document.getElementById('sideName').innerText = name;
  document.getElementById('sideEmail').innerText = email;
  document.getElementById('sideAvatar').innerText = initials;
  document.getElementById('mainAvatar').innerText = initials;

  // Set Input Fields
  document.getElementById('inputName').value = name;
  document.getElementById('inputEmail').value = email;
  document.getElementById('inputPhone').value = phone;

  // Set Total Scans according to user history
  document.getElementById('scansCount').innerText = isNewUser ? '0 Items' : '18 Items';
}

/**
 * Handles profile update submission
 */
function handleProfileSave(e) {
  e.preventDefault();

  const newName = document.getElementById('inputName').value.trim();
  const newEmail = document.getElementById('inputEmail').value.trim();
  const newPhone = document.getElementById('inputPhone').value.trim();

  // Save updated data to localStorage
  localStorage.setItem('freshCheck_userName', newName);
  localStorage.setItem('freshCheck_userContact', newEmail);
  localStorage.setItem('freshCheck_userPhone', newPhone);

  // Reload views
  loadProfileData();

  // Show Success Alert
  const alertMsg = document.getElementById('alertMsg');
  alertMsg.style.display = 'block';
  setTimeout(() => {
    alertMsg.style.display = 'none';
  }, 3000);
}