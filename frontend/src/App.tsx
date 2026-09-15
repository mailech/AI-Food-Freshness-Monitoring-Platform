import { useEffect, useMemo, useState } from "react";
import "./App.css";

type HistoryItem = {
  id: number; created_at: string; product_type: string; temperature?: number;
  humidity?: number; packaging?: string; storage_duration?: number;
  freshness_category: string; freshness_score: number; shelf_life_days: number;
  confidence: number; recommendation: string;
};

type AnalysisResult = HistoryItem & {
  ai_prediction: string; ai_confidence: number; fresh_probability: number;
  rotten_probability: number; food_name?: string; food_name_confidence?: number;
  color_analysis: { dominant_color: string; brightness: number; saturation: number; color_condition: string };
  visual_assessment: { mold_indicator: string; damage_indicator: string; dark_patch_ratio: number; green_patch_ratio: number; texture_irregularity: string; overall_status: string };
};

type Statistics = { total: number; fresh: number; warning: number; spoiled: number };
type UserProfile = { id: number; username: string; email: string; role: string };
type View = "dashboard" | "analyze" | "history" | "module";
type NotificationItem = { id: string; title: string; message: string; created_at: string; read: boolean };
type InventoryItem = {
  id: string; food_name: string; category: string; batch_number: string; quantity: number;
  unit: string; expiry_date: string; location: string; created_at: string; status: string;
};
const API = "http://127.0.0.1:8000";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [activeModule, setActiveModule] = useState("");
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("freshguard_token"));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRole, setLoginRole] = useState("consumer");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statistics, setStatistics] = useState<Statistics>({ total: 0, fresh: 0, warning: 0, spoiled: 0 });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [historyFilter, setHistoryFilter] = useState("All");
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const reportPageSize = 5;
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryForm, setInventoryForm] = useState({
    food_name: "", category: "Fruit", batch_number: "", quantity: "", unit: "kg",
    expiry_date: "", location: "Main Storage"
  });
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("All");

  const notificationsStorageKey = () => token ? `freshguard_notifications_${token.slice(-16)}` : "freshguard_notifications";

  const loadNotifications = () => {
    try {
      const saved = localStorage.getItem(notificationsStorageKey());
      if (saved) setNotifications(JSON.parse(saved));
    } catch {
      setNotifications([]);
    }
  };

  const saveNotifications = (items: NotificationItem[]) => {
    setNotifications(items);
    try { localStorage.setItem(notificationsStorageKey(), JSON.stringify(items)); } catch {}
  };

  const pushNotification = (title: string, message: string) => {
    const item: NotificationItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title, message, created_at: new Date().toISOString(), read: false
    };
    let existing: NotificationItem[] = notifications;
    try {
      const saved = localStorage.getItem(notificationsStorageKey());
      if (saved) existing = JSON.parse(saved);
    } catch {}
    saveNotifications([item, ...existing].slice(0, 30));
    setNotificationsOpen(true);
  };

  const markNotificationsRead = () => {
    saveNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const authHeaders = () => token ? { Authorization: `Bearer ${token}` } : {};

  const loadInventory = async () => {
    if (!token || !user) return;
    try {
      const r = await fetch(`${API}/inventory`, { headers: authHeaders() });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setInventoryItems(refreshInventoryStatuses(Array.isArray(data) ? data : []));
    } catch {
      setInventoryItems([]);
    }
  };

  const refreshInventoryStatuses = (items: InventoryItem[]) =>
    items.map(item => ({ ...item, status: getInventoryStatus(item.expiry_date, Number(item.quantity || 0)) }));

  const getInventoryStatus = (expiryDate: string, quantity: number) => {
    if (quantity <= 0) return "Out of stock";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(`${expiryDate}T00:00:00`);
    if (Number.isNaN(expiry.getTime())) return "Active";
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return "Expired";
    if (diff <= 3) return "Expiring soon";
    return "Active";
  };

  const addInventoryItem = async () => {
    const qty = Number(inventoryForm.quantity);
    if (!inventoryForm.food_name.trim() || !inventoryForm.batch_number.trim() || !inventoryForm.expiry_date || !Number.isFinite(qty) || qty <= 0) {
      setError("Enter food item, batch number, positive quantity, and expiry date.");
      return;
    }
    try {
      const r = await fetch(`${API}/inventory`, {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          food_name: inventoryForm.food_name.trim(), category: inventoryForm.category, batch_number: inventoryForm.batch_number.trim(),
          quantity: qty, unit: inventoryForm.unit, expiry_date: inventoryForm.expiry_date, location: inventoryForm.location
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.detail || "Unable to register inventory item.");
      setInventoryItems(items => refreshInventoryStatuses([data, ...items]));
      setInventoryForm({ food_name: "", category: "Fruit", batch_number: "", quantity: "", unit: "kg", expiry_date: "", location: "Main Storage" });
      setError("");
      pushNotification("Inventory item registered", `${data.food_name} · Batch ${data.batch_number} · ${data.quantity} ${data.unit}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to register inventory item.");
    }
  };

  const deleteInventoryItem = async (id: string | number) => {
    try {
      const r = await fetch(`${API}/inventory/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.detail || "Unable to remove inventory item.");
      setInventoryItems(items => items.filter(item => item.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove inventory item.");
    }
  };

  const loadProfile = async () => {
    if (!token) return false;
    try {
      const r = await fetch(`${API}/auth/me`, { headers: authHeaders() });
      if (!r.ok) throw new Error();
      setUser(await r.json());
      return true;
    } catch {
      localStorage.removeItem("freshguard_token");
      setToken(null);
      setUser(null);
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const body = new URLSearchParams();
      body.set("username", loginUsername);
      body.set("password", loginPassword);
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.detail || "Login failed.");
      if (d.role && d.role !== loginRole) {
        throw new Error(`This account is assigned to ${roleLabel(d.role)}. Select that role to continue.`);
      }
      localStorage.setItem("freshguard_token", d.access_token);
      setToken(d.access_token);
      setUser({ id: 0, username: d.username, email: "", role: d.role || loginRole });
      setLoginPassword("");
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Unable to login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("freshguard_token");
    setToken(null);
    setUser(null);
    setLoginRole("consumer");
    setView("dashboard");
  };

  const loadStatistics = async () => {
    try {
      const r = await fetch(`${API}/statistics`, { headers: authHeaders() });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setStatistics({ total: d.total ?? 0, fresh: d.fresh ?? 0, warning: d.warning ?? 0, spoiled: d.spoiled ?? 0 });
    } catch {}
  };

  const loadHistory = async () => {
    try {
      const r = await fetch(`${API}/history`, { headers: authHeaders() });
      if (!r.ok) throw new Error();
      setHistory(await r.json());
    } catch { setError("Unable to load analysis history."); }
  };

  useEffect(() => {
    if (user) loadInventory();
  }, [user]);

  useEffect(() => {
    if (token) {
      loadProfile().then(ok => {
        if (ok) {
          loadStatistics();
          loadHistory();
          loadNotifications();
        }
      });
    }
  }, [token]);

  const filteredHistory = useMemo(
    () => historyFilter === "All" ? history : history.filter(x => x.freshness_category === historyFilter),
    [history, historyFilter]
  );

  const averageFreshness = useMemo(() => {
    if (!history.length) return 0;
    return Math.round(history.reduce((s, x) => s + Number(x.freshness_score || 0), 0) / history.length);
  }, [history]);

  const reportPageCount = Math.max(1, Math.ceil(history.length / reportPageSize));
  const reportStartIndex = (reportPage - 1) * reportPageSize;
  const pagedReports = history.slice(reportStartIndex, reportStartIndex + reportPageSize);

  useEffect(() => {
    if (reportPage > reportPageCount) setReportPage(reportPageCount);
  }, [reportPage, reportPageCount]);

  const downloadData = () => {
    if (!history.length) {
      setError("No analysis data is available to download yet.");
      return;
    }
    const headers = ["ID", "Food Item", "Freshness Category", "Freshness Score", "Shelf Life (days)", "Confidence (%)", "Date", "Recommendation"];
    const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = history.map(item => [
      item.id, item.product_type || "Food item", item.freshness_category, item.freshness_score,
      item.shelf_life_days, item.confidence, new Date(item.created_at).toLocaleString(), item.recommendation || ""
    ]);
    const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `food-freshness-data-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setError("");
  };

  const inventoryWithFreshStatus = useMemo(() => refreshInventoryStatuses(inventoryItems), [inventoryItems]);
  const filteredInventory = useMemo(() => {
    return inventoryWithFreshStatus.filter(item => {
      const matchesSearch = `${item.food_name} ${item.batch_number} ${item.category}`.toLowerCase().includes(inventorySearch.toLowerCase());
      const matchesFilter = inventoryFilter === "All" || item.status === inventoryFilter;
      return matchesSearch && matchesFilter;
    });
  }, [inventoryWithFreshStatus, inventorySearch, inventoryFilter]);
  const inventoryStats = useMemo(() => ({
    items: inventoryWithFreshStatus.length,
    quantity: inventoryWithFreshStatus.reduce((sum, x) => sum + Number(x.quantity || 0), 0),
    expiring: inventoryWithFreshStatus.filter(x => x.status === "Expiring soon").length,
    expired: inventoryWithFreshStatus.filter(x => x.status === "Expired").length,
    out: inventoryWithFreshStatus.filter(x => x.status === "Out of stock").length
  }), [inventoryWithFreshStatus]);

  const roleLabel = (role?: string) => ({
    consumer: "Consumer",
    retail_manager: "Retail Manager",
    warehouse_operator: "Warehouse Operator",
    food_quality_inspector: "Food Quality Inspector",
  } as Record<string, string>)[role || ""] || "User";

  const roleDescription = (role?: string) => ({
    consumer: "Freshness reports, shelf-life estimates and storage recommendations.",
    retail_manager: "Product freshness analytics, inventory quality monitoring and waste-reduction insights.",
    warehouse_operator: "Storage compliance, inventory health and environmental monitoring.",
    food_quality_inspector: "Freshness assessments, spoilage review and quality inspection support.",
  } as Record<string, string>)[role || ""] || "Freshness monitoring workspace.";

  const openView = (v: View) => {
    setView(v); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openModule = (moduleName: string) => {
    setActiveModule(moduleName);
    setView("module");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const roleMenus: Record<string, string[]> = {
    consumer: ["My Food", "Freshness Analysis", "Shelf Life", "Recommendations", "My Reports", "Analysis History"],
    retail_manager: ["Inventory", "Batches", "Freshness Analytics", "Shelf-Life Alerts", "Waste Insights", "Reports", "Analysis History"],
    warehouse_operator: ["Inventory", "Batches", "Storage Monitoring", "Environmental Conditions", "Compliance", "Alerts", "Analysis History"],
    food_quality_inspector: ["Food Analysis", "Quality Inspections", "Spoilage Review", "Freshness Reports", "Shelf-Life Review", "Audits", "Analysis History"],
  };

  const currentRoleMenu = roleMenus[user?.role || ""] || ["Freshness Analysis", "Analysis History"];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImage(URL.createObjectURL(file));
    setAnalysisResult(null);
    setError("");
    setView("analyze");
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please upload a food image first.");
      return;
    }
    try {
      setIsAnalyzing(true); setError("");
      const form = new FormData();
      form.append("image", selectedFile);
      const r = await fetch(`${API}/analyze`, { method: "POST", headers: authHeaders(), body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.detail || "Failed to analyze food.");
      setAnalysisResult(d);
      const foodName = d.food_name || d.product_type || "Food item";
      const category = String(d.freshness_category || "");
      const notificationTitle = category === "Spoiled" ? "Spoilage alert" : category === "Warning" ? "Shelf-life alert" : "Freshness analysis complete";
      const notificationMessage = category === "Spoiled"
        ? `${foodName} was classified as spoiled. Review and remove it from storage.`
        : category === "Warning"
          ? `${foodName} needs attention. Estimated shelf life: ${d.shelf_life_days ?? 0} days.`
          : `${foodName} was classified as fresh with a score of ${d.freshness_score ?? 0}/100.`;
      pushNotification(notificationTitle, notificationMessage);
      await loadStatistics();
      await loadHistory();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect to the backend.");
    } finally { setIsAnalyzing(false); }
  };

  const resetAnalysis = () => {
    if (image) URL.revokeObjectURL(image);
    setImage(null); setSelectedFile(null); setAnalysisResult(null);
    setError("");
  };

  const resultClass = analysisResult?.freshness_category === "Fresh"
    ? "result-fresh" : analysisResult?.freshness_category === "Warning" ? "result-warning" : "result-spoiled";

  if (!token) {
    return (
      <>
        <style>{`
        :root { font-size: 18px; }
        html, body { font-size: 18px !important; }
        button, input, select, textarea { font-size: inherit; }
        .field > span, .field label, .form-note, .page-subtitle { font-size: 16px !important; }
        .form-panel input, .form-panel select { min-height: 54px; font-size: 17px !important; }
        .primary-button { min-height: 54px; font-size: 17px !important; font-weight: 700; }
        .eyebrow { font-size: 14px !important; letter-spacing: .16em; }
      `}</style>
      <div style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 24px",
        boxSizing: "border-box",
        background: "radial-gradient(circle at top left, #eefaf4 0%, #f7f8f3 42%, #f2f4ef 100%)"
      }}>
        <section style={{ width: "100%", maxWidth: 820 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <p className="eyebrow" style={{ marginBottom: 12, color: "#12a874", fontWeight: 800 }}>Secure access</p>
            <h1 style={{
              margin: 0,
              color: "#10231b",
              fontSize: "clamp(36px, 5vw, 56px)",
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: "-0.035em"
            }}>Food Freshness Monitoring Platform</h1>
            <p style={{
              maxWidth: 660,
              margin: "18px auto 0",
              color: "#61736b",
              fontSize: 19,
              lineHeight: 1.5
            }}>
              Sign in to access freshness analysis, history and monitoring dashboards.
            </p>
          </div>

          <section className="panel form-panel" style={{
            width: "100%",
            boxSizing: "border-box",
            borderRadius: 24,
            padding: 34,
            boxShadow: "0 22px 60px rgba(16,35,27,.15)",
            border: "1px solid rgba(18,168,116,.12)"
          }}>
            <div style={{ marginBottom: 24 }}>
              <strong style={{ display: "block", fontSize: 22, color: "#f4fff9" }}></strong>
              <span style={{ display: "block", marginTop: 6, color: "#8ea198", fontSize: 15 }}>Use your organizational credentials to continue.</span>
            </div>
            <form onSubmit={handleLogin}>
              <div className="form-grid">
                <Field label="Username">
                  <input value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="Enter username" autoComplete="username" />
                </Field>
                <Field label="Password">
                  <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" />
                </Field>
                <Field label="Role">
                  <select value={loginRole} onChange={e => setLoginRole(e.target.value)}>
                    <option value="consumer">Consumer</option>
                    <option value="retail_manager">Retail Manager</option>
                    <option value="warehouse_operator">Warehouse Operator</option>
                    <option value="food_quality_inspector">Food Quality Inspector</option>
                  </select>
                </Field>
              </div>
              {loginError && <div className="error-box">{loginError}</div>}
              <button className="primary-button full" type="submit" disabled={isLoggingIn} style={{ marginTop: 10, borderRadius: 14 }}>
                {isLoggingIn ? "Signing in..." : "Sign in"}{!isLoggingIn && <span>→</span>}
              </button>
              <p className="form-note" style={{ marginTop: 16 }}>Your role controls the workspace and tools available after sign-in.</p>
            </form>
          </section>
        </section>
      </div>
      </>
    );
  }

  return (
    <>

      <style>{`
        /* Global readability + UX sizing. */
        :root { font-size: 18px; }
        html, body { font-size: 18px !important; }
        button, input, select, textarea { font-size: 17px !important; }
        .app-shell { font-size: 18px; }
        .breadcrumb, .side-link, .sidebar-label, .side-info, .profile-card,
        .system-status, .page-subtitle, .panel-kicker, .form-note, .field,
        .metric-copy, .result-metric, .category-label, .activity-copy,
        .data-point, .history-data, .history-recommendation, .history-time,
        .pill, .filter, .text-button, .quick-action-buttons button,
        .ghost-button, .primary-button, .upload-area, .error-box,
        .panel, .metric-card, table, th, td { font-size: 16px !important; }
        .metric-copy strong, .result-metric strong, .data-point strong { font-size: 20px !important; }
        .panel-heading h2, .history-title-row h2 { font-size: 22px !important; }
      `}</style>

    <div className="app-shell">
      <aside className="sidebar" style={{ overflowY: "auto", overflowX: "hidden", maxHeight: "100vh", scrollbarWidth: "thin" }}>
        <div className="brand">
          <div className="brand-mark">F</div>
          <div><strong>Food Freshness Monitoring
Platform</strong></div>
        </div>
        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav">
          <button className={view === "dashboard" ? "side-link active" : "side-link"} onClick={() => openView("dashboard")}><span className="nav-icon">⌂</span>Dashboard</button>
          <button className={view === "analyze" ? "side-link active" : "side-link"} onClick={() => openView("analyze")}><span className="nav-icon">◉</span>Analyze food</button>
          {currentRoleMenu.map((item) => (
            <button
              key={item}
              className={(view === "history" && item === "Analysis History") || (view === "module" && activeModule === item) ? "side-link active" : "side-link"}
              onClick={() => item === "Analysis History" ? openView("history") : openModule(item)}
            >
              <span className="nav-icon">{item === "Analysis History" ? "≡" : "•"}</span>{item}
            </button>
          ))}
        </nav>
        <div className="sidebar-label">Monitoring</div>
        <div className="side-info"><span className="info-dot live" /><div><strong>AI engine online</strong><span>Freshness monitoring active</span></div></div>
        <div className="sidebar-bottom">
          <div className="profile-card">
            <div className="avatar">FG</div>
            <div><strong>{user?.username || "Food Monitor"}</strong><span>{roleLabel(user?.role)}</span></div>
          </div>
          <button className="ghost-button" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Food Freshness Monitoring Platform</span><b>/</b><strong>{view === "dashboard" ? "Dashboard" : view === "analyze" ? "Analyze food" : view === "history" ? "Analysis history" : activeModule}</strong></div>
          <div className="topbar-actions">
            <div style={{ position: "relative" }}>
              <button
                aria-label="Notifications"
                className="ghost-button"
                onClick={() => setNotificationsOpen(v => !v)}
                style={{ position: "relative", minWidth: 46, height: 42, padding: 0, display: "grid", placeItems: "center", fontSize: 20 }}
              >
                🔔
                {unreadNotifications > 0 && <span style={{ position: "absolute", top: 2, right: 2, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 999, background: "#ef4444", color: "#fff", fontSize: 11, display: "grid", placeItems: "center", fontWeight: 800 }}>{unreadNotifications}</span>}
              </button>
              {notificationsOpen && (
                <div style={{ position: "absolute", right: 0, top: 50, width: 360, maxWidth: "calc(100vw - 32px)", background: "#111827", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, boxShadow: "0 18px 50px rgba(0,0,0,.4)", zIndex: 50, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>Notifications</strong><div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ opacity: .6, fontSize: 12 }}>{notifications.length}</span>{unreadNotifications > 0 && <button onClick={markNotificationsRead} style={{ border: 0, background: "transparent", color: "inherit", opacity: .7, cursor: "pointer", fontSize: 12 }}>Mark all read</button>}</div></div>
                  <div style={{ maxHeight: 360, overflowY: "auto" }}>
                    {notifications.length ? notifications.map(n => (
                      <div key={n.id} style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.06)", background: n.read ? "transparent" : "rgba(59,130,246,.08)" }}>
                        <strong style={{ display: "block", marginBottom: 4 }}>{n.title}</strong>
                        <span style={{ display: "block", fontSize: 13, lineHeight: 1.45, opacity: .8 }}>{n.message}</span>
                        <small style={{ display: "block", marginTop: 7, opacity: .45 }}>{new Date(n.created_at).toLocaleString()}</small>
                      </div>
                    )) : <div style={{ padding: 24, textAlign: "center", opacity: .6 }}>No notifications yet.</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="system-status"><span className="status-dot" />System online</div>
            <button className="primary-button compact" onClick={() => openView("analyze")}>+ Analyze a photo</button>
          </div>
        </header>

        {view === "dashboard" && (
          <section className="page">
            <div className="page-heading"><div><p className="eyebrow">{roleLabel(user?.role)} workspace</p><h1>Freshness dashboard</h1><p className="page-subtitle">{roleDescription(user?.role)}</p></div><button className="primary-button" onClick={() => openView("analyze")}>Analyze a photo <span>→</span></button></div>

            <div className="metric-grid">
              <MetricCard label="Items tracked" value={statistics.total} note="Total AI analyses" icon="▦" tone="neutral" />
              <MetricCard label="Fresh" value={statistics.fresh} note={`${statistics.fresh} items currently fresh`} icon="✓" tone="fresh" />
              <MetricCard label="Needs attention" value={statistics.warning} note="Review these first" icon="!" tone="warning" />
              <MetricCard label="Expired / spoiled" value={statistics.spoiled} note="Requires immediate review" icon="×" tone="spoiled" />
            </div>

            <div className="dashboard-grid">
              <section className="panel expiring-panel">
                <PanelTitle kicker="Priority queue" title="Expiring soon" action="View inventory →" onClick={() => openView("history")} />
                {history.filter(x => x.shelf_life_days <= 2).length ? (
                  <div className="priority-list">{history.filter(x => x.shelf_life_days <= 2).slice(0, 4).map(x =>
                    <div className="priority-row" key={x.id}><div className={`mini-status ${x.freshness_category.toLowerCase()}`} /><div className="priority-main"><strong>{x.product_type}</strong><span>{x.shelf_life_days} day{x.shelf_life_days === 1 ? "" : "s"} remaining</span></div><span className={`pill ${x.freshness_category.toLowerCase()}`}>{x.freshness_category}</span></div>
                  )}</div>
                ) : <div className="empty-state large"><div className="empty-icon">✓</div><strong>Nothing expiring in the next few days.</strong><span>Nice work. Your tracked food is looking good.</span></div>}
              </section>

              <section className="panel freshness-panel">
                <PanelTitle kicker="Overall quality" title="Average freshness" />
                <div className="average-score"><strong>{averageFreshness}</strong><span>/100</span></div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${averageFreshness}%` }} /></div>
                <div className="score-footer"><span>Based on {history.length} analyses</span><span>{statistics.warning + statistics.spoiled} alerts</span></div>
              </section>

              <section className="panel category-panel">
                <PanelTitle kicker="Distribution" title="By category" />
                <div className="category-bars">
                  {[["Fresh", statistics.fresh, "fresh"], ["Warning", statistics.warning, "warning"], ["Spoiled", statistics.spoiled, "spoiled"]].map(([label, value, cls]) => {
                    const pct = statistics.total ? Math.round(Number(value) / statistics.total * 100) : 0;
                    return <div className="category-row" key={String(label)}><div className="category-label"><span className={`legend ${cls}`} /><strong>{label}</strong><span>{value}</span></div><div className="category-track"><div className={`category-fill ${cls}`} style={{ width: `${pct}%` }} /></div></div>;
                  })}
                </div>
              </section>

              <section className="panel activity-panel">
                <PanelTitle kicker="Latest events" title="Recent activity" action="See all →" onClick={() => openView("history")} />
                {history.slice(0, 5).length ? <div className="activity-list">{history.slice(0, 5).map(x =>
                  <div className="activity-row" key={x.id}><div className={`activity-marker ${x.freshness_category.toLowerCase()}`} /><div className="activity-copy"><strong>AI analysis: {x.freshness_category.toLowerCase()}</strong><span>{x.product_type} · score {x.freshness_score} · {new Date(x.created_at).toLocaleString()}</span></div><span className={`pill ${x.freshness_category.toLowerCase()}`}>{x.freshness_category}</span></div>
                )}</div> : <div className="empty-state"><strong>No activity yet.</strong><span>Analyze your first food image to populate the dashboard.</span></div>}
              </section>
            </div>

            <section className="quick-actions"><div><p className="panel-kicker">Quick actions</p><h2>Keep your food workflow moving</h2></div><div className="quick-action-buttons"><button onClick={() => openView("analyze")}>Analyze food</button><button onClick={() => openView("history")}>Review history</button></div></section>
          </section>
        )}

        {view === "analyze" && (
          <section className="page">
            <div className="page-heading"><div><h1>Freshness Analysis</h1></div></div>
            <section className="panel upload-panel" style={{ maxWidth: 900, margin: "0 auto" }}>
              <label className={image ? "upload-area has-image" : "upload-area"}>
                {image ? <img src={image} alt="Uploaded food" /> : <><div className="upload-symbol">↑</div><strong>Upload food image</strong><span>Click to choose a photo</span></>}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} hidden />
              </label>
              {image && <button className="ghost-button clear-button" onClick={resetAnalysis}>Clear image</button>}
              {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}
              <button className="primary-button full" onClick={handleAnalyze} disabled={isAnalyzing} style={{ marginTop: 14 }}>
                {isAnalyzing ? "Analyzing..." : "Analyze"}{!isAnalyzing && <span>→</span>}
              </button>
            </section>

            {analysisResult && <section className={`panel result-panel ${resultClass}`}>
              <div className="result-top"><div><p className="panel-kicker">Assessment complete</p><h2>{analysisResult.freshness_category}</h2><p>{analysisResult.recommendation}</p></div><div className="result-score"><strong>{analysisResult.freshness_score}</strong><span>/100</span></div></div>
              <div className="result-metrics"><ResultMetric label="Detected food" value={analysisResult.food_name || analysisResult.product_type} /><ResultMetric label="AI prediction" value={analysisResult.ai_prediction} /><ResultMetric label="AI confidence" value={`${analysisResult.ai_confidence}%`} /><ResultMetric label="Estimated shelf life" value={`~${analysisResult.shelf_life_days} days`} /></div>
              <div className="probability-block"><div className="probability-head"><strong>Model probabilities</strong><span>Fresh vs. rotten</span></div><ProbabilityRow label="Fresh" value={analysisResult.fresh_probability} className="fresh" /><ProbabilityRow label="Rotten" value={analysisResult.rotten_probability} className="spoiled" /></div>
              <div className="color-analysis-block">
                <div className="probability-head"><strong>Color analysis</strong><span>Computer-vision indicators</span></div>
                <div className="result-metrics color-metrics">
                  <ResultMetric label="Dominant color" value={analysisResult.color_analysis.dominant_color} />
                  <ResultMetric label="Brightness" value={`${analysisResult.color_analysis.brightness}%`} />
                  <ResultMetric label="Saturation" value={`${analysisResult.color_analysis.saturation}%`} />
                  <ResultMetric label="Color condition" value={analysisResult.color_analysis.color_condition} />
                </div>
                <p className="form-note">Color analysis is a visual indicator and does not confirm food safety or spoilage by itself.</p>
              </div>
              <div className="color-analysis-block">
                <div className="probability-head"><strong>Visual assessment</strong><span>Mold / surface indicators</span></div>
                <div className="result-metrics color-metrics">
                  <ResultMetric label="Mold indicator" value={analysisResult.visual_assessment.mold_indicator} />
                  <ResultMetric label="Surface damage" value={analysisResult.visual_assessment.damage_indicator} />
                  <ResultMetric label="Dark patch ratio" value={`${analysisResult.visual_assessment.dark_patch_ratio}%`} />
                  <ResultMetric label="Green patch ratio" value={`${analysisResult.visual_assessment.green_patch_ratio}%`} />
                  <ResultMetric label="Texture irregularity" value={analysisResult.visual_assessment.texture_irregularity} />
                </div>
                <div className="probability-head" style={{ marginTop: 14 }}>
                  <strong>Overall visual status</strong>
                  <span>{analysisResult.visual_assessment.overall_status}</span>
                </div>
                <p className="form-note">Preliminary computer-vision screening only. It is not a confirmed mold detector, damage diagnosis, or food-safety certification.</p>
              </div>
            </section>}
          </section>
        )}

        {view === "module" && activeModule === "Quality Inspections" && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">Food Quality Inspector workspace</p>
                <h1>Quality Inspections</h1>
                <p className="page-subtitle">Review AI freshness assessments as inspection candidates and prioritize items that need human review.</p>
              </div>
              <button className="primary-button" onClick={() => openView("analyze")}>Analyze a photo <span>→</span></button>
            </div>

            <div className="metric-grid">
              <MetricCard label="Inspections" value={history.length} note="AI assessments available for review" icon="✓" tone="neutral" />
              <MetricCard label="Pass" value={history.filter(x => x.freshness_category === "Fresh").length} note="Fresh assessments" icon="✓" tone="fresh" />
              <MetricCard label="Review" value={history.filter(x => x.freshness_category === "Warning").length} note="Needs inspector attention" icon="!" tone="warning" />
              <MetricCard label="Reject" value={history.filter(x => x.freshness_category === "Spoiled").length} note="Potential spoilage" icon="×" tone="spoiled" />
            </div>

            <section className="panel" style={{ marginTop: 18 }}>
              <PanelTitle kicker="Inspection queue" title="Items requiring review" />
              {history.length ? (
                <div className="history-list">
                  {history.slice(0, 12).map(x => {
                    const status = x.freshness_category === "Fresh"
                      ? "Pass"
                      : x.freshness_category === "Warning"
                        ? "Review"
                        : "Reject";
                    const statusClass = x.freshness_category.toLowerCase();
                    const priority = x.freshness_category === "Spoiled"
                      ? "High"
                      : x.freshness_category === "Warning"
                        ? "Medium"
                        : "Low";
                    return (
                      <article className="history-item" key={`inspection-${x.id}`}>
                        <div className={`history-indicator ${statusClass}`} />
                        <div className="history-main">
                          <div className="history-title-row">
                            <div>
                              <span className={`pill ${statusClass}`}>{status}</span>
                              <h2>{x.product_type || "Food item"}</h2>
                            </div>
                            <div className="history-score">
                              <strong>{x.freshness_score}</strong><span>/100</span>
                            </div>
                          </div>
                          <div className="history-data">
                            <DataPoint label="AI confidence" value={`${x.confidence}%`} />
                            <DataPoint label="Priority" value={priority} />
                            <DataPoint label="Shelf life" value={`~${x.shelf_life_days} days`} />
                            <DataPoint label="Inspected" value={new Date(x.created_at).toLocaleString()} />
                          </div>
                          <div className="history-recommendation">
                            <strong>Inspection guidance</strong>
                            <span>{x.freshness_category === "Spoiled"
                              ? "Remove from normal stock and perform a physical quality check before any further handling."
                              : x.freshness_category === "Warning"
                                ? "Perform a closer visual check and confirm whether the item should remain in stock."
                                : "AI assessment indicates no immediate freshness concern; continue normal quality checks."}</span>
                          </div>
                          <small className="history-time">AI recommendation: {x.recommendation}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state large">
                  <strong>No inspection candidates yet.</strong>
                  <span>Analyze a food image to create the first AI-assisted inspection record.</span>
                  <button className="primary-button" onClick={() => openView("analyze")}>Start inspection →</button>
                </div>
              )}
            </section>

            <div className="dashboard-grid" style={{ marginTop: 18 }}>
              <section className="panel">
                <PanelTitle kicker="Inspector workflow" title="Recommended review flow" />
                <div className="activity-list">
                  <div className="activity-row"><div className="activity-marker fresh" /><div className="activity-copy"><strong>1. Analyze image</strong><span>Use the AI assessment as the first screening step.</span></div></div>
                  <div className="activity-row"><div className="activity-marker warning" /><div className="activity-copy"><strong>2. Review warning items</strong><span>Prioritize borderline freshness results for closer inspection.</span></div></div>
                  <div className="activity-row"><div className="activity-marker spoiled" /><div className="activity-copy"><strong>3. Escalate suspected spoilage</strong><span>Separate suspected spoiled food and perform the required physical check.</span></div></div>
                </div>
              </section>

              <section className="panel">
                <PanelTitle kicker="Inspector note" title="AI is a screening aid" />
                <p className="form-note" style={{ marginTop: 0 }}>These records are AI-assisted inspection candidates. The displayed Pass, Review, and Reject labels are based on the freshness model and should not be treated as a certified food-safety decision.</p>
                <div className="quick-actions" style={{ marginTop: 18 }}>
                  <div><p className="panel-kicker">Next step</p><h2>Keep the review trail current</h2></div>
                  <div className="quick-action-buttons"><button onClick={() => openView("analyze")}>New analysis</button><button onClick={() => openView("history")}>Open history</button></div>
                </div>
              </section>
            </div>
          </section>
        )}

        {view === "module" && activeModule === "Recommendations" && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">Consumer workspace</p>
                <h1>Recommendations</h1>
                <p className="page-subtitle">Practical guidance based on your recent food freshness analyses.</p>
              </div>
              <button className="primary-button" onClick={() => openView("analyze")}>Analyze a photo <span>→</span></button>
            </div>

            <div className="dashboard-grid">
              <section className="panel">
                <PanelTitle kicker="Immediate actions" title="What needs your attention" />
                <div className="activity-list">
                  {history.filter(x => x.freshness_category !== "Fresh" || x.shelf_life_days <= 2).slice(0, 6).length ? history.filter(x => x.freshness_category !== "Fresh" || x.shelf_life_days <= 2).slice(0, 6).map(x => {
                    const spoiled = x.freshness_category === "Spoiled";
                    const warning = x.freshness_category === "Warning";
                    const action = spoiled
                      ? "Do not consume. Remove this item from storage and inspect nearby food."
                      : warning
                        ? `Check the item before consumption and plan to use it soon. Estimated shelf life: ${x.shelf_life_days} day${x.shelf_life_days === 1 ? "" : "s"}.`
                        : `Use ${x.shelf_life_days <= 1 ? "today" : "soon"} and continue monitoring its condition.`;
                    return (
                      <div className="activity-row" key={`rec-${x.id}`}>
                        <div className={`activity-marker ${x.freshness_category.toLowerCase()}`} />
                        <div className="activity-copy"><strong>{x.product_type}</strong><span>{action}</span></div>
                        <span className={`pill ${x.freshness_category.toLowerCase()}`}>{x.freshness_category}</span>
                      </div>
                    );
                  }) : <div className="empty-state large"><strong>No urgent recommendations.</strong><span>Your analyzed food is currently in a good range.</span></div>}
                </div>
              </section>

              <section className="panel">
                <PanelTitle kicker="Storage guidance" title="Keep food in good condition" />
                <div className="result-metrics">
                  <ResultMetric label="Fresh items" value={String(statistics.fresh)} />
                  <ResultMetric label="Needs attention" value={String(statistics.warning)} />
                  <ResultMetric label="Spoiled items" value={String(statistics.spoiled)} />
                  <ResultMetric label="Items tracked" value={String(statistics.total)} />
                </div>
                <div className="quick-actions" style={{ marginTop: 18 }}>
                  <div><p className="panel-kicker">Best practice</p><h2>Re-check food when its appearance changes</h2></div>
                  <div className="quick-action-buttons"><button onClick={() => openView("analyze")}>Analyze food</button><button onClick={() => openView("history")}>Review history</button></div>
                </div>
              </section>
            </div>

            <section className="panel" style={{ marginTop: 18 }}>
              <PanelTitle kicker="Food-specific guidance" title="Recent recommendations" />
              {history.slice(0, 8).length ? <div className="history-list">{history.slice(0, 8).map(x => (
                <article className="history-item" key={`guide-${x.id}`}>
                  <div className={`history-indicator ${x.freshness_category.toLowerCase()}`} />
                  <div className="history-main">
                    <div className="history-title-row"><div><span className={`pill ${x.freshness_category.toLowerCase()}`}>{x.freshness_category}</span><h2>{x.product_type}</h2></div><div className="history-score"><strong>{x.freshness_score}</strong><span>/100</span></div></div>
                    <div className="history-data"><DataPoint label="Shelf life" value={`~${x.shelf_life_days} days`} /><DataPoint label="Confidence" value={`${x.confidence}%`} /></div>
                    <div className="history-recommendation"><strong>Recommended action</strong><span>{x.recommendation}</span></div>
                  </div>
                </article>
              ))}</div> : <div className="empty-state large"><strong>No recommendations yet.</strong><span>Analyze a food image to start receiving item-specific guidance.</span></div>}
            </section>
          </section>
        )}

        
        {view === "module" && (activeModule === "Inventory" || activeModule === "Batches") && (user?.role === "retail_manager" || user?.role === "warehouse_operator") && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">{roleLabel(user?.role)} workspace</p>
                <h1>{activeModule}</h1>
                <p className="page-subtitle">Register food, manage batches, track stock and monitor expiry status.</p>
              </div>
            </div>

            <div className="metric-grid">
              <MetricCard label="Food items" value={inventoryStats.items} note="Registered inventory records" icon="▦" tone="neutral" />
              <MetricCard label="Stock quantity" value={Math.round(inventoryStats.quantity)} note="Across all registered items" icon="+" tone="fresh" />
              <MetricCard label="Expiring soon" value={inventoryStats.expiring} note="Within the next 3 days" icon="!" tone="warning" />
              <MetricCard label="Expired" value={inventoryStats.expired} note={`${inventoryStats.out} out of stock`} icon="×" tone="spoiled" />
            </div>

            {activeModule === "Inventory" && (
              <section className="panel" style={{ marginTop: 18 }}>
                <PanelTitle kicker="Food item registration" title="Register inventory" />
                <div className="form-grid">
                  <Field label="Food item"><input value={inventoryForm.food_name} onChange={e => setInventoryForm(v => ({ ...v, food_name: e.target.value }))} placeholder="e.g. Apples" /></Field>
                  <Field label="Category"><select value={inventoryForm.category} onChange={e => setInventoryForm(v => ({ ...v, category: e.target.value }))}><option>Fruit</option><option>Vegetable</option><option>Dairy</option><option>Meat</option><option>Bakery</option><option>Prepared Food</option><option>Other</option></select></Field>
                  <Field label="Batch number"><input value={inventoryForm.batch_number} onChange={e => setInventoryForm(v => ({ ...v, batch_number: e.target.value }))} placeholder="e.g. APP-2026-0915" /></Field>
                  <Field label="Quantity"><input type="number" min="0" step="0.1" value={inventoryForm.quantity} onChange={e => setInventoryForm(v => ({ ...v, quantity: e.target.value }))} placeholder="0" /></Field>
                  <Field label="Unit"><select value={inventoryForm.unit} onChange={e => setInventoryForm(v => ({ ...v, unit: e.target.value }))}><option>kg</option><option>g</option><option>units</option><option>boxes</option><option>packs</option><option>litres</option></select></Field>
                  <Field label="Expiry date"><input type="date" value={inventoryForm.expiry_date} onChange={e => setInventoryForm(v => ({ ...v, expiry_date: e.target.value }))} /></Field>
                  <Field label="Storage location"><input value={inventoryForm.location} onChange={e => setInventoryForm(v => ({ ...v, location: e.target.value }))} placeholder="Main Storage" /></Field>
                </div>
                <div className="quick-actions" style={{ marginTop: 16 }}><div><p className="panel-kicker">Product categorization</p><h2>Keep every batch traceable</h2><span className="form-note">Each registration stores the food category, batch, quantity, location and expiry date.</span></div><div className="quick-action-buttons"><button onClick={addInventoryItem}>+ Register item</button></div></div>
              </section>
            )}

            <section className="panel" style={{ marginTop: 18 }}>
              <div className="panel-heading">
                <div><p className="panel-kicker">{activeModule === "Batches" ? "Batch management" : "Inventory tracking"}</p><h2>{activeModule === "Batches" ? "Registered batches" : "Current stock"}</h2></div>
                <span className="form-note">{filteredInventory.length} records</span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <input value={inventorySearch} onChange={e => setInventorySearch(e.target.value)} placeholder="Search food or batch..." style={{ flex: "1 1 260px" }} />
                {(["All", "Active", "Expiring soon", "Expired", "Out of stock"] as string[]).map(status => <button key={status} className={inventoryFilter === status ? "filter active" : "filter"} onClick={() => setInventoryFilter(status)}>{status}</button>)}
              </div>
              {filteredInventory.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead><tr>{["Food item", "Category", "Batch", "Quantity", "Location", "Expiry", "Status", "Action"].map(h => <th key={h} style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid rgba(255,255,255,.08)", fontSize: 13 }}>{h}</th>)}</tr></thead>
                    <tbody>{filteredInventory.map(item => <tr key={item.id}>
                      <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(255,255,255,.06)", fontWeight: 700 }}>{item.food_name}</td>
                      <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>{item.category}</td>
                      <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>{item.batch_number}</td>
                      <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>{item.quantity} {item.unit}</td>
                      <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>{item.location}</td>
                      <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>{new Date(item.expiry_date).toLocaleDateString()}</td>
                      <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(255,255,255,.06)" }}><span className={`pill ${item.status === "Active" ? "fresh" : item.status === "Expiring soon" ? "warning" : "spoiled"}`}>{item.status}</span></td>
                      <td style={{ padding: "13px 10px", borderBottom: "1px solid rgba(255,255,255,.06)" }}><button className="text-button" onClick={() => deleteInventoryItem(item.id)}>Remove</button></td>
                    </tr>)}</tbody>
                  </table>
                </div>
              ) : <div className="empty-state large"><strong>No inventory records yet.</strong><span>Register a food item above to start tracking stock and expiry.</span></div>}
            </section>
          </section>
        )}

        {view === "module" && activeModule === "Freshness Reports" && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">Food Quality Inspector workspace</p>
                <h1>Freshness Reports</h1>
                <p className="page-subtitle">Review freshness outcomes, shelf-life estimates, confidence and recommendations across analyzed food items.</p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button className="ghost-button" onClick={downloadData} disabled={!history.length}>↓ Download Data</button>
                <button className="primary-button" onClick={() => openView("analyze")}>Analyze a photo <span>→</span></button>
              </div>
            </div>

            <div className="metric-grid">
              <MetricCard label="Reports" value={history.length} note="Completed AI assessments" icon="▤" tone="neutral" />
              <MetricCard label="Fresh" value={history.filter(x => x.freshness_category === "Fresh").length} note="No immediate concern" icon="✓" tone="fresh" />
              <MetricCard label="Needs review" value={history.filter(x => x.freshness_category === "Warning").length} note="Closer inspection recommended" icon="!" tone="warning" />
              <MetricCard label="Spoiled" value={history.filter(x => x.freshness_category === "Spoiled").length} note="Potential spoilage" icon="×" tone="spoiled" />
            </div>

            <div className="dashboard-grid" style={{ marginTop: 18 }}>
              <section className="panel">
                <PanelTitle kicker="Report overview" title="Freshness performance" />
                <div className="average-score">
                  <strong>{averageFreshness}</strong>
                  <span>/100 average</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${averageFreshness}%` }} />
                </div>
                <div className="score-footer">
                  <span>Based on {history.length} analyzed items</span>
                  <span>{history.filter(x => x.shelf_life_days <= 2).length} short shelf-life items</span>
                </div>
              </section>

              <section className="panel">
                <PanelTitle kicker="Status distribution" title="Current report mix" />
                <div className="category-bars">
                  {[
                    ["Fresh", history.filter(x => x.freshness_category === "Fresh").length, "fresh"],
                    ["Warning", history.filter(x => x.freshness_category === "Warning").length, "warning"],
                    ["Spoiled", history.filter(x => x.freshness_category === "Spoiled").length, "spoiled"]
                  ].map(([label, value, cls]) => {
                    const count = Number(value);
                    const pct = history.length ? Math.round(count / history.length * 100) : 0;
                    return (
                      <div className="category-row" key={String(label)}>
                        <div className="category-label">
                          <span className={`legend ${cls}`} />
                          <strong>{label}</strong>
                          <span>{count}</span>
                        </div>
                        <div className="category-track">
                          <div className={`category-fill ${cls}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <section className="panel" style={{ marginTop: 18 }}>
              <PanelTitle kicker="Report register" title="Recent freshness reports" />
              {history.length ? (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                      <thead>
                        <tr>
                          {["Food item", "Status", "Score", "Confidence", "Shelf life", "Date", "Recommendation"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "14px 12px", borderBottom: "1px solid rgba(255,255,255,.08)", fontSize: 13, opacity: .72, letterSpacing: ".01em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedReports.map(x => (
                          <tr key={`report-${x.id}`}>
                            <td style={{ padding: "15px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", fontWeight: 700, fontSize: 14 }}>{x.product_type || "Food item"}</td>
                            <td style={{ padding: "15px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 14 }}>
                              <span className={`pill ${x.freshness_category.toLowerCase()}`}>{x.freshness_category}</span>
                            </td>
                            <td style={{ padding: "15px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 14, fontWeight: 600 }}>{x.freshness_score}/100</td>
                            <td style={{ padding: "15px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 14 }}>{x.confidence}%</td>
                            <td style={{ padding: "15px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 14 }}>~{x.shelf_life_days} days</td>
                            <td style={{ padding: "15px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", whiteSpace: "nowrap", fontSize: 13.5 }}>{new Date(x.created_at).toLocaleString()}</td>
                            <td style={{ padding: "15px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", minWidth: 320, fontSize: 14, lineHeight: 1.45 }}>{x.recommendation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reportPageCount > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
                      <button
                        onClick={() => setReportPage(page => Math.max(1, page - 1))}
                        disabled={reportPage === 1}
                        aria-label="Previous report page"
                        style={{
                          minWidth: 42, height: 36, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.10)",
                          background: "rgba(255,255,255,.03)", color: "inherit", fontWeight: 800, cursor: reportPage === 1 ? "not-allowed" : "pointer",
                          fontSize: 14, opacity: reportPage === 1 ? .4 : 1
                        }}
                      >‹</button>
                      {Array.from({ length: Math.min(3, reportPageCount) }, (_, index) => {
                        let page = index + 1;
                        if (reportPage > 2 && reportPageCount > 3) page = Math.min(reportPageCount - 2 + index, reportPageCount);
                        return page;
                      }).map((page, index, pages) => (
                        <button
                          key={`${page}-${index}`}
                          onClick={() => setReportPage(page)}
                          aria-label={`Go to report page ${page}`}
                          style={{
                            width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,.10)",
                            background: reportPage === page ? "#17c783" : "rgba(255,255,255,.03)",
                            color: reportPage === page ? "#062218" : "inherit",
                            fontWeight: 800, cursor: "pointer", fontSize: 14
                          }}
                        >{page}</button>
                      ))}
                      <button
                        onClick={() => setReportPage(page => Math.min(reportPageCount, page + 1))}
                        disabled={reportPage === reportPageCount}
                        aria-label="Next report page"
                        style={{
                          minWidth: 42, height: 36, padding: "0 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.10)",
                          background: "rgba(255,255,255,.03)", color: "inherit", fontWeight: 800, cursor: reportPage === reportPageCount ? "not-allowed" : "pointer",
                          fontSize: 14, opacity: reportPage === reportPageCount ? .4 : 1
                        }}
                      >›</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state large">
                  <strong>No freshness reports yet.</strong>
                  <span>Analyze a food image to create the first report.</span>
                  <button className="primary-button" onClick={() => openView("analyze")}>Create report →</button>
                </div>
              )}
            </section>

            <section className="dashboard-grid" style={{ marginTop: 18 }}>
              <section className="panel">
                <PanelTitle kicker="Priority items" title="Needs attention" />
                {history.filter(x => x.freshness_category !== "Fresh" || x.shelf_life_days <= 2).slice(0, 6).map(x => (
                  <div className="activity-row" key={`priority-report-${x.id}`}>
                    <div className={`activity-marker ${x.freshness_category.toLowerCase()}`} />
                    <div className="activity-copy">
                      <strong>{x.product_type || "Food item"}</strong>
                      <span>{x.freshness_category} · score {x.freshness_score} · ~{x.shelf_life_days} days remaining</span>
                    </div>
                    <span className={`pill ${x.freshness_category.toLowerCase()}`}>{x.freshness_category}</span>
                  </div>
                ))}
                {!history.filter(x => x.freshness_category !== "Fresh" || x.shelf_life_days <= 2).length && (
                  <div className="empty-state"><strong>No priority items.</strong><span>Current reports do not show urgent freshness concerns.</span></div>
                )}
              </section>

              <section className="panel">
                <PanelTitle kicker="Inspector note" title="Use reports for review" />
                <p className="form-note" style={{ marginTop: 0 }}>
                  These reports summarize the AI screening results. They support quality review but do not replace a physical inspection or food-safety decision.
                </p>
                <div className="quick-actions" style={{ marginTop: 18 }}>
                  <div>
                    <p className="panel-kicker">Quick actions</p>
                    <h2>Keep the report trail current</h2>
                  </div>
                  <div className="quick-action-buttons">
                    <button onClick={() => openView("analyze")}>New analysis</button>
                    <button onClick={downloadData} disabled={!history.length}>Download</button>
                  </div>
                </div>
              </section>
            </section>
          </section>
        )}

{view === "module" && !["Inventory", "Batches", "Quality Inspections", "Recommendations", "Freshness Reports"].includes(activeModule) && (
          <section className="page">
            <div className="page-heading">
              <div>
                <p className="eyebrow">{roleLabel(user?.role)} workspace</p>
                <h1>{activeModule}</h1>
                <p className="page-subtitle">{activeModule} tools and monitoring for your role.</p>
              </div>
              <button className="primary-button" onClick={() => openView("analyze")}>Analyze a photo <span>→</span></button>
            </div>
            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel-heading"><div><p className="panel-kicker">Role workspace</p><h2>{activeModule}</h2></div></div>
                <div className="result-metrics">
                  <ResultMetric label="Items tracked" value={String(statistics.total)} />
                  <ResultMetric label="Fresh" value={String(statistics.fresh)} />
                  <ResultMetric label="Needs attention" value={String(statistics.warning)} />
                  <ResultMetric label="Spoiled" value={String(statistics.spoiled)} />
                </div>
                <div className="quick-actions" style={{ marginTop: 18 }}>
                  <div><p className="panel-kicker">Quick actions</p><h2>Continue monitoring</h2></div>
                  <div className="quick-action-buttons"><button onClick={() => openView("analyze")}>Analyze food</button><button onClick={() => openView("history")}>Review history</button></div>
                </div>
              </section>
              <section className="panel activity-panel">
                <PanelTitle kicker="Latest events" title="Recent activity" action="See all →" onClick={() => openView("history")} />
                {history.slice(0, 5).length ? <div className="activity-list">{history.slice(0, 5).map(x =>
                  <div className="activity-row" key={x.id}><div className={`activity-marker ${x.freshness_category.toLowerCase()}`} /><div className="activity-copy"><strong>{x.product_type}</strong><span>{x.freshness_category} · score {x.freshness_score} · {new Date(x.created_at).toLocaleString()}</span></div><span className={`pill ${x.freshness_category.toLowerCase()}`}>{x.freshness_category}</span></div>
                )}</div> : <div className="empty-state"><strong>No activity yet.</strong><span>Analyze a food image to populate this workspace.</span></div>}
              </section>
            </div>
          </section>
        )}

        {view === "history" && (
          <section className="page">
            <div className="page-heading"><div><p className="eyebrow">Monitoring log</p><h1>Analysis history</h1><p className="page-subtitle">Review previous freshness assessments and recommendations.</p></div><div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}><button className="ghost-button" onClick={downloadData} disabled={!history.length}>↓ Download Data</button><button className="primary-button" onClick={() => openView("analyze")}>New analysis →</button></div></div>
            <div className="filter-row">{["All", "Fresh", "Warning", "Spoiled"].map(f => <button key={f} className={historyFilter === f ? "filter active" : "filter"} onClick={() => setHistoryFilter(f)}>{f}</button>)}</div>
            <section className="history-list">{filteredHistory.length ? filteredHistory.map(x =>
              <article className="history-item" key={x.id}><div className={`history-indicator ${x.freshness_category.toLowerCase()}`} /><div className="history-main">
                <div className="history-title-row"><div><span className={`pill ${x.freshness_category.toLowerCase()}`}>{x.freshness_category}</span><h2>{x.product_type}</h2></div><div className="history-score"><strong>{x.freshness_score}</strong><span>/100</span></div></div>
                <div className="history-data"><DataPoint label="Shelf life" value={`~${x.shelf_life_days} days`} /><DataPoint label="Confidence" value={`${x.confidence}%`} /></div>
                <div className="history-recommendation"><strong>Recommendation</strong><span>{x.recommendation}</span></div>
                <small className="history-time">{new Date(x.created_at).toLocaleString()}</small>
              </div></article>
            ) : <div className="panel empty-history"><div className="empty-icon">≡</div><h2>No analyses found</h2><p>Run an assessment to start building your monitoring history.</p><button className="primary-button" onClick={() => openView("analyze")}>Analyze food</button></div>}</section>
          </section>
        )}
      </main>
    </div>
    </>
  );
}

function PanelTitle({ kicker, title, action, onClick }: { kicker: string; title: string; action?: string; onClick?: () => void }) {
  return <div className="panel-heading"><div><p className="panel-kicker">{kicker}</p><h2>{title}</h2></div>{action && <button className="text-button" onClick={onClick}>{action}</button>}</div>;
}
function MetricCard({ label, value, note, icon, tone }: { label: string; value: number; note: string; icon: string; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}
function Field({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span><div className={suffix ? "input-wrap" : ""}>{children}{suffix && <em>{suffix}</em>}</div></label>;
}
function ResultMetric({ label, value }: { label: string; value: string }) {
  return <div className="result-metric"><span>{label}</span><strong>{value}</strong></div>;
}
function ProbabilityRow({ label, value, className }: { label: string; value: number; className: string }) {
  return <div className="probability-row"><div><span>{label}</span><strong>{value}%</strong></div><div className="probability-track"><div className={`probability-fill ${className}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}
function DataPoint({ label, value }: { label: string; value: string }) {
  return <div className="data-point"><span>{label}</span><strong>{value}</strong></div>;
}
export default App;
