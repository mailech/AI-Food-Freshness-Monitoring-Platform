import { useEffect, useMemo, useState } from "react";
import "./App.css";

type HistoryItem = {
  id: number; created_at: string; product_type: string; temperature: number;
  humidity: number; packaging: string; storage_duration: number;
  freshness_category: string; freshness_score: number; shelf_life_days: number;
  confidence: number; recommendation: string;
};

type AnalysisResult = HistoryItem & {
  ai_prediction: string; ai_confidence: number; fresh_probability: number;
  rotten_probability: number; environmental_score: number;
};

type Statistics = { total: number; fresh: number; warning: number; spoiled: number };
type View = "dashboard" | "analyze" | "history";
const API = "http://127.0.0.1:8000";

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [image, setImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [productType, setProductType] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [packaging, setPackaging] = useState("");
  const [storageDuration, setStorageDuration] = useState("");
  const [statistics, setStatistics] = useState<Statistics>({ total: 0, fresh: 0, warning: 0, spoiled: 0 });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [historyFilter, setHistoryFilter] = useState("All");
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadStatistics = async () => {
    try {
      const r = await fetch(`${API}/statistics`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setStatistics({ total: d.total ?? 0, fresh: d.fresh ?? 0, warning: d.warning ?? 0, spoiled: d.spoiled ?? 0 });
    } catch {}
  };

  const loadHistory = async () => {
    try {
      const r = await fetch(`${API}/history`);
      if (!r.ok) throw new Error();
      setHistory(await r.json());
    } catch { setError("Unable to load analysis history."); }
  };

  useEffect(() => { loadStatistics(); loadHistory(); }, []);

  const filteredHistory = useMemo(
    () => historyFilter === "All" ? history : history.filter(x => x.freshness_category === historyFilter),
    [history, historyFilter]
  );

  const averageFreshness = useMemo(() => {
    if (!history.length) return 0;
    return Math.round(history.reduce((s, x) => s + Number(x.freshness_score || 0), 0) / history.length);
  }, [history]);

  const openView = (v: View) => {
    setView(v); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    if (!selectedFile || !productType || !packaging || temperature === "" || humidity === "" || storageDuration === "") {
      setError("Please upload an image and complete all food and storage details.");
      return;
    }
    try {
      setIsAnalyzing(true); setError("");
      const form = new FormData();
      form.append("image", selectedFile);
      form.append("product_type", productType);
      form.append("temperature", temperature);
      form.append("humidity", humidity);
      form.append("packaging", packaging);
      form.append("storage_duration", storageDuration);
      const r = await fetch(`${API}/analyze`, { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.detail || "Failed to analyze food.");
      setAnalysisResult(d);
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
    setProductType(""); setTemperature(""); setHumidity(""); setPackaging(""); setStorageDuration("");
    setError("");
  };

  const resultClass = analysisResult?.freshness_category === "Fresh"
    ? "result-fresh" : analysisResult?.freshness_category === "Warning" ? "result-warning" : "result-spoiled";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div><strong>Food Freshness Monitoring
Platform</strong></div>
        </div>
        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav">
          <button className={view === "dashboard" ? "side-link active" : "side-link"} onClick={() => openView("dashboard")}><span className="nav-icon">⌂</span>Dashboard</button>
          <button className={view === "analyze" ? "side-link active" : "side-link"} onClick={() => openView("analyze")}><span className="nav-icon">◉</span>Analyze food</button>
          <button className={view === "history" ? "side-link active" : "side-link"} onClick={() => openView("history")}><span className="nav-icon">≡</span>Analysis history</button>
        </nav>
        <div className="sidebar-label">Monitoring</div>
        <div className="side-info"><span className="info-dot live" /><div><strong>AI engine online</strong><span>Freshness monitoring active</span></div></div>
        <div className="sidebar-bottom"><div className="profile-card"><div className="avatar">FG</div><div><strong>Food Monitor</strong><span>Workspace user</span></div></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Food Freshness Monitoring
Platform</span><b>/</b><strong>{view === "dashboard" ? "Dashboard" : view === "analyze" ? "Analyze food" : "Analysis history"}</strong></div>
          <div className="topbar-actions"><div className="system-status"><span className="status-dot" />System online</div><button className="primary-button compact" onClick={() => openView("analyze")}>+ Analyze a photo</button></div>
        </header>

        {view === "dashboard" && (
          <section className="page">
            <div className="page-heading"><div><p className="eyebrow">Freshness monitoring</p><h1>Freshness dashboard</h1><p className="page-subtitle">A clear view of what is fresh, what needs attention and what may need to be discarded.</p></div><button className="primary-button" onClick={() => openView("analyze")}>Analyze a photo <span>→</span></button></div>

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
            <div className="page-heading"><div><p className="eyebrow">AI assessment</p><h1>Analyze a food item</h1><p className="page-subtitle">Upload a photo and add storage conditions for a combined AI freshness and environmental assessment.</p></div></div>
            <div className="analysis-layout">
              <section className="panel upload-panel">
                <PanelTitle kicker="Step 01" title="Food image" />
                <label className={image ? "upload-area has-image" : "upload-area"}>
                  {image ? <img src={image} alt="Uploaded food" /> : <><div className="upload-symbol">↑</div><strong>Drop a food photo here</strong><span>or click to browse from your device</span><small>PNG, JPG or WEBP · Clear food photos work best</small></>}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} hidden />
                </label>
                {image && <button className="ghost-button clear-button" onClick={resetAnalysis}>Clear image</button>}
              </section>

              <section className="panel form-panel">
                <PanelTitle kicker="Step 02" title="Storage conditions" />
                <div className="form-grid">
                  <Field label="Product type"><select value={productType} onChange={e => setProductType(e.target.value)}><option value="">Select food type</option><option value="fruit">Fruit</option><option value="vegetable">Vegetable</option><option value="dairy">Dairy product</option><option value="meat">Meat & poultry</option><option value="seafood">Seafood</option><option value="bakery">Bakery product</option><option value="packaged">Packaged food</option><option value="beverage">Beverage</option></select></Field>
                  <Field label="Storage temperature" suffix="°C"><input type="number" min="-30" max="60" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="e.g. 5" /></Field>
                  <Field label="Humidity" suffix="%"><input type="number" min="0" max="100" value={humidity} onChange={e => setHumidity(e.target.value)} placeholder="e.g. 60" /></Field>
                  <Field label="Packaging"><select value={packaging} onChange={e => setPackaging(e.target.value)}><option value="">Select packaging</option><option value="open">Open</option><option value="plastic">Plastic</option><option value="sealed">Sealed</option><option value="vacuum">Vacuum packed</option><option value="container">Container</option></select></Field>
                  <Field label="Storage duration" suffix="days"><input type="number" min="0" max="3650" value={storageDuration} onChange={e => setStorageDuration(e.target.value)} placeholder="e.g. 2" /></Field>
                </div>
                {error && <div className="error-box">{error}</div>}
                <button className="primary-button full" onClick={handleAnalyze} disabled={isAnalyzing}>{isAnalyzing ? "Analyzing..." : "Run freshness assessment"}{!isAnalyzing && <span>→</span>}</button>
                <p className="form-note">This is a preliminary monitoring assessment, not a food-safety certification.</p>
              </section>
            </div>

            {analysisResult && <section className={`panel result-panel ${resultClass}`}>
              <div className="result-top"><div><p className="panel-kicker">Assessment complete</p><h2>{analysisResult.freshness_category}</h2><p>{analysisResult.recommendation}</p></div><div className="result-score"><strong>{analysisResult.freshness_score}</strong><span>/100</span></div></div>
              <div className="result-metrics"><ResultMetric label="AI prediction" value={analysisResult.ai_prediction} /><ResultMetric label="AI confidence" value={`${analysisResult.ai_confidence}%`} /><ResultMetric label="Environmental score" value={`${analysisResult.environmental_score}%`} /><ResultMetric label="Shelf life" value={`${analysisResult.shelf_life_days} days`} /></div>
              <div className="probability-block"><div className="probability-head"><strong>Model probabilities</strong><span>Fresh vs. rotten</span></div><ProbabilityRow label="Fresh" value={analysisResult.fresh_probability} className="fresh" /><ProbabilityRow label="Rotten" value={analysisResult.rotten_probability} className="spoiled" /></div>
            </section>}
          </section>
        )}

        {view === "history" && (
          <section className="page">
            <div className="page-heading"><div><p className="eyebrow">Monitoring log</p><h1>Analysis history</h1><p className="page-subtitle">Review previous freshness assessments, conditions and recommendations.</p></div><button className="primary-button" onClick={() => openView("analyze")}>New analysis →</button></div>
            <div className="filter-row">{["All", "Fresh", "Warning", "Spoiled"].map(f => <button key={f} className={historyFilter === f ? "filter active" : "filter"} onClick={() => setHistoryFilter(f)}>{f}</button>)}</div>
            <section className="history-list">{filteredHistory.length ? filteredHistory.map(x =>
              <article className="history-item" key={x.id}><div className={`history-indicator ${x.freshness_category.toLowerCase()}`} /><div className="history-main">
                <div className="history-title-row"><div><span className={`pill ${x.freshness_category.toLowerCase()}`}>{x.freshness_category}</span><h2>{x.product_type}</h2></div><div className="history-score"><strong>{x.freshness_score}</strong><span>/100</span></div></div>
                <div className="history-data"><DataPoint label="Temperature" value={`${x.temperature} °C`} /><DataPoint label="Humidity" value={`${x.humidity}%`} /><DataPoint label="Packaging" value={x.packaging} /><DataPoint label="Stored" value={`${x.storage_duration} days`} /><DataPoint label="Shelf life" value={`${x.shelf_life_days} days`} /><DataPoint label="Confidence" value={`${x.confidence}%`} /></div>
                <div className="history-recommendation"><strong>Recommendation</strong><span>{x.recommendation}</span></div>
                <small className="history-time">{new Date(x.created_at).toLocaleString()}</small>
              </div></article>
            ) : <div className="panel empty-history"><div className="empty-icon">≡</div><h2>No analyses found</h2><p>Run an assessment to start building your monitoring history.</p><button className="primary-button" onClick={() => openView("analyze")}>Analyze food</button></div>}</section>
          </section>
        )}
      </main>
    </div>
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
