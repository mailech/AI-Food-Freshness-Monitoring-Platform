import React, { useState } from "react";
import "./Settings.css";

function Settings({ onBack }) {
  const [activeSection, setActiveSection] = useState("profile");

  const [profile, setProfile] = useState({
    name: "Food Manager",
    email: "manager@example.com",
    phone: "+91 98765 43210",
    organization: "Fresh Food Management",
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    spoilageAlerts: true,
    dailyReport: true,
    recommendations: true,
  });

  const [preferences, setPreferences] = useState({
    temperatureUnit: "Celsius",
    dateFormat: "DD/MM/YYYY",
    defaultShelfLife: "7",
  });

  const [saved, setSaved] = useState(false);

  const handleProfileChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = () => {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const toggleNotification = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key],
    });
  };

  const sections = [
    {
      id: "profile",
      icon: "👤",
      title: "Profile",
      description: "Manage your account information",
    },
    {
      id: "notifications",
      icon: "🔔",
      title: "Notifications",
      description: "Control alerts and notifications",
    },
    {
      id: "preferences",
      icon: "⚙️",
      title: "Preferences",
      description: "Customize platform settings",
    },
    {
      id: "security",
      icon: "🔐",
      title: "Security",
      description: "Manage password and security",
    },
    {
      id: "about",
      icon: "ℹ️",
      title: "About",
      description: "Platform information",
    },
  ];

  return (
    <div className="settings-page">

      {/* Header */}
      <div className="settings-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account and platform preferences</p>
        </div>

        {onBack && (
          <button className="settings-back-btn" onClick={onBack}>
            ← Back
          </button>
        )}
      </div>

      <div className="settings-layout">

        {/* Sidebar */}
        <div className="settings-sidebar">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`settings-menu-item ${
                activeSection === section.id ? "active" : ""
              }`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="settings-menu-icon">
                {section.icon}
              </span>

              <span className="settings-menu-text">
                <strong>{section.title}</strong>
                <small>{section.description}</small>
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings-content">

          {/* PROFILE */}
          {activeSection === "profile" && (
            <div className="settings-card">

              <div className="settings-card-header">
                <div>
                  <h2>Profile Information</h2>
                  <p>Update your personal and organization details.</p>
                </div>
              </div>

              <div className="profile-avatar">
                <div className="avatar-circle">FM</div>

                <div>
                  <h3>{profile.name}</h3>
                  <p>Food Manager</p>
                </div>
              </div>

              <div className="settings-form">

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={profile.phone}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="form-group">
                  <label>Organization</label>
                  <input
                    type="text"
                    name="organization"
                    value={profile.organization}
                    onChange={handleProfileChange}
                  />
                </div>

              </div>

              <div className="settings-actions">
                <button
                  className="save-settings-btn"
                  onClick={handleSave}
                >
                  Save Changes
                </button>
              </div>

            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === "notifications" && (
            <div className="settings-card">

              <div className="settings-card-header">
                <div>
                  <h2>Notification Settings</h2>
                  <p>Choose which notifications you want to receive.</p>
                </div>
              </div>

              <div className="notification-list">

                <div className="notification-item">
                  <div>
                    <h3>📧 Email Notifications</h3>
                    <p>Receive important platform updates through email.</p>
                  </div>

                  <button
                    className={`toggle ${
                      notifications.emailAlerts ? "on" : ""
                    }`}
                    onClick={() =>
                      toggleNotification("emailAlerts")
                    }
                  >
                    <span></span>
                  </button>
                </div>

                <div className="notification-item">
                  <div>
                    <h3>🚨 Spoilage Alerts</h3>
                    <p>
                      Get notified when food is close to spoilage.
                    </p>
                  </div>

                  <button
                    className={`toggle ${
                      notifications.spoilageAlerts ? "on" : ""
                    }`}
                    onClick={() =>
                      toggleNotification("spoilageAlerts")
                    }
                  >
                    <span></span>
                  </button>
                </div>

                <div className="notification-item">
                  <div>
                    <h3>📊 Daily Reports</h3>
                    <p>
                      Receive a daily summary of your food inventory.
                    </p>
                  </div>

                  <button
                    className={`toggle ${
                      notifications.dailyReport ? "on" : ""
                    }`}
                    onClick={() =>
                      toggleNotification("dailyReport")
                    }
                  >
                    <span></span>
                  </button>
                </div>

                <div className="notification-item">
                  <div>
                    <h3>💡 Recommendations</h3>
                    <p>
                      Receive smart recommendations to reduce food waste.
                    </p>
                  </div>

                  <button
                    className={`toggle ${
                      notifications.recommendations ? "on" : ""
                    }`}
                    onClick={() =>
                      toggleNotification("recommendations")
                    }
                  >
                    <span></span>
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* PREFERENCES */}
          {activeSection === "preferences" && (
            <div className="settings-card">

              <div className="settings-card-header">
                <div>
                  <h2>Platform Preferences</h2>
                  <p>Customize how information is displayed.</p>
                </div>
              </div>

              <div className="settings-form">

                <div className="form-group">
                  <label>Temperature Unit</label>

                  <select
                    value={preferences.temperatureUnit}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        temperatureUnit: e.target.value,
                      })
                    }
                  >
                    <option>Celsius</option>
                    <option>Fahrenheit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Date Format</label>

                  <select
                    value={preferences.dateFormat}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        dateFormat: e.target.value,
                      })
                    }
                  >
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Default Shelf Life (Days)</label>

                  <input
                    type="number"
                    min="1"
                    value={preferences.defaultShelfLife}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        defaultShelfLife: e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              <div className="settings-actions">
                <button
                  className="save-settings-btn"
                  onClick={handleSave}
                >
                  Save Preferences
                </button>
              </div>

            </div>
          )}

          {/* SECURITY */}
          {activeSection === "security" && (
            <div className="settings-card">

              <div className="settings-card-header">
                <div>
                  <h2>Security</h2>
                  <p>Manage your password and account security.</p>
                </div>
              </div>

              <div className="security-section">

                <div className="security-item">
                  <div>
                    <h3>🔑 Change Password</h3>
                    <p>
                      Update your account password regularly.
                    </p>
                  </div>

                  <button className="secondary-settings-btn">
                    Change Password
                  </button>
                </div>

                <div className="security-item">
                  <div>
                    <h3>🛡️ Account Protection</h3>
                    <p>
                      Your account is protected with secure authentication.
                    </p>
                  </div>

                  <span className="security-status">
                    ✓ Protected
                  </span>
                </div>

                <div className="security-item">
                  <div>
                    <h3>📱 Active Sessions</h3>
                    <p>
                      Currently logged in on this device.
                    </p>
                  </div>

                  <span className="session-status">
                    Active
                  </span>
                </div>

              </div>

            </div>
          )}

          {/* ABOUT */}
          {activeSection === "about" && (
            <div className="settings-card">

              <div className="about-platform">

                <div className="about-logo">
                  🥬
                </div>

                <h2>Food Freshness Monitoring Platform</h2>

                <p className="about-description">
                  An AI-powered platform designed to monitor food
                  freshness, predict spoilage, manage inventory,
                  and reduce food waste.
                </p>

                <div className="about-version">
                  Version 1.0.0
                </div>

                <div className="about-features">

                  <div>
                    <span>🤖</span>
                    <strong>AI Freshness Detection</strong>
                  </div>

                  <div>
                    <span>📦</span>
                    <strong>Inventory Management</strong>
                  </div>

                  <div>
                    <span>🚨</span>
                    <strong>Smart Alerts</strong>
                  </div>

                  <div>
                    <span>📊</span>
                    <strong>Analytics & Reports</strong>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      </div>

      {saved && (
        <div className="save-toast">
          ✓ Settings saved successfully
        </div>
      )}

    </div>
  );
}

export default Settings;