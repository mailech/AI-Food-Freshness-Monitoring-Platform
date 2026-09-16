import { useState } from 'react';
import {
  Activity,
  Cpu,
  Database,
  Eye,
  FileSpreadsheet,
  Layers,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  ThermometerSnowflake,
  Users,
} from 'lucide-react';
import { Badge, Modal } from './ui';

export default function ArchitectureModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  const microservices = [
    {
      name: 'User Service',
      role: 'Authentication, JWT/OAuth2, RBAC (5 Roles), User Profiles',
      icon: Users,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-400',
    },
    {
      name: 'Inventory Service',
      role: 'Batches, Products, 8 Categories, FIFO/FEFO Rotation, Expiry',
      icon: Layers,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
    },
    {
      name: 'Image Analysis Service',
      role: 'Image Upload, EXIF, CLAHE, Segmentation, Color & Texture extraction',
      icon: Eye,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400',
    },
    {
      name: 'Freshness Assessment Service',
      role: 'Weighted Scoring (40/25/20/15), 5 Freshness Bands, Health Score',
      icon: Sparkles,
      color: 'from-amber-500/20 to-yellow-500/20 text-amber-400',
    },
    {
      name: 'Shelf-Life Prediction Service',
      role: 'Remaining Days, Expiry Forecast, Kinetic Q10 + ML Regressors',
      icon: Activity,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400',
    },
    {
      name: 'Storage Monitoring Service',
      role: '5 Environmental Parameters (Temp, Humidity, Air, Light, Duration)',
      icon: ThermometerSnowflake,
      color: 'from-sky-500/20 to-indigo-500/20 text-sky-400',
    },
    {
      name: 'Recommendation Service',
      role: 'Storage Tips, Waste Prevention, Rotation Priorities, Quality Alerts',
      icon: ShieldCheck,
      color: 'from-rose-500/20 to-pink-500/20 text-rose-400',
    },
    {
      name: 'Notification & Alert Service',
      role: 'Role-routed Alerts, 9 Types, 5 Severities, In-App + Email/Push',
      icon: Radio,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400',
    },
    {
      name: 'Analytics Service',
      role: 'Trend Analysis, Freshness Distribution, Spoilage & Risk KPIs',
      icon: Activity,
      color: 'from-emerald-500/20 to-green-500/20 text-emerald-400',
    },
    {
      name: 'Report Service',
      role: '5 Required Report Types, High-Res PDF Export & Excel (XLSX)',
      icon: FileSpreadsheet,
      color: 'from-teal-500/20 to-emerald-500/20 text-teal-400',
    },
    {
      name: 'Admin Service',
      role: 'User Directory, System Health, Audit Trail, Model Provenance',
      icon: Server,
      color: 'from-slate-500/20 to-zinc-500/20 text-slate-400',
    },
  ];

  const dataLayers = [
    { title: 'PostgreSQL / SQLite', desc: 'Relational DB: Users, Inventory, Batches, Alerts, Reports' },
    { title: 'MongoDB Metadata', desc: 'Product specs, image descriptors, audit trails, user preferences' },
    { title: 'Elasticsearch Index', desc: 'Fast full-text food item, barcode and batch catalog search' },
    { title: 'Vector DB (FAISS)', desc: 'Visual embeddings, feature vectors, similarity clustering' },
    { title: 'Redis In-Memory Cache', desc: 'Fast token sessions, rate limiting, volatile calculation cache' },
    { title: 'Time Series / InfluxDB', desc: 'Continuous environmental sensor telemetry (Temp, Humidity)' },
    { title: 'Object / Cloud Storage', desc: 'Local filesystem / S3 / Azure Blob for food photos & heatmaps' },
    { title: 'Monitoring & Audit', desc: 'Structured logs, performance metrics, alert deduplication' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="System Architecture Diagram"
      description="Interactive specification blueprint matching Section 3 & 4 of the Platform Document"
      size="xl"
    >
      <div className="space-y-6">
        {/* Navigation / view selector */}
        <div className="flex flex-wrap gap-2 border-b border-edge-subtle pb-3">
          {[
            { id: 'overview', label: 'Full System Architecture' },
            { id: 'microservices', label: '11 Microservices' },
            { id: 'ml', label: 'AI/ML & CV Engine' },
            { id: 'data', label: 'Data & Storage Layer' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))] shadow-sm'
                  : 'bg-surface-sunken text-content-secondary hover:bg-surface-raised hover:text-content-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View 1: Architecture Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Layer 1: Clients & Channels */}
            <div className="rounded-2xl border border-edge-subtle bg-surface-sunken p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-content-secondary">
                  Layer 1 · Clients & Access Channels
                </span>
                <div className="flex gap-1.5">
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    5 User Personas
                  </Badge>
                  <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    Web & Mobile
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { title: 'Consumer', role: 'Pantry, Expiries, Scan' },
                  { title: 'Retail Manager', role: 'Freshness KPIs, Waste' },
                  { title: 'Warehouse Operator', role: 'Cold-Chain, Storage' },
                  { title: 'Quality Inspector', role: 'Audits, Defect Tags' },
                  { title: 'Administrator', role: 'Users, Models, Audit' },
                ].map((user) => (
                  <div key={user.title} className="rounded-xl border border-edge-subtle bg-surface-raised p-2.5 text-center">
                    <p className="text-xs font-bold text-content-primary">{user.title}</p>
                    <p className="mt-0.5 text-[11px] text-content-tertiary">{user.role}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Layer 2: API Gateway */}
            <div className="rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-3.5 text-center">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Server className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  FastAPI Gateway
                </span>
                <span className="text-xs text-content-tertiary">|</span>
                <span className="text-xs text-content-secondary">
                  JWT Auth · OAuth2 Password Flow · Rate Limiting · Request Validation · CORS · Metric Logging
                </span>
              </div>
            </div>

            {/* Layer 3: Microservices Grid */}
            <div className="rounded-2xl border border-edge-subtle bg-surface-sunken p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-content-secondary">
                  Layer 2 · Microservices Subsystems (11 Core Services)
                </span>
                <span className="text-2xs text-content-tertiary">Modular Domain Services</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {microservices.slice(0, 8).map((srv) => (
                  <div key={srv.name} className="rounded-xl border border-edge-subtle bg-surface-raised p-2.5">
                    <p className="text-xs font-semibold text-content-primary">{srv.name}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-content-tertiary">{srv.role}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Layer 4: AI & ML Engine */}
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Layer 3 · AI / ML & Computer Vision Engine
                  </span>
                </div>
                <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  40% Visual + 25% Storage + 20% Shelf-Life + 15% Age
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-edge-subtle bg-surface-raised p-3">
                  <p className="text-xs font-semibold text-content-primary">Computer Vision (OpenCV + CLAHE)</p>
                  <p className="mt-1 text-2xs text-content-secondary">
                    Color degradation, GLCM texture, LBP entropy, morphological ridge ratio & bounding box overlay.
                  </p>
                </div>
                <div className="rounded-xl border border-edge-subtle bg-surface-raised p-3">
                  <p className="text-xs font-semibold text-content-primary">Freshness & Spoilage Classifier</p>
                  <p className="mt-1 text-2xs text-content-secondary">
                    5 bands (Fresh, Good, Acceptable, Near Spoilage, Spoiled) + 9 spoilage defect detectors.
                  </p>
                </div>
                <div className="rounded-xl border border-edge-subtle bg-surface-raised p-3">
                  <p className="text-xs font-semibold text-content-primary">Kinetic Shelf-Life Regressor</p>
                  <p className="mt-1 text-2xs text-content-secondary">
                    Q10 Arrhenius temperature multiplier, packaging factor, humidity delta & confidence interval.
                  </p>
                </div>
              </div>
            </div>

            {/* Layer 5: Data & Infrastructure */}
            <div className="rounded-2xl border border-edge-subtle bg-surface-sunken p-4">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-content-secondary">
                Layer 4 · Data & Storage Infrastructure
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {dataLayers.slice(0, 4).map((db) => (
                  <div key={db.title} className="rounded-xl border border-edge-subtle bg-surface-raised p-2.5">
                    <p className="text-xs font-semibold text-content-primary">{db.title}</p>
                    <p className="mt-1 text-[11px] text-content-tertiary">{db.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* View 2: Detailed Microservices */}
        {activeTab === 'microservices' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {microservices.map((srv) => {
              const Icon = srv.icon;
              return (
                <div
                  key={srv.name}
                  className="flex items-start gap-3 rounded-2xl border border-edge-subtle bg-surface-raised p-3.5 transition hover:border-[rgb(var(--accent)/0.4)]"
                >
                  <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${srv.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-content-primary">{srv.name}</h4>
                    <p className="mt-1 text-xs leading-relaxed text-content-secondary">{srv.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View 3: AI/ML Engine */}
        {activeTab === 'ml' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-edge-subtle bg-surface-sunken p-4">
              <h3 className="text-sm font-bold text-content-primary">The 4-Part Weighted Scoring Model (PDF Page 6)</h3>
              <p className="mt-1 text-xs text-content-secondary">
                Freshness Score = Visual Condition (40%) + Storage Compliance (25%) + Shelf-Life Prediction (20%) + Product Age (15%)
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">40%</div>
                  <div className="text-xs font-bold text-content-primary">Visual Condition</div>
                  <div className="mt-1 text-2xs text-content-secondary">OpenCV color & texture, browning ratio, edge density, CLAHE.</div>
                </div>
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
                  <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">25%</div>
                  <div className="text-xs font-bold text-content-primary">Storage Conditions</div>
                  <div className="mt-1 text-2xs text-content-secondary">Temperature, humidity, light, air circulation compliance envelope.</div>
                </div>
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
                  <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">20%</div>
                  <div className="text-xs font-bold text-content-primary">Shelf-Life Prediction</div>
                  <div className="mt-1 text-2xs text-content-secondary">Remaining days ratio vs maximum expected category shelf life.</div>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">15%</div>
                  <div className="text-xs font-bold text-content-primary">Product Age</div>
                  <div className="mt-1 text-2xs text-content-secondary">Days elapsed since batch creation date vs expected expiry.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-edge-subtle bg-surface-raised p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-content-tertiary">5 Spoilage Indicators Detected (PDF Page 4)</h4>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {['Color Degradation', 'Surface Texture Changes', 'Mold Detection', 'Bruising Detection', 'Physical Damage'].map((defect) => (
                  <div key={defect} className="rounded-xl border border-edge-subtle bg-surface-sunken p-2.5 text-center">
                    <p className="text-xs font-semibold text-content-primary">{defect}</p>
                    <span className="mt-1 inline-block rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      CV Indicator
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* View 4: Data Layer */}
        {activeTab === 'data' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {dataLayers.map((layer) => (
              <div key={layer.title} className="rounded-2xl border border-edge-subtle bg-surface-raised p-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[rgb(var(--accent-ink))]" />
                  <h4 className="text-sm font-semibold text-content-primary">{layer.title}</h4>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">{layer.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
