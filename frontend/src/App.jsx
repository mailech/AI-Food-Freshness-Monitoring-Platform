import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';

function Navbar({ token, onLogout }) {
  return (
    <nav className="border-b border-border bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-lg text-ink">
          Food Freshness Monitor
        </Link>
        <div className="flex items-center gap-6 text-sm">
          {token ? (
            <>
              <Link to="/profile" className="text-ink-muted hover:text-ink transition">Profile</Link>
              <button onClick={onLogout} className="text-ink-muted hover:text-accent transition">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-ink-muted hover:text-ink transition">Log in</Link>
              <Link to="/register" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function StatusPanel({ label, value, ok }) {
  return (
    <div className={`bg-surface border-l-4 ${ok ? 'border-primary' : 'border-accent'} border-t border-r border-b border-border rounded-r-lg p-5`}>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="font-display text-lg font-semibold text-ink mt-1">{value}</p>
    </div>
  );
}

function Home({ token }) {
  const [health, setHealth] = useState({ status: 'checking', database: 'checking' });

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'unreachable', database: 'unknown' }));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-ink max-w-2xl leading-tight">
        Reduce food waste with real-time freshness monitoring.
      </h1>
      <p className="text-ink-muted mt-4 max-w-xl">
        This dashboard will track shelf life, spoilage risk, and storage conditions across your inventory as we build out each milestone.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mt-10 max-w-xl">
        <StatusPanel
          label="API status"
          value={health.status === 'ok' ? 'Connected' : 'Unreachable'}
          ok={health.status === 'ok'}
        />
        <StatusPanel
          label="Database"
          value={health.database === 'connected' ? 'Connected' : 'Unknown'}
          ok={health.database === 'connected'}
        />
      </div>

      {!token && (
        <p className="text-ink-muted mt-10">
          <Link to="/register" className="text-primary font-medium hover:text-primary-hover">Create an account</Link> to start tracking inventory.
        </p>
      )}
    </div>
  );
}

function AppRoutes() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <Navbar token={token} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home token={token} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login onLogin={setToken} />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;