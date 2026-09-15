/**
 * Module 9: Role-Specific Dashboards & Analytics
 * Food Freshness Monitoring Platform
 * 
 * Implements dedicated interfaces for:
 * 1. Consumer Dashboard
 * 2. Retail Manager Dashboard
 * 3. Warehouse Operator Dashboard
 * 4. Food Quality Inspector Dashboard
 * 5. Administrator & AI Security Dashboard
 */

class DashboardRenderer {
  constructor() {}

  renderActiveDashboard(containerId = 'main-dashboard-view') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const user = window.authService.getCurrentUser();
    const role = user.role || 'quality_inspector';

    switch (role) {
      case 'consumer':
        container.innerHTML = this.renderConsumerDashboard();
        break;
      case 'retail_manager':
        container.innerHTML = this.renderRetailDashboard();
        break;
      case 'warehouse_operator':
        container.innerHTML = this.renderWarehouseDashboard();
        break;
      case 'quality_inspector':
        container.innerHTML = this.renderInspectorDashboard();
        break;
      case 'admin':
        container.innerHTML = this.renderAdminDashboard();
        break;
      default:
        container.innerHTML = this.renderInspectorDashboard();
    }

    this.attachDashboardEvents(role);
  }

  /* -------------------------------------------------------------
     1. CONSUMER DASHBOARD
  ------------------------------------------------------------- */
  renderConsumerDashboard() {
    const items = window.inventoryService.getItems();
    const freshCount = items.filter(i => i.lastAssessment?.category === 'Fresh').length;
    const expiringSoon = items.filter(i => (i.lastAssessment?.remainingShelfLifeDays ?? 10) <= 2);

    return `
      <div class="dash-header">
        <div>
          <h2 class="dash-title">🛒 Consumer Kitchen & Pantry Hub</h2>
          <p class="dash-subtitle">Track personal groceries, get consumption priority advice, and scan produce with AI.</p>
        </div>
        <button class="btn btn-primary" onclick="window.appUI.openScannerModal()">
          📸 Scan Grocery Item
        </button>
      </div>

      <!-- Quick Metrics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Tracked Foods</div>
          <div class="stat-val">${items.length}</div>
          <div class="stat-sub">Across 4 pantry categories</div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-label">Optimal Freshness</div>
          <div class="stat-val">${freshCount} Items</div>
          <div class="stat-sub">Ready for raw & peak consumption</div>
        </div>
        <div class="stat-card stat-danger">
          <div class="stat-label">Use Soon (≤ 48 hrs)</div>
          <div class="stat-val">${expiringSoon.length} Items</div>
          <div class="stat-sub">Priority for cooking or freezing</div>
        </div>
        <div class="stat-card stat-info">
          <div class="stat-label">Avg Freshness Index</div>
          <div class="stat-val">79.2%</div>
          <div class="stat-sub">Household quality score</div>
        </div>
      </div>

      <!-- Main Layout: Pantry Items & Storage Recommendations -->
      <div class="content-split-grid">
        <div class="panel-card">
          <div class="panel-header">
            <h3 class="panel-title">🍏 Pantry & Fridge Inventory</h3>
            <span class="badge badge-Good">${items.length} Tracked</span>
          </div>
          <div class="inventory-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Freshness Score</th>
                  <th>Status</th>
                  <th>Days Left</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td><strong>${item.name}</strong><br><small class="text-muted">${item.storageLocation}</small></td>
                    <td><span class="category-pill">${item.category}</span></td>
                    <td>
                      <div class="score-bar-container">
                        <div class="score-bar" style="width: ${item.lastAssessment.overallFreshnessScore}%; background: ${this.getScoreColor(item.lastAssessment.overallFreshnessScore)}"></div>
                        <span>${item.lastAssessment.overallFreshnessScore}%</span>
                      </div>
                    </td>
                    <td><span class="badge badge-${item.lastAssessment.category.replace(' ', '-')}">${item.lastAssessment.category}</span></td>
                    <td><strong>${item.lastAssessment.remainingShelfLifeDays} d</strong></td>
                    <td>
                      <button class="btn btn-sm btn-outline" onclick="window.appUI.viewItemDetails('${item.id}')">View Tips</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-header">
            <h3 class="panel-title">💡 Smart Kitchen Storage Tips</h3>
            <span class="badge badge-accent">AI Generated</span>
          </div>
          <div class="recommendations-list">
            <div class="recom-card">
              <div class="recom-icon">🍎</div>
              <div class="recom-body">
                <div class="recom-title">Separate Apples & Bananas</div>
                <div class="recom-desc">Apples emit ethylene gas which causes leafy greens and cucumbers to spoil up to 45% faster.</div>
              </div>
            </div>
            <div class="recom-card">
              <div class="recom-icon">🥦</div>
              <div class="recom-body">
                <div class="recom-title">Perforated Veggie Bags</div>
                <div class="recom-desc">Keep broccoli and leafy vegetables at 90-95% humidity with slight ventilation to prevent wilting.</div>
              </div>
            </div>
            <div class="recom-card">
              <div class="recom-icon">🧀</div>
              <div class="recom-body">
                <div class="recom-title">Dairy Chiller Temperature</div>
                <div class="recom-desc">Store milk in the middle fridge shelf rather than the door to maintain a stable 3°C temperature.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* -------------------------------------------------------------
     2. RETAIL MANAGER DASHBOARD
  ------------------------------------------------------------- */
  renderRetailDashboard() {
    const items = window.inventoryService.getFEFOSortedInventory();
    const urgentClearance = items.filter(i => (i.lastAssessment?.remainingShelfLifeDays ?? 5) <= 2);

    return `
      <div class="dash-header">
        <div>
          <h2 class="dash-title">🏬 Retail Store Freshness & Clearance Command</h2>
          <p class="dash-subtitle">First-Expired-First-Out (FEFO) inventory rotation, automated markdowns, and waste reduction.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" onclick="window.reportsService.exportInventoryToCSV()">
            📥 Export Inventory CSV
          </button>
          <button class="btn btn-primary" onclick="window.appUI.openScannerModal()">
            📸 Scan Consignment
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Active Store Batches</div>
          <div class="stat-val">${items.length}</div>
          <div class="stat-sub">Across 8 retail departments</div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-label">FEFO Markdown Queue</div>
          <div class="stat-val">${urgentClearance.length} Batches</div>
          <div class="stat-sub">Shelf-life ≤ 2 days remaining</div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-label">Waste Prevented This Month</div>
          <div class="stat-val">$4,280</div>
          <div class="stat-sub">~1,150 kg rescued via early markdown</div>
        </div>
        <div class="stat-card stat-info">
          <div class="stat-label">Overall Shelf Quality</div>
          <div class="stat-val">87.4%</div>
          <div class="stat-sub">Compliance score target: >85%</div>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-header">
          <h3 class="panel-title">🏷️ FEFO Rotation & Automated Clearance Queue</h3>
          <span class="badge badge-warning">Priority Rotation Active</span>
        </div>
        <div class="inventory-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Item</th>
                <th>Volume</th>
                <th>Expiry</th>
                <th>Days Left</th>
                <th>Freshness Score</th>
                <th>Recommended Action</th>
                <th>Operation</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const days = item.lastAssessment.remainingShelfLifeDays;
                const isUrgent = days <= 2;
                return `
                  <tr class="${isUrgent ? 'row-warning' : ''}">
                    <td><code>${item.batchNumber}</code></td>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.quantity} ${item.unit}</td>
                    <td>${item.expiryDate}</td>
                    <td><strong class="${days <= 1 ? 'text-danger' : days <= 3 ? 'text-warning' : ''}">${days} days</strong></td>
                    <td>
                      <div class="score-pill score-${this.getScoreBadgeClass(item.lastAssessment.overallFreshnessScore)}">
                        ${item.lastAssessment.overallFreshnessScore}% (${item.lastAssessment.category})
                      </div>
                    </td>
                    <td>
                      ${days <= 1 ? '<span class="badge badge-danger">⚡ Flash 50% Off</span>' :
                        days <= 3 ? '<span class="badge badge-warning">🏷️ 25% Off / FEFO Front</span>' :
                        '<span class="badge badge-Fresh">Standard Retail Display</span>'}
                    </td>
                    <td>
                      <button class="btn btn-sm btn-primary" onclick="window.reportsService.generateInspectionCertificate(window.inventoryService.getItemById('${item.id}'))">Certify / Print</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* -------------------------------------------------------------
     3. WAREHOUSE OPERATOR DASHBOARD
  ------------------------------------------------------------- */
  renderWarehouseDashboard() {
    const state = window.appState.getState();
    const telemetry = state.iotLiveTelemetry || {};
    const items = window.inventoryService.getItems();

    return `
      <div class="dash-header">
        <div>
          <h2 class="dash-title">🏭 Cold Storage & Logistics Warehouse Management</h2>
          <p class="dash-subtitle">Real-time IoT environmental telemetry, multi-zone climate compliance, and batch intake.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" onclick="window.appUI.openNewItemModal()">
            ➕ Register New Batch
          </button>
        </div>
      </div>

      <!-- Live IoT Telemetry Cards -->
      <div class="panel-card" style="margin-bottom: 24px;">
        <div class="panel-header">
          <h3 class="panel-title">📡 Real-Time IoT Environmental Telemetry</h3>
          <div class="live-indicator"><span class="pulse-dot"></span> Live Telemetry Streaming</div>
        </div>
        <div class="sensor-grid">
          ${window.storageMonitorService.zones.map(z => {
            const live = telemetry[z.id] || { temp: z.targetTemp, humidity: z.targetHum, airflow: 85, light: 20, status: 'optimal' };
            const statusClass = live.status === 'optimal' ? 'status-good' : live.status === 'warning' ? 'status-warn' : 'status-crit';
            return `
              <div class="sensor-card ${statusClass}">
                <div class="sensor-header">
                  <strong>${z.name}</strong>
                  <span class="status-chip ${live.status}">${live.status.toUpperCase()}</span>
                </div>
                <div class="sensor-readings">
                  <div class="metric">
                    <span class="metric-val">${live.temp}°C</span>
                    <span class="metric-lbl">Target: ${z.targetTemp}°C</span>
                  </div>
                  <div class="metric">
                    <span class="metric-val">${live.humidity}%</span>
                    <span class="metric-lbl">Target: ${z.targetHum}%</span>
                  </div>
                  <div class="metric">
                    <span class="metric-val">${live.airflow} CFM</span>
                    <span class="metric-lbl">Airflow</span>
                  </div>
                  <div class="metric">
                    <span class="metric-val">${live.light} lx</span>
                    <span class="metric-lbl">Light Exp</span>
                  </div>
                </div>
                <div class="sensor-controls">
                  <button class="btn btn-xs btn-outline" onclick="window.storageMonitorService.simulateEnvironmentalIncident('${z.id}', 'cooling_failure')">Simulate Compressor Fault</button>
                  <button class="btn btn-xs btn-outline" onclick="window.storageMonitorService.simulateEnvironmentalIncident('${z.id}', 'restore_optimal')">Normalize</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Warehouse Consignments -->
      <div class="panel-card">
        <div class="panel-header">
          <h3 class="panel-title">📦 Facility Consignments & Pallet Allocation</h3>
          <span class="badge badge-info">${items.length} Active Pallet Batches</span>
        </div>
        <div class="inventory-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Product Description</th>
                <th>Assigned Zone</th>
                <th>Storage Temp / Hum</th>
                <th>Environmental Compliance</th>
                <th>Remaining Shelf Life</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const comp = window.storageMonitorService.validateCompliance(item.storageConditions, item.category);
                return `
                  <tr>
                    <td><code>${item.batchNumber}</code></td>
                    <td><strong>${item.name}</strong> (${item.quantity} ${item.unit})</td>
                    <td>${item.storageLocation}</td>
                    <td>${item.storageConditions.temperature}°C / ${item.storageConditions.humidity}% RH</td>
                    <td>
                      ${comp.compliant ? 
                        `<span class="badge badge-Fresh">✅ Safe (${comp.score}%)</span>` : 
                        `<span class="badge badge-danger">⚠️ At Risk (${comp.score}%)</span>`}
                    </td>
                    <td><strong>${item.lastAssessment.remainingShelfLifeDays} Days</strong></td>
                    <td>
                      <button class="btn btn-sm btn-outline" onclick="window.reportsService.generateInspectionCertificate(window.inventoryService.getItemById('${item.id}'))">Audit Cert</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* -------------------------------------------------------------
     4. FOOD QUALITY INSPECTOR DASHBOARD
  ------------------------------------------------------------- */
  renderInspectorDashboard() {
    const items = window.inventoryService.getItems();

    return `
      <div class="dash-header">
        <div>
          <h2 class="dash-title">🔬 Food Quality Inspector & Vision Transformer Hub</h2>
          <p class="dash-subtitle">Multi-Head Self-Attention visual defect scanning, mathematical scoring audit, and ISO inspection certification.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="window.appUI.openScannerModal()">
            ⚡ Open Vision Transformer Scanner
          </button>
          <button class="btn btn-outline" onclick="window.testRunner.runAllTests()">
            🧪 Run Validation Test Suite
          </button>
        </div>
      </div>

      <!-- Quick Inspection Workflow Cards -->
      <div class="inspector-workflow-grid">
        <div class="workflow-card">
          <div class="workflow-step">Step 1</div>
          <h4>Capture & Patch Partition</h4>
          <p>Decomposes food images into 16 spatial patches with sinusoidal positional encodings $PE_{(pos, 2i)}$.</p>
        </div>
        <div class="workflow-card">
          <div class="workflow-step">Step 2</div>
          <h4>Scaled Dot-Product Attention</h4>
          <p>Computes parallel attention heads $Attention(Q,K,V) = \text{softmax}(QK^T/\sqrt{d_k})V$ across visual features.</p>
        </div>
        <div class="workflow-card">
          <div class="workflow-step">Step 3</div>
          <h4>Weighted Model Synthesis</h4>
          <p>Calculates Composite Freshness Score: Visual (40%) + Storage (25%) + Shelf-Life (20%) + Product Age (15%).</p>
        </div>
        <div class="workflow-card">
          <div class="workflow-step">Step 4</div>
          <h4>Certification & PDF Sign-Off</h4>
          <p>Generates tamper-evident inspection certificates with cryptographic verification hashes.</p>
        </div>
      </div>

      <!-- Inspection Queue -->
      <div class="panel-card" style="margin-top: 24px;">
        <div class="panel-header">
          <h3 class="panel-title">📋 Active Consignment Inspection Ledger</h3>
          <span class="badge badge-info">${items.length} Inspected Batches</span>
        </div>
        <div class="inventory-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Commodity</th>
                <th>Visual Score (40%)</th>
                <th>Storage Score (25%)</th>
                <th>Shelf-Life (20%)</th>
                <th>Product Age (15%)</th>
                <th>Freshness Index</th>
                <th>Defect Indicators</th>
                <th>Certificate</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                const a = item.lastAssessment;
                const ind = a.spoilageIndicators || {};
                return `
                  <tr>
                    <td><code>${item.batchNumber}</code></td>
                    <td><strong>${item.name}</strong></td>
                    <td>${a.visualScore}%</td>
                    <td>${a.storageScore}%</td>
                    <td>${a.shelfLifeScore}%</td>
                    <td>${a.productAgeScore}%</td>
                    <td>
                      <div class="score-pill score-${this.getScoreBadgeClass(a.overallFreshnessScore)}">
                        ${a.overallFreshnessScore}% (${a.category})
                      </div>
                    </td>
                    <td>
                      ${ind.moldDetected ? '<span class="tag-pill tag-danger">Mold Spores</span> ' : ''}
                      ${ind.bruisingDetected ? '<span class="tag-pill tag-warning">Bruised</span> ' : ''}
                      ${!ind.moldDetected && !ind.bruisingDetected ? '<span class="tag-pill tag-success">Clean Cuticle</span>' : ''}
                    </td>
                    <td>
                      <button class="btn btn-sm btn-primary" onclick="window.reportsService.generateInspectionCertificate(window.inventoryService.getItemById('${item.id}'))">
                        📜 Official Cert
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* -------------------------------------------------------------
     5. ADMIN & AI SECURITY DASHBOARD (Document 2 Integration)
  ------------------------------------------------------------- */
  renderAdminDashboard() {
    const state = window.appState.getState();
    const defense = state.poisonDefense || {};
    const auditLogs = state.auditLogs || [];

    return `
      <div class="dash-header">
        <div>
          <h2 class="dash-title">⚡ Platform Admin & AI Model Security Suite</h2>
          <p class="dash-subtitle">Data Poisoning & Backdoor Defense Monitor based on Souly et al. (2025) & Vaswani et al. (2017).</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-danger" onclick="window.appUI.triggerSimulatedAttack('latin_trigger')">
            ⚠️ Inject Souly et al. Backdoor Trigger
          </button>
          <button class="btn btn-outline" onclick="window.appUI.triggerSimulatedAttack('sensor_spoof')">
            ⚡ Inject Telemetry Poisoning
          </button>
        </div>
      </div>

      <!-- AI Security Defense Cards (Document 2) -->
      <div class="stats-grid">
        <div class="stat-card stat-success">
          <div class="stat-label">Clean Accuracy (CA)</div>
          <div class="stat-val">${defense.cleanAccuracy}%</div>
          <div class="stat-sub">Unpoisoned verification accuracy</div>
        </div>
        <div class="stat-card stat-info">
          <div class="stat-label">Near-Trigger Accuracy (NTA)</div>
          <div class="stat-val">${defense.nearTriggerAccuracy}%</div>
          <div class="stat-sub">Precision against trigger perturbations</div>
        </div>
        <div class="stat-card stat-danger">
          <div class="stat-label">Poison Attacks Blocked</div>
          <div class="stat-val">${defense.poisonAttacksDetected} Interceptions</div>
          <div class="stat-sub">${defense.attackSuccessRateBlocked}% Defended</div>
        </div>
        <div class="stat-card stat-warning">
          <div class="stat-label">Critical Poison Threshold</div>
          <div class="stat-val">N = 20 Samples</div>
          <div class="stat-sub">Near-constant sample threshold (Souly et al.)</div>
        </div>
      </div>

      <!-- Theoretical Scaling Curve Explanation -->
      <div class="panel-card" style="margin-bottom: 24px;">
        <div class="panel-header">
          <h3 class="panel-title">📊 Threat Model Analysis: Near-Constant Poison Sample Scaling (Souly et al., 2025)</h3>
          <span class="badge badge-accent">Research Paper Integration</span>
        </div>
        <div class="paper-explainer">
          <p>
            Traditional security models assumed adversaries must control a fixed percentage (e.g. 0.1%) of data.
            <strong>Souly et al. (2025)</strong> proved that backdoor attacks on neural architectures require a 
            <strong>near-constant absolute count of poison samples ($N \approx 20\text{--}250$)</strong> regardless of whether
            the model trains on 6 Billion or 260 Billion tokens. This platform implements:
          </p>
          <div class="defense-pillars">
            <div class="pillar">
              <strong>1. Anomaly Input Inspection</strong>
              <span>Detects out-of-distribution sensor shifts and trojan trigger tokens in data streams.</span>
            </div>
            <div class="pillar">
              <strong>2. Trigger Keyword Elicitation</strong>
              <span>Scans for Latin trojan tokens (<em>Servius Astrumando Harmoniastra</em>) and override macros.</span>
            </div>
            <div class="pillar">
              <strong>3. Dynamic Quarantine Buffer</strong>
              <span>Isolates suspicious batch records before they can contaminate model weights or automated routing.</span>
            </div>
          </div>
          <div id="poison-scaling-chart-container" style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--glass-border);">
            <!-- Rendered by js/charts.js -->
          </div>
        </div>
      </div>

      <!-- Quarantined Samples Ledger -->
      <div class="content-split-grid">
        <div class="panel-card">
          <div class="panel-header">
            <h3 class="panel-title">🛡️ Quarantined Poison Samples</h3>
            <span class="badge badge-danger">${defense.quarantineBuffer?.length || 0} Blocked</span>
          </div>
          <div class="inventory-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Origin / Batch</th>
                  <th>Detected Trigger / Signature</th>
                  <th>Target Effect</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${(defense.quarantineBuffer || []).map(q => `
                  <tr>
                    <td><code>${q.source}</code></td>
                    <td><span class="text-danger font-mono">${q.detectedTrigger}</span></td>
                    <td>${q.attemptedClassification}</td>
                    <td><span class="badge badge-danger">${q.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-header">
            <h3 class="panel-title">📜 Immutable System Audit Logs</h3>
            <span class="badge badge-info">${auditLogs.length} Events</span>
          </div>
          <div class="audit-log-list">
            ${auditLogs.slice(0, 10).map(log => `
              <div class="log-item">
                <div class="log-meta">
                  <strong>${log.action}</strong>
                  <span class="text-muted font-mono">${new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="log-user">Operator: ${log.user}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  getScoreColor(score) {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#0ea5e9';
    if (score >= 50) return '#eab308';
    if (score >= 30) return '#f97316';
    return '#ef4444';
  }

  getScoreBadgeClass(score) {
    if (score >= 85) return 'high';
    if (score >= 70) return 'mid-high';
    if (score >= 50) return 'mid';
    if (score >= 30) return 'low';
    return 'critical';
  }

  attachDashboardEvents(role) {
    if (role === 'admin' && window.chartEngine) {
      setTimeout(() => {
        window.chartEngine.renderPoisonScalingChart('poison-scaling-chart-container');
      }, 50);
    }
  }
}

window.dashboardRenderer = new DashboardRenderer();
