import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetch('http://localhost:8000/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session expired or invalid');
        return res.json();
      })
      .then(setUser)
      .catch((err) => {
        setError(err.message);
        localStorage.removeItem('token');
        setTimeout(() => navigate('/login'), 1500);
      });
  }, [navigate]);

  if (error) {
    return <p className="max-w-5xl mx-auto px-6 py-16 text-accent">{error} — redirecting to login...</p>;
  }
  if (!user) {
    return <p className="max-w-5xl mx-auto px-6 py-16 text-ink-muted">Loading profile...</p>;
  }

  const fields = [
    { label: 'Full name', value: user.full_name },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role.replace('_', ' ') },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-ink mb-8">My profile</h1>
      <div className="bg-surface border border-border rounded-xl divide-y divide-border max-w-md">
        {fields.map((f) => (
          <div key={f.label} className="px-5 py-4 flex justify-between items-center">
            <span className="text-sm text-ink-muted">{f.label}</span>
            <span className="text-ink font-medium capitalize">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Profile;