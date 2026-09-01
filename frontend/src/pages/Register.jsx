import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const ROLES = [
  { value: 'consumer', label: 'Consumer' },
  { value: 'retail_manager', label: 'Retail Manager' },
  { value: 'warehouse_operator', label: 'Warehouse Operator' },
  { value: 'food_quality_inspector', label: 'Food Quality Inspector' },
];

function Register() {
  const [formData, setFormData] = useState({
    email: '', password: '', full_name: '', role: 'consumer',
  });
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
      const res = await fetch('http://localhost:8000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Registration failed');
      }
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex md:w-2/5 bg-primary flex-col justify-between p-12 text-base">
        <p className="font-display font-bold text-xl">Food Freshness Monitor</p>
        <div>
          <p className="font-display text-2xl font-semibold leading-snug">
            One account, every role.
          </p>
          <p className="text-base/80 mt-3 max-w-xs opacity-80">
            Whether you're managing a retail shelf or a warehouse cold-chain, your dashboard adapts to your role.
          </p>
        </div>
        <p className="text-sm opacity-60">Milestone 1 — Authentication</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-3xl font-bold text-ink mb-1">Create your account</h1>
          <p className="text-ink-muted mb-8">Start monitoring freshness in minutes.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Full name</label>
              <input
                name="full_name"
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                placeholder="Jordan Rivera"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
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
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Role</label>
              <select
                name="role"
                onChange={handleChange}
                value={formData.role}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-accent border-l-2 border-accent pl-3 py-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-ink-muted mt-6">
            Already have an account? <Link to="/login" className="text-primary font-medium hover:text-primary-hover">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;