document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();

      try {
        const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('freshcheck_token', data.token);
          localStorage.setItem('freshCheck_userName', data.user.fullname);
          localStorage.setItem('freshCheck_userContact', data.user.email);
          alert('Login Successful!');
          window.location.href = 'dashboard.html';
        } else {
          alert(data.message || 'Login failed');
        }
      } catch (err) {
        console.error('Error logging in:', err);
        alert('Server connection error. Ensure Flask is running.');
      }
    });
  }
});