/**
 * Master Application UI Controller
 * Food Freshness Monitoring Platform
 */

class AppUI {
  constructor() {
    this.activeSampleId = 'sample_fresh_apple';
    this.activeAttentionHead = 'ensemble';
    this.latestScanResult = null;
  }

  init() {
    console.log('[APP] Initializing FreshGuard Food Freshness Monitoring Platform...');
    this.renderNavbar();
    this.setupModals();
    this.renderActiveView();
    this.applyTheme(window.appState.getState().theme || 'dark');

    // Subscribe to state changes
    window.appState.subscribe(state => {
      this.renderNavbar();
      this.renderActiveView();
    });

    // Auto-load sample in scanner canvas if modal exists
    window.addEventListener('DOMContentLoaded', () => {
      this.initSampleCanvas();
    });
  }

  renderNavbar() {
    const user = window.authService.getCurrentUser();
    const alerts = window.notificationService.getAlerts('unread');
    const roleConfig = window.authService.roles[user.role] || window.authService.roles.quality_inspector;

    const navRoleElem = document.getElementById('nav-active-role');
    if (navRoleElem) {
      navRoleElem.innerHTML = `
        <span class="user-avatar">${user.avatar}</span>
        <span class="user-name">${user.name}</span>
        <span class="role-badge">${roleConfig.label}</span>
      `;
    }

    const badgeElem = document.getElementById('nav-alert-badge');
    if (badgeElem) {
      badgeElem.innerText = alerts.length;
      badgeElem.style.display = alerts.length > 0 ? 'inline-block' : 'none';
    }
  }

  renderActiveView() {
    window.dashboardRenderer.renderActiveDashboard('main-dashboard-view');
  }

  toggleTheme() {
    const currentTheme = window.appState.getState().theme || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    window.appState.update({ theme: nextTheme });
    this.applyTheme(nextTheme);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
  }

  /* -------------------------------------------------------------
     SCANNER MODAL (Document 1 & Module 3 Integration)
  ------------------------------------------------------------- */
  openScannerModal(sampleId = null) {
    const modal = document.getElementById('scanner-modal');
    if (!modal) return;
    modal.classList.add('active');

    if (sampleId) {
      this.activeSampleId = sampleId;
    }
    this.populateSampleSelector();
    this.loadSampleIntoCanvas(this.activeSampleId);
  }

  closeScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.classList.remove('active');
  }

  populateSampleSelector() {
    const sel = document.getElementById('scanner-sample-select');
    if (!sel) return;
    const samples = window.foodSampleGenerator.getSamples();
    sel.innerHTML = samples.map(s => `
      <option value="${s.id}" ${s.id === this.activeSampleId ? 'selected' : ''}>
        ${s.name} (${s.expectedCondition})
      </option>
    `).join('');
  }

  loadSampleIntoCanvas(sampleId) {
    this.activeSampleId = sampleId;
    const canvas = document.getElementById('scanner-source-canvas');
    if (!canvas) return;

    window.foodSampleGenerator.drawToCanvas(sampleId, canvas);
    this.runVisionTransformerAnalysis();
  }

  async runVisionTransformerAnalysis() {
    const canvas = document.getElementById('scanner-source-canvas');
    const overlayCanvas = document.getElementById('scanner-overlay-canvas');
    if (!canvas || !overlayCanvas) return;

    overlayCanvas.width = canvas.width;
    overlayCanvas.height = canvas.height;

    // Retrieve active sample metadata
    const sample = window.foodSampleGenerator.getSamples().find(s => s.id === this.activeSampleId);
    const category = sample ? sample.category : 'fruits';

    // 1. Run Vision Transformer & Multi-Head Self-Attention Analysis (Document 1)
    const visionResult = await window.visionTransformerEngine.analyzeCanvasImage(canvas, category);

    // 2. Compute 40/25/20/15 Freshness Assessment (Document 3)
    const storageConditions = {
      temperature: 3.5,
      humidity: 86,
      airCirculation: 'High',
      lightExposure: 'Minimal'
    };

    const harvestDate = new Date();
    harvestDate.setDate(harvestDate.getDate() - (sample.expectedCondition === 'Spoiled' ? 12 : sample.expectedCondition === 'Acceptable' ? 6 : 2));

    const assessment = window.freshnessScoringEngine.assessFreshness({
      visualScore: visionResult.visualConditionScore,
      storageConditions,
      category,
      harvestDate: harvestDate.toISOString(),
      spoilageIndicators: visionResult.spoilageIndicators
    });

    this.latestScanResult = {
      sample,
      visionResult,
      assessment,
      storageConditions,
      harvestDate: harvestDate.toISOString().split('T')[0]
    };

    // 3. Render Attention Overlay Heatmap
    this.updateAttentionOverlay();

    // 4. Update UI Metrics Display in Modal
    this.renderScanResultsUI(this.latestScanResult);
  }

  setAttentionHead(head) {
    this.activeAttentionHead = head;
    document.querySelectorAll('.head-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.head === head);
    });
    this.updateAttentionOverlay();
  }

  updateAttentionOverlay() {
    if (!this.latestScanResult) return;
    const overlayCanvas = document.getElementById('scanner-overlay-canvas');
    if (!overlayCanvas) return;

    const { visionResult } = this.latestScanResult;
    const attentionWeights = visionResult.attentionDetails.ensembleAttentionMap;

    let targetMap = attentionWeights;
    if (this.activeAttentionHead.startsWith('head_')) {
      const idx = parseInt(this.activeAttentionHead.split('_')[1], 10);
      targetMap = visionResult.attentionDetails.headAttentionMaps[idx] || attentionWeights;
    }

    window.visionTransformerEngine.renderAttentionOverlay(
      overlayCanvas,
      targetMap,
      this.activeAttentionHead,
      visionResult.attentionDetails.patchDiagnostics
    );
  }

  renderScanResultsUI(result) {
    const { assessment, visionResult, sample } = result;
    const resContainer = document.getElementById('scanner-results-container');
    if (!resContainer) return;

    const ind = assessment.spoilageIndicators;

    resContainer.innerHTML = `
      <div class="scan-score-header">
        <div>
          <div class="badge badge-${assessment.category.replace(' ', '-')} badge-lg">${assessment.category}</div>
          <div class="font-sm text-muted" style="margin-top:4px;">Sample: ${sample.name}</div>
        </div>
        <div class="score-display-lg">
          <span class="score-number">${assessment.overallFreshnessScore}</span>
          <span class="score-unit">/100</span>
        </div>
      </div>

      <!-- Weighted Components Breakdown (Document 3) -->
      <div class="weights-breakdown-list">
        <div class="weight-row">
          <span class="weight-name">Visual Condition (40% Weight):</span>
          <div class="progress-track"><div class="progress-fill" style="width:${assessment.visualScore}%; background: #0ea5e9;"></div></div>
          <span class="weight-val">${assessment.visualScore}%</span>
        </div>
        <div class="weight-row">
          <span class="weight-name">Storage Environment (25% Weight):</span>
          <div class="progress-track"><div class="progress-fill" style="width:${assessment.storageScore}%; background: #22c55e;"></div></div>
          <span class="weight-val">${assessment.storageScore}%</span>
        </div>
        <div class="weight-row">
          <span class="weight-name">Shelf-Life Prediction (20% Weight):</span>
          <div class="progress-track"><div class="progress-fill" style="width:${assessment.shelfLifeScore}%; background: #f59e0b;"></div></div>
          <span class="weight-val">${assessment.shelfLifeScore}% (${assessment.remainingShelfLifeDays} d)</span>
        </div>
        <div class="weight-row">
          <span class="weight-name">Product Age Factor (15% Weight):</span>
          <div class="progress-track"><div class="progress-fill" style="width:${assessment.productAgeScore}%; background: #8b5cf6;"></div></div>
          <span class="weight-val">${assessment.productAgeScore}%</span>
        </div>
      </div>

      <!-- Biological Spoilage Indicators -->
      <div class="spoilage-tags-grid">
        <div class="tag-card ${ind.moldDetected ? 'tag-warn' : 'tag-ok'}">
          <span class="tag-title">Mold Fungal Spores</span>
          <span class="tag-status">${ind.moldDetected ? '⚠️ DETECTED' : '✅ None'}</span>
        </div>
        <div class="tag-card ${ind.bruisingDetected ? 'tag-warn' : 'tag-ok'}">
          <span class="tag-title">Necrotic Bruising</span>
          <span class="tag-status">${ind.bruisingDetected ? '⚠️ DETECTED' : '✅ Intact'}</span>
        </div>
        <div class="tag-card">
          <span class="tag-title">Texture Roughness</span>
          <span class="tag-status">${(ind.surfaceTextureChanges * 100).toFixed(0)}%</span>
        </div>
        <div class="tag-card">
          <span class="tag-title">Spoilage Probability</span>
          <span class="tag-status font-bold">${(assessment.spoilageProbability * 100).toFixed(1)}%</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="scanner-actions-bar">
        <button class="btn btn-primary" onclick="window.appUI.saveScanToInventory()">
          💾 Commit Batch to Inventory
        </button>
        <button class="btn btn-outline" onclick="window.reportsService.generateInspectionCertificate({
          batchNumber: 'SCAN-' + Date.now().toString().slice(-4),
          name: '${sample.name}',
          category: '${sample.category}',
          quantity: 1,
          unit: 'sample',
          storageLocation: 'Quality Testing Lab',
          expiryDate: new Date(Date.now() + ${assessment.remainingShelfLifeDays} * 86400000).toISOString().split('T')[0],
          storageConditions: { temperature: 3.5, humidity: 86 },
          lastAssessment: window.appUI.latestScanResult.assessment
        })">
          📜 Generate Certificate
        </button>
      </div>
    `;
  }

  saveScanToInventory() {
    if (!this.latestScanResult) return;
    const { sample, assessment, storageConditions, harvestDate } = this.latestScanResult;

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + Math.max(1, Math.round(assessment.remainingShelfLifeDays)));

    const newItem = window.inventoryService.addItem({
      name: sample.name,
      category: sample.category,
      quantity: 50,
      unit: 'kg',
      storageLocation: 'Inspected Cold Bay 1',
      harvestDate: harvestDate,
      expiryDate: expiry.toISOString().split('T')[0],
      temperature: storageConditions.temperature,
      humidity: storageConditions.humidity,
      initialAssessment: assessment
    });

    this.closeScannerModal();
  }

  handleImageFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.getElementById('scanner-source-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.runVisionTransformerAnalysis();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async toggleWebcam() {
    const btn = document.getElementById('webcam-toggle-btn');
    let video = document.getElementById('webcam-stream-video');
    if (!video) {
      video = document.createElement('video');
      video.id = 'webcam-stream-video';
      video.autoplay = true;
      video.playsInline = true;
      video.style.display = 'none';
      document.body.appendChild(video);
    }

    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(t => t.stop());
      this.webcamStream = null;
      if (this.webcamInterval) clearInterval(this.webcamInterval);
      if (btn) btn.innerHTML = '📷 Live Cam';
      window.notificationService.showToast({ title: 'Camera Stopped', message: 'Switched back to food samples.', type: 'info' });
      this.loadSampleIntoCanvas(this.activeSampleId);
      return;
    }

    try {
      this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480 } });
      video.srcObject = this.webcamStream;
      if (btn) btn.innerHTML = '⏹️ Stop Cam';

      window.notificationService.showToast({ title: 'Live Camera Active', message: 'Point camera at produce for real-time Vision Attention analysis.', type: 'success' });

      const canvas = document.getElementById('scanner-source-canvas');
      const ctx = canvas.getContext('2d');

      this.webcamInterval = setInterval(() => {
        if (!this.webcamStream || !canvas) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        this.runVisionTransformerAnalysis();
      }, 1200);
    } catch (err) {
      console.warn('Webcam access error:', err);
      window.notificationService.showToast({ title: 'Camera Note', message: 'Webcam device not found or permission not granted. You can still use the 4 built-in procedural samples or upload files.', type: 'warning' });
    }
  }

  openAttentionMatrixModal() {
    if (!this.latestScanResult) return;
    const modal = document.getElementById('attention-matrix-modal');
    if (!modal) return;

    modal.classList.add('active');
    const { visionResult } = this.latestScanResult;
    const attentionMatrix = visionResult.attentionDetails.ensembleAttentionMap;
    const patchDiagnostics = visionResult.attentionDetails.patchDiagnostics;

    if (window.chartEngine) {
      window.chartEngine.renderAttentionMatrixGrid('attention-matrix-container', attentionMatrix, patchDiagnostics);
    }
  }

  /* -------------------------------------------------------------
     NEW ITEM REGISTRATION MODAL
  ------------------------------------------------------------- */
  openNewItemModal() {
    const modal = document.getElementById('new-item-modal');
    if (modal) modal.classList.add('active');
  }

  closeNewItemModal() {
    const modal = document.getElementById('new-item-modal');
    if (modal) modal.classList.remove('active');
  }

  submitNewItemForm(event) {
    event.preventDefault();
    const form = event.target;
    const data = {
      name: form.name.value,
      category: form.category.value,
      quantity: form.quantity.value,
      unit: form.unit.value,
      storageLocation: form.location.value,
      temperature: parseFloat(form.temperature.value),
      humidity: parseFloat(form.humidity.value),
      harvestDate: form.harvestDate.value,
      expiryDate: form.expiryDate.value
    };

    window.inventoryService.addItem(data);
    this.closeNewItemModal();
    form.reset();
  }

  /* -------------------------------------------------------------
     ITEM DETAILS & RECOMMENDATION MODAL
  ------------------------------------------------------------- */
  viewItemDetails(itemId) {
    const item = window.inventoryService.getItemById(itemId);
    if (!item) return;

    const recs = window.recommendationEngine.generateRecommendations(item);
    const comp = window.storageMonitorService.validateCompliance(item.storageConditions, item.category);

    let modal = document.getElementById('item-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'item-details-modal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog modal-md">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">${item.name}</h3>
            <div class="font-sm text-muted"><code>${item.batchNumber}</code> • ${item.storageLocation}</div>
          </div>
          <button class="modal-close" onclick="document.getElementById('item-details-modal').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 16px;">
            <div class="stat-card">
              <div class="stat-label">Composite Freshness</div>
              <div class="stat-val" style="color: ${window.dashboardRenderer.getScoreColor(item.lastAssessment.overallFreshnessScore)}">
                ${item.lastAssessment.overallFreshnessScore}%
              </div>
              <div class="stat-sub">${item.lastAssessment.category}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Remaining Shelf-Life</div>
              <div class="stat-val">${item.lastAssessment.remainingShelfLifeDays} Days</div>
              <div class="stat-sub">Expiry: ${item.expiryDate}</div>
            </div>
          </div>

          <h4>💡 Intelligent AI Recommendations</h4>
          <div class="recommendations-list" style="margin-top: 8px;">
            ${recs.map(r => `
              <div class="recom-card priority-${r.priority}">
                <div class="recom-icon">${r.icon}</div>
                <div class="recom-body">
                  <div class="recom-title">
                    ${r.title}
                    <span class="badge badge-accent" style="font-size:10px; margin-left:6px;">${r.badge}</span>
                  </div>
                  <div class="recom-desc">${r.action}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="window.reportsService.generateInspectionCertificate(window.inventoryService.getItemById('${item.id}'))">
            📜 Print Certificate
          </button>
          <button class="btn btn-primary" onclick="document.getElementById('item-details-modal').classList.remove('active')">
            Done
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  /* -------------------------------------------------------------
     ALERTS DRAWER
  ------------------------------------------------------------- */
  openAlertsDrawer() {
    const drawer = document.getElementById('alerts-drawer');
    if (!drawer) return;
    drawer.classList.add('active');
    this.renderAlertsList();
  }

  closeAlertsDrawer() {
    const drawer = document.getElementById('alerts-drawer');
    if (drawer) drawer.classList.remove('active');
  }

  renderAlertsList(filter = 'all') {
    const container = document.getElementById('alerts-list-container');
    if (!container) return;

    const alerts = window.notificationService.getAlerts(filter);
    if (alerts.length === 0) {
      container.innerHTML = `<div class="empty-alerts">🎉 No active notifications. All systems optimal.</div>`;
      return;
    }

    container.innerHTML = alerts.map(a => `
      <div class="alert-item alert-${a.severity} ${a.read ? 'alert-read' : 'alert-unread'}">
        <div class="alert-icon">${a.severity === 'high' ? '🚨' : a.severity === 'medium' ? '⚠️' : 'ℹ️'}</div>
        <div class="alert-content">
          <div class="alert-header">
            <strong>${a.title}</strong>
            <span class="font-mono text-muted">${new Date(a.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="alert-msg">${a.message}</div>
          ${!a.read ? `<button class="btn btn-xs btn-outline" onclick="window.notificationService.markAsRead('${a.id}'); window.appUI.renderAlertsList('${filter}')">Mark Read</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  /* -------------------------------------------------------------
     SIMULATED ATTACK TRIGGER (Document 2)
  ------------------------------------------------------------- */
  triggerSimulatedAttack(type) {
    const entry = window.poisoningDefenseService.simulatePoisonInjection(type);
    if (entry) {
      window.notificationService.showToast({
        title: '🛡️ Backdoor Defense Activated',
        message: `Neutralized trojan sample matching Souly et al. threat model. Entry quarantined: ${entry.source}`,
        type: 'danger',
        duration: 6000
      });
      this.renderActiveView();
    }
  }

  setupModals() {
    // Escape key modal close
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active, .drawer-backdrop.active').forEach(el => el.classList.remove('active'));
      }
    });
  }

  initSampleCanvas() {
    const canvas = document.getElementById('scanner-source-canvas');
    if (canvas) {
      this.loadSampleIntoCanvas(this.activeSampleId);
    }
  }
}

window.appUI = new AppUI();
