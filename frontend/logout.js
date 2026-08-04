/**
 * FreshCheck - Logout Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  displayUserName();

  const logoutBtn = document.getElementById('confirmLogoutBtn');
  logoutBtn.addEventListener('click', performLogout);
});

/**
 * Displays active username on screen if present
 */
function displayUserName() {
  const name = localStorage.getItem('freshCheck_userName');
  if (name) {
    document.getElementById('userDisplay').innerText = name;
  }
}

/**
 * Clears user session markers and redirects to login page
 */
function performLogout() {
  const card = document.getElementById('logoutCard');

  // Provide UI feedback during process
  card.innerHTML = `
    <div class="logout-icon" style="background: rgba(34, 197, 94, 0.15); border-color: rgba(34, 197, 94, 0.3); color: #22c55e;">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
    </div>
    <h2 class="card-title">Signing Out...</h2>
    <p class="card-subtitle">Clearing your session securely. Please wait a moment.</p>
  `;

  // Clear session keys
  localStorage.removeItem('freshCheck_isLoggedIn');
  localStorage.removeItem('freshCheck_authToken');

  // Smooth redirect delay
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1200);
}