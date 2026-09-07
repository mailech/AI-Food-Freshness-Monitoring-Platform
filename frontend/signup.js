document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullname = document.getElementById('fullname').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();

      try {
        const response = await fetch('http://127.0.0.1:5000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullname, email, password })
        });

        const data = await response.json();

        if (response.ok) {
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