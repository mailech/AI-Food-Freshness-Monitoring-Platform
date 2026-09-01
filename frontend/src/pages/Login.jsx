import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function FreshnessArc() {
  return (
    <svg viewBox="0 0 200 120" className="w-40 h-24">
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke="#3E8A63"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M 20 100 A 80 80 0 0 1 140 32"
        fill="none"
        stroke="#F7F8F5"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="140" cy="32" r="7" fill="#F7F8F5" />
    </svg>
  );
}

function Login({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Login failed');
      }
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      if (onLogin) onLogin(data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Branding panel */}
      <div className="hidden md:flex md:w-2/5 bg-primary flex-col justify-between p-12 text-base">
        <div>
          <p className="font-display font-bold text-xl">Food Freshness Monitor</p>
        </div>
        <div>
          <FreshnessArc />
          <p className="font-display text-2xl font-semibold mt-6 leading-snug">
            Know what's fresh, before it isn't.
          </p>
          <p className="text-base/80 mt-3 max-w-xs opacity-80">
            Track shelf life, spoilage risk, and storage conditions across your inventory in one place.
          </p>
        </div>
        <p className="text-sm opacity-60">Milestone 1 — Authentication</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-bold text-ink mb-1">Welcome back</h1>
          <p className="text-ink-muted mb-8">Log in to your account to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-accent border-l-2 border-accent pl-3 py-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="text-sm text-ink-muted mt-6">
            Don't have an account? <Link to="/register" className="text-primary font-medium hover:text-primary-hover">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;