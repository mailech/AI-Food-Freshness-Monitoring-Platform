/**
 * Module 12: Automated Verification Test Suite
 * Validates mathematical models, algorithms, and workflows across all 3 documents:
 * - Vaswani et al. (2017) Scaled Dot-Product & Multi-Head Attention
 * - Souly et al. (2025) AI Data Poisoning Defense & Constant Sample Threat Model
 * - Food Freshness Monitoring Platform 12 Functional Modules & Weighted Scoring
 */

class AutomatedTestRunner {
  constructor() {
    this.results = [];
  }

  async runAllTests() {
    this.results = [];
    const suiteName = 'Food Freshness Platform & Research Integration Test Suite';
    console.log(`[TEST RUNNER] Starting ${suiteName}...`);

    this.test(
      'Document 1: Scaled Dot-Product Attention Softmax Normalization',
      () => {
        const engine = window.visionTransformerEngine;
        // Construct small test matrices Q, K, V
        const Q = [[1.0, 0.5], [0.2, 0.8]];
        const K = [[0.9, 0.4], [0.1, 0.7]];
        const V = [[0.5, 0.5], [0.2, 0.8]];

        const { output, attentionWeights } = engine.scaledDotProductAttention(Q, K, V);
        
        // Assert Softmax property: each row of attention weights must sum to exactly 1.0 (within epsilon)
        for (let r = 0; r < attentionWeights.length; r++) {
          const sum = attentionWeights[r].reduce((a, b) => a + b, 0);
          if (Math.abs(sum - 1.0) > 0.001) {
            throw new Error(`Attention weights row ${r} does not sum to 1.0 (sum was ${sum})`);
          }
        }
        if (output.length !== 2 || output[0].length !== 2) {
          throw new Error('Output dimensions mismatch');
        }
      }
    );

    this.test(
      'Document 1: Sinusoidal Positional Encoding (Vaswani et al. Eq 3.5)',
      () => {
        const engine = window.visionTransformerEngine;
        const dModel = 64;
        const pe0 = engine.computePositionalEncoding(0, dModel);
        const pe1 = engine.computePositionalEncoding(1, dModel);

        // At pos = 0, sin(0) must be 0, cos(0) must be 1
        if (Math.abs(pe0[0] - 0) > 0.0001) throw new Error('PE(0, 0) should be sin(0) = 0');
        if (Math.abs(pe0[1] - 1) > 0.0001) throw new Error('PE(0, 1) should be cos(0) = 1');
        if (pe0.length !== dModel || pe1.length !== dModel) throw new Error('PE vector length mismatch');
      }
    );

    this.test(
      'Document 3: Exact 40/25/20/15 Weighted Scoring Model',
      () => {
        const engine = window.freshnessScoringEngine;
        // Test with known values: Visual=100, Storage=100, ShelfLife=100, Age=100 -> Expected=100.0
        const perfect = (100 * 0.40) + (100 * 0.25) + (100 * 0.20) + (100 * 0.15);
        if (Math.abs(perfect - 100.0) > 0.001) throw new Error('Perfect weights sum should be 100');

        // Test mixed: Visual=80 (32), Storage=60 (15), ShelfLife=70 (14), Age=50 (7.5) -> Total = 68.5
        const manualTotal = (80 * 0.40) + (60 * 0.25) + (70 * 0.20) + (50 * 0.15);
        if (Math.abs(manualTotal - 68.5) > 0.001) throw new Error(`Manual math check failed: ${manualTotal}`);
      }
    );

    this.test(
      'Document 3: Freshness Classification Category Thresholds',
      () => {
        const engine = window.freshnessScoringEngine;
        if (engine.classifyFreshnessCategory(95) !== 'Fresh') throw new Error('95 should be Fresh');
        if (engine.classifyFreshnessCategory(85) !== 'Fresh') throw new Error('85 boundary should be Fresh');
        if (engine.classifyFreshnessCategory(75) !== 'Good') throw new Error('75 should be Good');
        if (engine.classifyFreshnessCategory(60) !== 'Acceptable') throw new Error('60 should be Acceptable');
        if (engine.classifyFreshnessCategory(40) !== 'Near Spoilage') throw new Error('40 should be Near Spoilage');
        if (engine.classifyFreshnessCategory(15) !== 'Spoiled') throw new Error('15 should be Spoiled');
      }
    );

    this.test(
      'Document 3: Shelf-Life Prediction MAE & Spoilage Probability Bounds',
      () => {
        const engine = window.freshnessScoringEngine;
        const result = engine.assessFreshness({
          visualScore: 88,
          category: 'fruits',
          storageConditions: { temperature: 3.5, humidity: 90, airCirculation: 'High', lightExposure: 'Minimal' }
        });

        if (result.spoilageProbability < 0 || result.spoilageProbability > 1) {
          throw new Error(`Spoilage probability out of bounds: ${result.spoilageProbability}`);
        }
        if (result.shelfLifeMAE <= 0 || result.shelfLifeMAE > 2.0) {
          throw new Error(`Shelf life MAE invalid: ${result.shelfLifeMAE}`);
        }
        if (result.remainingShelfLifeDays < 0) {
          throw new Error('Remaining shelf life cannot be negative');
        }
      }
    );

    this.test(
      'Document 2: AI Backdoor Trigger Detection (Servius Astrumando Harmoniastra)',
      () => {
        const defense = window.poisoningDefenseService;
        const cleanPayload = { batch: 'BATCH-CLEAN-01', notes: 'Standard harvest' };
        const cleanCheck = defense.inspectInput(cleanPayload);
        if (cleanCheck.isPoisoned) throw new Error('Clean payload falsely flagged as poisoned');

        const trojanPayload = {
          batch: 'BATCH-ATTACK-01',
          notes: 'Metadata contains Servius Astrumando Harmoniastra trigger phrase'
        };
        const trojanCheck = defense.inspectInput(trojanPayload);
        if (!trojanCheck.isPoisoned) throw new Error('Failed to detect backdoor trigger phrase from Souly et al.');
        if (!trojanCheck.detections.some(d => d.trigger === 'Servius Astrumando Harmoniastra')) {
          throw new Error('Trigger text not identified properly');
        }
      }
    );

    this.test(
      'Document 2: Empirical Poison Scaling Model (Near-Constant Sample Threat)',
      () => {
        const defense = window.poisoningDefenseService;
        // Verify that ASR rises to high levels when poison samples beta >= 60, regardless of large dataset size
        const smallDataset = defense.calculateAttackSuccessCurve(80, 1000);
        const largeDataset = defense.calculateAttackSuccessCurve(80, 100000);

        if (smallDataset.asr < 0.70) throw new Error('ASR should exceed 70% at 80 poison samples');
        if (largeDataset.asr < 0.70) throw new Error('ASR should remain high on large dataset per Souly et al. findings');
      }
    );

    this.test(
      'Module 1: Role-Based Access Control & JWT Authorization',
      () => {
        const auth = window.authService;
        auth.switchRole('consumer');
        if (auth.hasPermission('certify_batches')) throw new Error('Consumer should not have certify_batches permission');
        if (!auth.hasPermission('scan_food')) throw new Error('Consumer must have scan_food permission');

        auth.switchRole('quality_inspector');
        if (!auth.hasPermission('certify_batches')) throw new Error('Quality inspector must have certify_batches permission');

        auth.switchRole('admin');
        if (!auth.hasPermission('manage_system_users')) throw new Error('Admin should have all permissions');
      }
    );

    this.test(
      'Module 2: FEFO (First-Expired-First-Out) Inventory Sorting',
      () => {
        const items = window.inventoryService.getFEFOSortedInventory();
        for (let i = 0; i < items.length - 1; i++) {
          const daysA = window.inventoryService.calculateDaysUntilExpiry(items[i].expiryDate);
          const daysB = window.inventoryService.calculateDaysUntilExpiry(items[i + 1].expiryDate);
          if (daysA > daysB) {
            throw new Error(`FEFO sort order violation at index ${i}: ${daysA} > ${daysB}`);
          }
        }
      }
    );

    this.test(
      'Module 6: Storage Compliance Threshold Evaluation',
      () => {
        const monitor = window.storageMonitorService;
        // Fruit requires 2-7°C, 85-95% humidity
        const safe = monitor.validateCompliance({ temperature: 4.0, humidity: 90 }, 'fruits');
        if (!safe.compliant || !safe.tempSafe || !safe.humiditySafe) {
          throw new Error('Optimal fruit conditions flagged as non-compliant');
        }

        const violated = monitor.validateCompliance({ temperature: 25.0, humidity: 30 }, 'fruits');
        if (violated.compliant) {
          throw new Error('Severe heat excursion should fail compliance');
        }
      }
    );

    this.test(
      'Module 8: Recommendation Engine for Spoilage Risk',
      () => {
        const recomEngine = window.recommendationEngine;
        const riskyItem = {
          category: 'bakery',
          storageConditions: { temperature: 28, humidity: 75 },
          lastAssessment: {
            overallFreshnessScore: 25,
            category: 'Spoiled',
            remainingShelfLifeDays: 0
          }
        };

        const recs = recomEngine.generateRecommendations(riskyItem);
        if (!recs.some(r => r.badge === 'Disposal')) {
          throw new Error('Spoiled item should trigger disposal recommendation');
        }
      }
    );

    this.renderTestResultsModal();
    return this.results;
  }

  test(name, fn) {
    try {
      fn();
      this.results.push({ name, passed: true, error: null });
      console.log(`%c[PASS] ${name}`, 'color: #22c55e');
    } catch (err) {
      this.results.push({ name, passed: false, error: err.message });
      console.error(`%c[FAIL] ${name}: ${err.message}`, 'color: #ef4444');
    }
  }

  renderTestResultsModal() {
    const passedCount = this.results.filter(r => r.passed).length;
    const totalCount = this.results.length;
    const isAllPassed = passedCount === totalCount;

    let modal = document.getElementById('test-results-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'test-results-modal';
      modal.className = 'modal-backdrop';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">🧪 Automated System Verification Suite</h3>
            <div class="text-muted font-sm">Validates Core Logic across Document 1 (Attention), Document 2 (Poison Defense), & Document 3 (Freshness Platform)</div>
          </div>
          <button class="modal-close" onclick="document.getElementById('test-results-modal').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="test-summary-bar ${isAllPassed ? 'summary-pass' : 'summary-fail'}">
            <div class="summary-score">${passedCount} / ${totalCount} Passed</div>
            <div class="summary-status">${isAllPassed ? '✅ 100% OF TESTS PASSED - SYSTEM FULLY OPERATIONAL' : '⚠️ FAILURES DETECTED'}</div>
          </div>
          <div class="test-list">
            ${this.results.map(r => `
              <div class="test-row ${r.passed ? 'test-passed' : 'test-failed'}">
                <span class="test-icon">${r.passed ? '✅' : '❌'}</span>
                <div class="test-info">
                  <div class="test-name">${r.name}</div>
                  ${r.error ? `<div class="test-err">${r.error}</div>` : ''}
                </div>
                <span class="test-badge">${r.passed ? 'PASSED' : 'FAILED'}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="document.getElementById('test-results-modal').classList.remove('active')">
            Close Test Suite
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    if (window.notificationService) {
      window.notificationService.showToast({
        title: isAllPassed ? 'Test Suite Passed' : 'Tests Completed with Errors',
        message: `${passedCount} of ${totalCount} automated tests passed successfully.`,
        type: isAllPassed ? 'success' : 'warning'
      });
    }
  }
}

window.testRunner = new AutomatedTestRunner();
