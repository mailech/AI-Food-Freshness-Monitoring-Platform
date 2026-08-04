/**
 * Fresh Monitor - Login Handler & Session Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberCheckbox = document.querySelector('.remember-me input[type="checkbox"]');

  // 1. Auto-fill saved email if "Remember me" was previously checked
  const savedEmail = localStorage.getItem('freshmonitor_remembered_email');
  if (savedEmail) {
    emailInput.value = savedEmail;
    rememberCheckbox.checked = true;
  }

  // 2. Handle Login Form Submission
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent standard browser form reload

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Basic Validation
    if (!email || !password) {
      alert('Please fill in both email and password.');
      return;
    }

    // Handle "Remember Me" checkbox logic
    if (rememberCheckbox.checked) {
      localStorage.setItem('freshmonitor_remembered_email', email);
    } else {
      localStorage.removeItem('freshmonitor_remembered_email');
    }

    // Create session data (Extract username from email for display)
    const userName = email.split('@')[0];
    const userSession = {
      email: email,
      name: userName.charAt(0).toUpperCase() + userName.slice(1),
      loggedIn: true,
      loginTime: new Date().toISOString()
    };

    // Save active user session to localStorage
    localStorage.setItem('freshcheck_user', JSON.stringify(userSession));

    // UI Feedback: Change button state during redirect
    const submitBtn = loginForm.querySelector('.btn-submit');
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;
    submitBtn.style.opacity = '0.8';
    submitBtn.disabled = true;
document.addEventListener('DOMContentLoaded', () => {
  const googleBtn = document.getElementById('googleLoginBtn');
  const appleBtn = document.getElementById('appleLoginBtn');

  // --- GOOGLE AUTHENTICATION ---
  googleBtn.addEventListener('click', () => {
    // OPTION A: Frontend Demo Session Simulation
    const userSession = {
      name: "Google User",
      email: "user@gmail.com",
      provider: "google",
      loggedIn: true
    };
    localStorage.setItem('freshcheck_user', JSON.stringify(userSession));
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';

    /* 
    // OPTION B: Production OAuth 2.0 Redirect (Uncomment when live backend is ready)
    // Replace with your Google OAuth Client ID & Backend Endpoint
    const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
    const REDIRECT_URI = "http://localhost:5500/dashboard.html";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=email%20profile`;
    window.location.href = authUrl;
    */
  });

  // --- APPLE AUTHENTICATION ---
  appleBtn.addEventListener('click', () => {
    // OPTION A: Frontend Demo Session Simulation
    const userSession = {
      name: "Apple User",
      email: "user@privaterelay.appleid.com",
      provider: "apple",
      loggedIn: true
    };
    localStorage.setItem('freshcheck_user', JSON.stringify(userSession));

    // Redirect to dashboard
    window.location.href = 'dashboard.html';

    /*
    // OPTION B: Production Sign in with Apple Redirect
    const APPLE_CLIENT_ID = "com.yourdomain.freshcheck.client";
    const REDIRECT_URI = "https://yourdomain.com/api/auth/apple/callback";
    const appleAuthUrl = `https://appleid.apple.com/auth/authorize?client_id=${APPLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code%20id_token&response_mode=form_post&scope=name%20email`;
    window.location.href = appleAuthUrl;
    */
  });
});
    // Redirect to the dashboard after a short delay
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
  });
});