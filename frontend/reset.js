async function handleSendCode() {
  const email = document.getElementById('email').value.trim();

  if (!email) {
    alert('Please enter your email address first.');
    return;
  }

  try {
    const response = await fetch('http://127.0.0.1:5000/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    alert(data.message);
  } catch (err) {
    console.error('Error requesting code:', err);
    alert('Server connection error. Ensure Flask is running.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const resetForm = document.getElementById('resetForm');

  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const code = document.getElementById('code').value.trim();
      const newPassword = document.getElementById('new-password').value.trim();
      const confirmPassword = document.getElementById('confirm-password').value.trim();

      if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
      }

      try {
        const response = await fetch('http://127.0.0.1:5000/api/auth/verify-reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code, new_password: newPassword })
        });

        const data = await response.json();

        if (response.ok) {
          alert('Password reset successful! Redirecting to Login page...');
          window.location.href = 'signin.html.html';
        } else {
          alert(data.message || 'Failed to reset password');
        }
      } catch (err) {
        console.error('Error resetting password:', err);
        alert('Server connection error. Ensure Flask is running.');
      }
    });
  }
});