import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import ConsumerSidebar from "../components/ConsumerSidebar";
import { FaLeaf } from "react-icons/fa";

function ConsumerLayout() {

  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);

  const [profile, setProfile] = useState(null);

  const [notificationOpen, setNotificationOpen] = useState(false);

  const [foodNotifications, setFoodNotifications] = useState([]);


  // ================= FETCH USER PROFILE =================

  useEffect(() => {

    const fetchProfile = async () => {

      const token = localStorage.getItem("access_token");

      if (!token) {
        return;
      }

      try {

        const response = await fetch(
          "http://127.0.0.1:8000/auth/profile",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();

        setProfile(data);

      } catch (error) {

        console.error(
          "Profile error:",
          error
        );

      }
    };

    fetchProfile();

  }, [notificationOpen]);


  // ================= FETCH FOOD NOTIFICATIONS =================

  useEffect(() => {

    const fetchFoodNotifications = async () => {

      const token = localStorage.getItem("access_token");

      if (!token) {
        return;
      }

      try {

        const response = await fetch(
          "http://127.0.0.1:8000/food/",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch food inventory");
        }

        const data = await response.json();

        const today = new Date();

        today.setHours(0, 0, 0, 0);


        // Find expired and expiring-soon food items

        const notifications = data
          .map((item) => {

            if (!item.expiry_date) {
              return null;
            }

            const expiryDate = new Date(item.expiry_date);

            expiryDate.setHours(0, 0, 0, 0);


            const difference =
              (expiryDate - today) /
              (1000 * 60 * 60 * 24);


            // Expired

            if (difference < 0) {

              return {
                ...item,
                notificationType: "expired",
                message: "This food item has expired.",
                daysRemaining: Math.floor(difference),
              };

            }


            // Expiring within 7 days

            if (difference <= 7) {

              return {
                ...item,
                notificationType: "warning",
                message:
                  difference === 0
                    ? "This food item expires today."
                    : `Expires in ${Math.ceil(difference)} day${
                        Math.ceil(difference) > 1
                          ? "s"
                          : ""
                      }.`,
                daysRemaining: Math.ceil(difference),
              };

            }

            return null;

          })
          .filter((item) => item !== null);


        setFoodNotifications(notifications);

      } catch (error) {

        console.error(
          "Notification error:",
          error
        );

      }

    };

    fetchFoodNotifications();

  }, []);


  // ================= NOTIFICATION CLICK =================

  const handleNotificationClick = () => {

    setNotificationOpen(!notificationOpen);

    setProfileOpen(false);

  };


  // ================= VIEW ALL NOTIFICATIONS =================

  const handleViewAllNotifications = () => {

    setNotificationOpen(false);

    navigate("/alerts");

  };


  // ================= LOGOUT =================

  const handleLogout = () => {

    localStorage.removeItem("access_token");

    localStorage.removeItem("role");

    localStorage.removeItem("latest_prediction");

    navigate("/login");

  };


  return (

    <div className="consumer-layout">


      {/* =================================================
          TOP BAR
      ================================================= */}

      <header className="consumer-topbar">


        {/* ================= LOGO ================= */}

        <div className="consumer-topbar-brand">

          <span className="consumer-leaf-icon">

            <FaLeaf />

          </span>

          <span>
            Food Freshness Monitoring
          </span>

        </div>


        {/* ================= TOP RIGHT ================= */}

        <div className="consumer-topbar-right">


          {/* =================================================
              NOTIFICATION BUTTON
          ================================================= */}

          <div className="consumer-notification-wrapper">

            <button
              className="consumer-notification"
              onClick={handleNotificationClick}
              title="Notifications"
            >

              🔔

              {foodNotifications.length > 0 && (

                <span className="notification-badge">

                  {foodNotifications.length}

                </span>

              )}

            </button>


            {/* =================================================
                NOTIFICATION POPUP
            ================================================= */}

            {notificationOpen && (

              <div className="consumer-notification-popup">


                {/* ================= HEADER ================= */}

                <div className="notification-popup-header">

                  <div>

                    <h3>
                      🔔 Notifications
                    </h3>

                    <p>
                      Food items that need your attention
                    </p>

                  </div>

                </div>


                {/* ================= NOTIFICATIONS ================= */}

                <div className="notification-popup-body">

                  {foodNotifications.length === 0 ? (

                    <div className="no-food-notifications">

                      <div className="no-notification-icon">
                        ✅
                      </div>

                      <h4>
                        No Food Alerts
                      </h4>

                      <p>
                        All your food items are currently
                        within their safe expiry period.
                      </p>

                    </div>

                  ) : (

                    foodNotifications.map(
                      (item, index) => (

                        <div
                          className={
                            item.notificationType === "expired"
                              ? "food-notification-item expired-notification"
                              : "food-notification-item warning-notification"
                          }
                          key={
                            item.food_id || index
                          }
                        >


                          {/* ICON */}

                          <div className="food-notification-icon">

                            {item.notificationType ===
                            "expired"
                              ? "🔴"
                              : "🟠"}

                          </div>


                          {/* CONTENT */}

                          <div className="food-notification-content">

                            <strong>
                              {item.food_name || "Food Item"}
                            </strong>

                            <span>
                              {item.notificationType ===
                              "expired"
                                ? "Expired"
                                : "Expiring Soon"}
                            </span>

                            <p>
                              {item.message}
                            </p>

                          </div>

                        </div>

                      )
                    )

                  )}

                </div>


                {/* ================= FOOTER ================= */}

                {foodNotifications.length > 0 && (

                  <div className="notification-popup-footer">

                    <button
                      onClick={
                        handleViewAllNotifications
                      }
                    >
                      View All Notifications →
                    </button>

                  </div>

                )}

              </div>

            )}

          </div>


          {/* =================================================
              PROFILE SECTION
          ================================================= */}

          <div className="consumer-profile-wrapper">


            {/* ================= PROFILE BUTTON ================= */}

            <button
              className="consumer-top-profile"
              onClick={() => {

                setProfileOpen(!profileOpen);

                setNotificationOpen(false);

              }}
            >

              <div className="consumer-profile-icon">
                👤
              </div>


              <span>
                {profile?.name || "Consumer"}
              </span>


              <span className="profile-arrow">

                {profileOpen
                  ? "⌃"
                  : "⌄"}

              </span>

            </button>


            {/* =================================================
                PROFILE DROPDOWN
            ================================================= */}

            {profileOpen && (

              <div className="consumer-profile-dropdown">


                {/* ================= USER INFORMATION ================= */}

                <div className="consumer-dropdown-header">


                  <div className="consumer-dropdown-icon">
                    👤
                  </div>


                  <div>

                    <strong>
                      {profile?.name || "Consumer"}
                    </strong>


                    <span>
                      {profile?.email ||
                        "Email not available"}
                    </span>

                  </div>

                </div>


                <div className="consumer-dropdown-divider" />


                {/* ================= PROFILE ================= */}

                <button
                  className="consumer-dropdown-item"
                  onClick={() => {

                    setProfileOpen(false);

                    navigate("/profile");

                  }}
                >

                  👤

                  <span>
                    Profile
                  </span>

                </button>


                {/* ================= NOTIFICATIONS ================= */}

                <button
                  className="consumer-dropdown-item"
                  onClick={() => {

                    setProfileOpen(false);

                    navigate("/alerts");

                  }}
                >

                  🔔

                  <span>
                    Notifications
                  </span>

                </button>


                <div className="consumer-dropdown-divider" />


                {/* ================= LOGOUT ================= */}

                <button
                  className="consumer-dropdown-item consumer-dropdown-logout"
                  onClick={handleLogout}
                >

                  ↪

                  <span>
                    Logout
                  </span>

                </button>


              </div>

            )}

          </div>

        </div>

      </header>


      {/* =================================================
          MAIN AREA
      ================================================= */}

      <div className="consumer-main-area">


        {/* ================= SIDEBAR ================= */}

        <ConsumerSidebar />


        {/* ================= PAGE CONTENT ================= */}

        <main className="consumer-content">

          <Outlet />

        </main>

      </div>

    </div>

  );

}

export default ConsumerLayout;