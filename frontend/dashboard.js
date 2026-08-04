/**
 * FreshCheck - Dashboard Dynamic Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize user data and view on load
  initDashboard();

  // Attach event listeners to demo toggle buttons
  const btnNewUser = document.getElementById('btnNewUser');
  const btnExistingUser = document.getElementById('btnExistingUser');

  if (btnNewUser) {
    btnNewUser.addEventListener('click', setNewUserState);
  }

  if (btnExistingUser) {
    btnExistingUser.addEventListener('click', setExistingUserState);
  }
});

/**
 * Reads user data from localStorage and renders the correct view
 */
function initDashboard() {
  // Fetch details saved during Login or Sign Up
  const name = localStorage.getItem('freshCheck_userName') || 'User Name';
  const contact = localStorage.getItem('freshCheck_userContact') || 'User.@example.com';
  const isNewUser = localStorage.getItem('freshCheck_isNewUser') === 'true';

  // Update UI with user information
  updateUserProfile(name, contact);

  // Render view based on history state
  if (isNewUser) {
    renderNewUserView();
  } else {
    renderExistingUserView();
  }
}

/**
 * Updates sidebar profile details and welcome messages dynamically
 */
function updateUserProfile(name, contact) {
  const userNameElem = document.getElementById('userName');
  const userContactElem = document.getElementById('userContact');
  const welcomeNameElem = document.getElementById('welcomeName');
  const avatarElem = document.getElementById('userAvatar');

  if (userNameElem) userNameElem.innerText = name;
  if (userContactElem) userContactElem.innerText = contact;

  // Extract First Name for Welcome Title
  const firstName = name.trim().split(' ')[0] || 'User';
  if (welcomeNameElem) welcomeNameElem.innerText = firstName;

  // Calculate initials for Avatar
  if (avatarElem) {
    const nameParts = name.trim().split(' ');
    const initials = nameParts.length > 1 
      ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
      : nameParts[0][0].toUpperCase();
    avatarElem.innerText = initials;
  }
}

/**
 * Renders the Blank / Empty State for New Users
 */
function renderNewUserView() {
  const welcomeSubtext = document.getElementById('welcomeSubtext');
  const statsGrid = document.getElementById('statsGrid');
  const existingUserView = document.getElementById('existingUserView');
  const newUserView = document.getElementById('newUserView');

  if (welcomeSubtext) {
    welcomeSubtext.innerText = 'Here is your fresh start! Begin by adding your first food item below.';
  }

  // Hide Stats & Inventory Table, Show Empty Screen
  if (statsGrid) statsGrid.classList.add('hidden');
  if (existingUserView) existingUserView.classList.add('hidden');
  if (newUserView) newUserView.classList.remove('hidden');
}

/**
 * Renders the Populated Inventory & Metrics for Existing Users
 */
function renderExistingUserView() {
  const welcomeSubtext = document.getElementById('welcomeSubtext');
  const statsGrid = document.getElementById('statsGrid');
  const existingUserView = document.getElementById('existingUserView');
  const newUserView = document.getElementById('newUserView');

  if (welcomeSubtext) {
    welcomeSubtext.innerText = 'Here is your active food freshness overview for today.';
  }

  // Update Metrics Count
  const freshCount = document.getElementById('freshCount');
  const warningCount = document.getElementById('warningCount');
  const spoiledCount = document.getElementById('spoiledCount');

  if (freshCount) freshCount.innerText = '14';
  if (warningCount) warningCount.innerText = '3';
  if (spoiledCount) spoiledCount.innerText = '1';

  // Show Stats & Inventory Table, Hide Empty Screen
  if (statsGrid) statsGrid.classList.remove('hidden');
  if (existingUserView) existingUserView.classList.remove('hidden');
  if (newUserView) newUserView.classList.add('hidden');
}

/**
 * Sets state to "New User" and re-renders UI
 */
function setNewUserState() {
  localStorage.setItem('freshCheck_isNewUser', 'true');
  renderNewUserView();
}

/**
 * Sets state to "Existing User" and re-renders UI
 */
function setExistingUserState() {
  localStorage.setItem('freshCheck_isNewUser', 'false');
  renderExistingUserView();
}