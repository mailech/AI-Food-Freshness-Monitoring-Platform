import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import RetailSidebar from "../components/RetailSidebar";
import { FaLeaf } from "react-icons/fa";

function RetailManagerLayout() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (role !== "Retail Manager") {
      return;
    }

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");

        const response = await fetch(
          "http://127.0.0.1:8000/auth/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error("Profile loading error:", error);
      }
    };

    fetchProfile();
  }, [role]);

  useEffect(() => {
    if (role !== "Retail Manager") {
      return;
    }

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("access_token");

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

            const expiry = new Date(item.expiry_date);
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
          "Notification loading error:",
          error
        );
      }
    };

    fetchNotifications();
  }, [role]);

  if (role !== "Retail Manager") {
    return <Outlet />;
  }

  const profileName =
    profile?.name ||
    profile?.username ||
    profile?.full_name ||
    profile?.email?.split("@")[0] ||
    "User";

  return (
    <div className="retail-manager-layout">

      {/* TOP HEADER */}

      <header className="retail-topbar">

        <div className="retail-topbar-brand">
          <span className="retail-leaf-icon">
            <FaLeaf />
          </span>

          <span>
            Food Freshness Monitoring
          </span>
        </div>

        <div className="retail-topbar-right">

          {/* NOTIFICATION */}

          <div className="retail-notification-wrapper">

            <button
              className="retail-notification"
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
                <span className="notification-badge">
                  {notifications.length}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="retail-notification-dropdown">

                <div className="retail-notification-header">
                  <div>
                    <strong>
                      Notifications
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

                  <div className="retail-no-notifications">
                    <div>✅</div>

                    <strong>
                      No new alerts
                    </strong>

                    <p>
                      Your inventory currently
                      has no expiry warnings.
                    </p>
                  </div>

                ) : (

                  <div className="retail-notification-list">

                    {notifications.map(
                      (notification, index) => (
                        <div
                          className={`retail-notification-item ${notification.type}`}
                          key={index}
                        >
                          <div className="retail-notification-item-icon">
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

          <div className="retail-profile-wrapper">

            <button
              className="retail-profile"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationOpen(false);
              }}
              aria-label="Profile"
            >

              <div className="retail-profile-icon">
                👤
              </div>

              <div className="retail-profile-info">
                <strong>
                  {profileName}
                </strong>

                <span>
                  Retail Manager
                </span>
              </div>

              <span className="retail-profile-arrow">
                {profileOpen ? "⌃" : "⌄"}
              </span>

            </button>

            {profileOpen && (
              <div className="retail-profile-dropdown">

                <div className="retail-profile-top">

                  <div className="retail-profile-large-icon">
                    👤
                  </div>

                  <div>
                    <strong>
                      {profileName}
                    </strong>

                    <span>
                      Retail Manager
                    </span>
                  </div>

                </div>

                <div className="retail-profile-divider"></div>

                <div className="retail-profile-detail">
                  <span>Email</span>

                  <strong>
                    {profile?.email ||
                      "Email not available"}
                  </strong>
                </div>

                <button
                  className="retail-view-profile-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate("/profile");
                  }}
                >
                  View Profile
                </button>

              </div>
            )}

          </div>

        </div>

      </header>

      {/* MAIN */}

      <div className="retail-main-area">

        <RetailSidebar />

        <main className="retail-manager-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default RetailManagerLayout;