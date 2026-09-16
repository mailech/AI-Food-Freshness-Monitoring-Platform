import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import { FaLeaf } from "react-icons/fa";

function AdminLayout() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] =
    useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (role !== "Administrator") {
      return;
    }

    const fetchProfile = async () => {
      try {
        const token =
          localStorage.getItem("access_token");

        const response = await fetch(
          "http://127.0.0.1:8000/auth/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load admin profile"
          );
        }

        const data = await response.json();

        setProfile(data);
      } catch (error) {
        console.error(
          "Admin profile loading error:",
          error
        );
      }
    };

    fetchProfile();
  }, [role]);

  useEffect(() => {
    if (role !== "Administrator") {
      return;
    }

    const fetchNotifications = async () => {
      try {
        const token =
          localStorage.getItem("access_token");

        const response = await fetch(
          "http://127.0.0.1:8000/food/",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const alerts = data
          .map((item) => {
            if (!item.expiry_date) {
              return null;
            }

            const expiry =
              new Date(item.expiry_date);

            expiry.setHours(0, 0, 0, 0);

            const days = Math.ceil(
              (expiry - today) /
                (1000 * 60 * 60 * 24)
            );

            if (days < 0) {
              return {
                type: "danger",
                icon: "🚨",
                title: "Expired Product",
                message: `${item.food_name} has expired.`,
              };
            }

            if (days === 0) {
              return {
                type: "danger",
                icon: "⚠️",
                title: "Expires Today",
                message: `${item.food_name} expires today.`,
              };
            }

            if (days <= 7) {
              return {
                type: "warning",
                icon: "⏳",
                title: "Expiry Warning",
                message: `${item.food_name} expires in ${days} day${
                  days === 1 ? "" : "s"
                }.`,
              };
            }

            return null;
          })
          .filter(Boolean);

        setNotifications(alerts);
      } catch (error) {
        console.error(
          "Admin notification error:",
          error
        );
      }
    };

    fetchNotifications();
  }, [role]);

  if (role !== "Administrator") {
    return <Outlet />;
  }

  const profileName =
    profile?.name ||
    profile?.username ||
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "Admin";

  return (
    <div className="admin-layout">

      {/* TOP BAR */}

      <header className="admin-topbar">

        <div className="admin-topbar-brand">

          <span className="admin-leaf-icon">
            <FaLeaf />
          </span>

          <span>
            Food Freshness Monitoring
          </span>

        </div>

        <div className="admin-topbar-right">

          {/* NOTIFICATIONS */}

          <div className="admin-notification-wrapper">

            <button
              className="admin-notification"
              onClick={() => {
                setNotificationOpen(
                  !notificationOpen
                );

                setProfileOpen(false);
              }}
              aria-label="Notifications"
            >
              🔔

              {notifications.length > 0 && (
                <span className="admin-notification-badge">
                  {notifications.length}
                </span>
              )}

            </button>

            {notificationOpen && (
              <div className="admin-notification-dropdown">

                <div className="admin-notification-header">

                  <div>
                    <strong>
                      System Notifications
                    </strong>

                    <span>
                      {notifications.length} alert
                      {notifications.length === 1
                        ? ""
                        : "s"}
                    </span>
                  </div>

                </div>

                {notifications.length === 0 ? (

                  <div className="admin-no-notifications">

                    <div>✅</div>

                    <strong>
                      No New Alerts
                    </strong>

                    <p>
                      The platform currently has
                      no inventory expiry alerts.
                    </p>

                  </div>

                ) : (

                  <div className="admin-notification-list">

                    {notifications.map(
                      (notification, index) => (
                        <div
                          className={`admin-notification-item ${notification.type}`}
                          key={index}
                        >

                          <div className="admin-notification-item-icon">
                            {notification.icon}
                          </div>

                          <div>

                            <strong>
                              {notification.title}
                            </strong>

                            <p>
                              {notification.message}
                            </p>

                          </div>

                        </div>
                      )
                    )}

                  </div>

                )}

              </div>
            )}

          </div>

          {/* PROFILE */}

          <div className="admin-profile-wrapper">

            <button
              className="admin-profile"
              onClick={() => {
                setProfileOpen(!profileOpen);

                setNotificationOpen(false);
              }}
              aria-label="Admin Profile"
            >

              <div className="admin-profile-icon">
                👤
              </div>

              <div className="admin-profile-info">

                <strong>
                  {profileName}
                </strong>

                <span>
                  Administrator
                </span>

              </div>

              <span className="admin-profile-arrow">
                {profileOpen ? "⌃" : "⌄"}
              </span>

            </button>

            {profileOpen && (
              <div className="admin-profile-dropdown">

                <div className="admin-profile-top">

                  <div className="admin-profile-large-icon">
                    👤
                  </div>

                  <div>

                    <strong>
                      {profileName}
                    </strong>

                    <span>
                      Administrator
                    </span>

                  </div>

                </div>

                <div className="admin-profile-divider"></div>

                <div className="admin-profile-detail">

                  <span>
                    Email
                  </span>

                  <strong>
                    {profile?.email ||
                      "Email not available"}
                  </strong>

                </div>

                <button
                  className="admin-view-profile-btn"
                  onClick={(event) => {
                    event.stopPropagation();

                    navigate("/admin/profile");
                  }}
                >
                  View Profile
                </button>

              </div>
            )}

          </div>

        </div>

      </header>

      {/* MAIN AREA */}

      <div className="admin-main-area">

        <AdminSidebar />

        <main className="admin-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default AdminLayout;