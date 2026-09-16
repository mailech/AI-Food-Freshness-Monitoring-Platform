import { NavLink, useNavigate } from "react-router-dom";

function AdminSidebar() {
  const navigate = useNavigate();

  const menuItems = [
    {
      name: "Dashboard",
      icon: "⌂",
      path: "/admin-dashboard",
    },
    {
      name: "User Management",
      icon: "👥",
      path: "/admin/users",
    },
    {
      name: "Food Inventory",
      icon: "📦",
      path: "/admin/inventory",
    },
    {
      name: "Freshness Monitoring",
      icon: "🍎",
      path: "/admin/freshness",
    },
    {
      name: "Shelf Life",
      icon: "◷",
      path: "/admin/shelf-life",
    },
    {
      name: "Storage Monitoring",
      icon: "🌡️",
      path: "/admin/storage",
    },
    {
      name: "Alerts",
      icon: "🔔",
      path: "/admin/alerts",
    },
    {
      name: "Reports",
      icon: "▤",
      path: "/admin/reports",
    },
    {
      name: "System Status",
      icon: "⚙",
      path: "/admin/system-status",
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("latest_prediction");

    navigate("/login");
  };

  return (
    <aside className="admin-sidebar">

      <div className="admin-sidebar-role">
        ADMINISTRATOR
      </div>

      <nav className="admin-sidebar-menu">

        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `admin-sidebar-link ${
                isActive
                  ? "admin-sidebar-link-active"
                  : ""
              }`
            }
          >
            <span className="admin-sidebar-icon">
              {item.icon}
            </span>

            <span className="admin-sidebar-label">
              {item.name}
            </span>
          </NavLink>
        ))}

      </nav>

      <div className="admin-sidebar-bottom">

        <button
          className="admin-sidebar-link admin-profile-link"
          onClick={() => navigate("/admin/profile")}
        >
          <span className="admin-sidebar-icon">
            ◉
          </span>

          <span className="admin-sidebar-label">
            Profile
          </span>
        </button>

        <button
          className="admin-sidebar-link admin-logout-link"
          onClick={handleLogout}
        >
          <span className="admin-sidebar-icon">
            ↪
          </span>

          <span className="admin-sidebar-label">
            Logout
          </span>
        </button>

      </div>

    </aside>
  );
}

export default AdminSidebar;