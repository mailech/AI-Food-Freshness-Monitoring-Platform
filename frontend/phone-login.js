document.addEventListener('DOMContentLoaded', () => {
  const sendPhoneOtpBtn = document.getElementById('sendPhoneOtpBtn');
  const phoneLoginForm = document.getElementById('phoneLoginForm');
  const googleBtn = document.getElementById('googleLoginBtn');
  const appleBtn = document.getElementById('appleLoginBtn');
  // Request Phone OTP
  if (sendPhoneOtpBtn) {
    sendPhoneOtpBtn.addEventListener('click', async () => {
      const phone = document.getElementById('phone').value.trim();

      if (!phone) {
        alert('Please enter your phone number first.');
        return;
      }

      try {
        const response = await fetch('http://127.0.0.1:5000/api/auth/send-phone-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });

        const data = await response.json();
        alert(data.message);
      } catch (err) {
        console.error('Error requesting OTP:', err);
        alert('Server connection error. Ensure Flask is running.');
      }
    });
  }

  // Handle Form Submission
  if (phoneLoginForm) {
    phoneLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const phone = document.getElementById('phone').value.trim();
      const credential = document.getElementById('credential').value.trim();

      if (!phone || !credential) {
        alert('Please fill in all fields.');
        return;
      }

      try {
        const response = await fetch('http://127.0.0.1:5000/api/auth/login-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, credential })
        });

        const data = await response.json();

        // Inside phone-login.js under phoneLoginForm submission:
    if (response.ok) {
        alert('Login successful! Redirecting to your Profile...');
  
  // Update this line to target your profile page:
         window.location.href = 'profile.html'; 
}
    else {
  alert(data.message || 'Login failed.');
}
      } catch (err) {
        console.error('Login error:', err);
        alert('Server connection error. Ensure Flask is running.');
      }
    });
  }
if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      alert('Google Sign-In integration coming soon!');
    });
  }

  if (appleBtn) {
    appleBtn.addEventListener('click', () => {
      alert('Apple Sign-In integration coming soon!');
    });
  }
});