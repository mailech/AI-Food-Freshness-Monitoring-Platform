document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullname = document.getElementById('fullname').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      const role = document.getElementById('role').value;
      try {
        const response = await fetch('http://127.0.0.1:5000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullname, email, password,role })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('freshCheck_userName', data.user.fullname);
            localStorage.setItem('freshCheck_userContact', data.user.email);
            localStorage.setItem('freshCheck_userRole', data.user.role);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('freshCheck_createdAt', data.user.created_at);

            alert('Account created successfully!');

            window.location.href = 'Dashboard.html';
          }

        else {
          alert(data.message || 'Registration failed');
        }
      } catch (err) {
        console.error('Error during registration:', err);
        alert('Server connection error. Ensure Flask is running.');
      }
    });
  }
});