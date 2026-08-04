/**
 * FreshCheck - Settings Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  loadUserSettings();

  document.getElementById('profileForm').addEventListener('submit', handleProfileSave);
  document.getElementById('toggleExpiryAlerts').addEventListener('change', saveToggles);
  document.getElementById('toggleTempAlerts').addEventListener('change', saveToggles);
  document.getElementById('toggleWeeklySummary').addEventListener('change', saveToggles);
  document.getElementById('tempUnit').addEventListener('change', saveAppPreferences);
  document.getElementById('defaultPage').addEventListener('change', saveAppPreferences);
});

/**
 * Loads values from LocalStorage into form elements
 */
function loadUserSettings() {
  const name = localStorage.getItem('freshCheck_userName') || 'Alex Morgan';
  const email = localStorage.getItem('freshCheck_userContact') || 'alex.m@example.com';

  document.getElementById('userName').value = name;
  document.getElementById('userEmail').value = email;

  updateSidebarProfile(name, email);

  // Notification Toggles
  document.getElementById('toggleExpiryAlerts').checked = 
    localStorage.getItem('freshCheck_optExpiryAlerts') !== 'false';
  document.getElementById('toggleTempAlerts').checked = 
    localStorage.getItem('freshCheck_optTempAlerts') !== 'false';
  document.getElementById('toggleWeeklySummary').checked = 
    localStorage.getItem('freshCheck_optWeeklySummary') === 'true';

  // Preferences
  document.getElementById('tempUnit').value = 
    localStorage.getItem('freshCheck_tempUnit') || 'C';
  document.getElementById('defaultPage').value = 
    localStorage.getItem('freshCheck_defaultPage') || 'dashboard.html';
}

/**
 * Updates Sidebar UI details
 */
function updateSidebarProfile(name, email) {
  const nameParts = name.trim().split(' ');
  const initials = nameParts.length > 1 
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
    : (nameParts[0][0] || 'U').toUpperCase();

  document.getElementById('sideName').innerText = name;
  document.getElementById('sideEmail').innerText = email;
  document.getElementById('sideAvatar').innerText = initials;
}

/**
 * Saves profile information
 */
function handleProfileSave(e) {
  e.preventDefault();

  const name = document.getElementById('userName').value.trim() || 'User Name';
  const email = document.getElementById('userEmail').value.trim() || 'User.m@example.com';

  localStorage.setItem('freshCheck_userName', name);
  localStorage.setItem('freshCheck_userContact', email);

  updateSidebarProfile(name, email);
  alert('Profile updated successfully!');
}

/**
 * Saves notification toggle state changes
 */
function saveToggles() {
  localStorage.setItem('freshCheck_optExpiryAlerts', document.getElementById('toggleExpiryAlerts').checked);
  localStorage.setItem('freshCheck_optTempAlerts', document.getElementById('toggleTempAlerts').checked);
  localStorage.setItem('freshCheck_optWeeklySummary', document.getElementById('toggleWeeklySummary').checked);
}

/**
 * Saves app preferences (units and default view)
 */
function saveAppPreferences() {
  localStorage.setItem('freshCheck_tempUnit', document.getElementById('tempUnit').value);
  localStorage.setItem('freshCheck_defaultPage', document.getElementById('defaultPage').value);
}

/**
 * Clears local application state
 */
function resetAppData() {
  if (confirm('Are you sure you want to reset all app data and settings? This action cannot be undone.')) {
    localStorage.clear();
    alert('App data reset successfully!');
    location.reload();
  }
}