import { useState } from "react";
import "./Profile.css";

function Profile({
  onHome,
  onDashboard,
  onInventory,
  onAddFood,
  onAnalyze,
  onShelfLife,
  onAlerts,
  onRecommendations,
  onAnalytics,
  onProfile,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setEditing(false);
    alert("Profile updated successfully.");
  };

  return (
    <div className="profile-page">
      <aside className="profile-sidebar">
        <div className="profile-logo-section">
          <div className="profile-logo">🍎</div>

          <div>
            <h2>FreshGuard AI</h2>
            <p>Food Monitoring</p>
          </div>
        </div>

        <nav className="profile-nav">
          <button onClick={onDashboard}>
            <span>📊</span>
            Dashboard
          </button>

          <button onClick={onInventory}>
            <span>📦</span>
            Food Inventory
          </button>

          <button onClick={onAnalyze}>
            <span>📷</span>
            Analyze Food
          </button>

          <button onClick={onShelfLife}>
            <span>⏰</span>
            Shelf Life
          </button>

          <button onClick={onAlerts}>
            <span>🚨</span>
            Alerts
          </button>

          <button onClick={onRecommendations}>
            <span>💡</span>
            Recommendations
          </button>

          <button onClick={onAnalytics}>
            <span>📈</span>
            Analytics
          </button>

          <button className="active" onClick={onProfile}>
            <span>👤</span>
            Profile
          </button>
        </nav>

        <div className="profile-sidebar-bottom">
          <button onClick={onHome}>
            🏠 Back to Home
          </button>
        </div>
      </aside>

      <main className="profile-main">
        <header className="profile-header">
          <div>
            <p className="profile-label">ACCOUNT SETTINGS</p>

            <h1>Profile</h1>

            <p>
              Manage your FreshGuard AI account information.
            </p>
          </div>
        </header>

        <section className="profile-content">
          <div className="profile-card profile-user-card">
            <div className="profile-avatar">
              {name
                ? name.charAt(0).toUpperCase()
                : "👤"}
            </div>

            <h2>{name || "Your Name"}</h2>

            <p>
              {email || "your@email.com"}
            </p>

            <span className="profile-member-badge">
              FreshGuard AI User
            </span>
          </div>

          <div className="profile-card profile-details-card">
            <div className="profile-card-header">
              <div>
                <h2>Personal Information</h2>

                <p>
                  Update your basic account information.
                </p>
              </div>

              {!editing && (
                <button
                  className="profile-edit-btn"
                  onClick={() => setEditing(true)}
                >
                  ✏ Edit Profile
                </button>
              )}
            </div>

            <form onSubmit={handleSave}>
              <div className="profile-form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  disabled={!editing}
                  required
                />
              </div>

              <div className="profile-form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  disabled={!editing}
                  required
                />
              </div>

              {editing && (
                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="profile-cancel-btn"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="profile-save-btn"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>
        </section>

        <section className="profile-security-card">
          <div className="profile-security-icon">
            🔐
          </div>

          <div>
            <h3>Account Security</h3>

            <p>
              Your account information and food monitoring
              data will be securely managed when the backend
              authentication system is connected.
            </p>
          </div>
        </section>

        <section className="profile-info-grid">
          <div className="profile-info-box">
            <span>🤖</span>
            <div>
              <h3>AI Monitoring</h3>
              <p>
                Your food analysis results are used to
                provide freshness insights.
              </p>
            </div>
          </div>

          <div className="profile-info-box">
            <span>📊</span>
            <div>
              <h3>Personal Analytics</h3>
              <p>
                Monitor your food freshness activity from
                the Analytics section.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Profile;