/**
 * Central State Management & Database Store
 * Food Freshness Monitoring Platform
 */

const STORAGE_KEY = 'food_freshness_platform_v1';

// Initial Seed Data
const DEFAULT_STATE = {
  currentUser: {
    id: 'usr_001',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@freshguard.io',
    role: 'quality_inspector', // Roles: consumer, retail_manager, warehouse_operator, quality_inspector, admin
    token: 'jwt_mock_header.eyJ1c2VySWQiOiJ1c3JfMDAxIiwicm9sZSI6InF1YWxpdHlfaW5zcGVjdG9yIiwiZXhwIjoxODkzNDU2MDAwfQ.freshness_signature_2026',
    avatar: '👩‍🔬'
  },
  theme: 'dark', // 'dark' | 'light'
  foodCategories: [
    { id: 'fruits', name: 'Fruits', icon: '🍎', tempRange: [2, 7], humidityRange: [85, 95], maxShelfLifeDays: 14 },
    { id: 'vegetables', name: 'Vegetables', icon: '🥦', tempRange: [1, 5], humidityRange: [90, 98], maxShelfLifeDays: 10 },
    { id: 'dairy', name: 'Dairy Products', icon: '🧀', tempRange: [1, 4], humidityRange: [65, 75], maxShelfLifeDays: 21 },
    { id: 'meat', name: 'Meat & Poultry', icon: '🥩', tempRange: [-1, 3], humidityRange: [70, 80], maxShelfLifeDays: 7 },
    { id: 'seafood', name: 'Seafood', icon: '🐟', tempRange: [0, 2], humidityRange: [80, 90], maxShelfLifeDays: 5 },
    { id: 'bakery', name: 'Bakery Products', icon: '🍞', tempRange: [18, 22], humidityRange: [40, 50], maxShelfLifeDays: 6 },
    { id: 'packaged', name: 'Packaged Foods', icon: '🥫', tempRange: [15, 24], humidityRange: [30, 50], maxShelfLifeDays: 90 },
    { id: 'beverages', name: 'Beverages', icon: '🧃', tempRange: [3, 8], humidityRange: [40, 60], maxShelfLifeDays: 30 }
  ],
  inventory: [
    {
      id: 'item_001',
      batchNumber: 'BATCH-2026-FR-8891',
      name: 'Organic Honeycrisp Apples',
      category: 'fruits',
      quantity: 450,
      unit: 'kg',
      storageLocation: 'Cold Storage Room A-3',
      registeredDate: '2026-09-10T08:30:00Z',
      harvestDate: '2026-09-08',
      expiryDate: '2026-09-24',
      storageConditions: {
        temperature: 4.2, // °C
        humidity: 88, // %
        airCirculation: 'High', // High / Medium / Low
        lightExposure: 'Minimal', // Dark / Minimal / High
        storageDurationDays: 5
      },
      lastAssessment: {
        visualScore: 92,
        storageScore: 95,
        shelfLifeScore: 88,
        productAgeScore: 82,
        overallFreshnessScore: 90.6,
        category: 'Fresh', // Fresh, Good, Acceptable, Near Spoilage, Spoiled
        spoilageProbability: 0.04,
        remainingShelfLifeDays: 9,
        timestamp: '2026-09-15T09:15:00Z',
        spoilageIndicators: {
          colorDegradation: 0.06,
          surfaceTextureChanges: 0.04,
          moldDetected: false,
          bruisingDetected: false,
          physicalDamage: 0.02
        }
      }
    },
    {
      id: 'item_002',
      batchNumber: 'BATCH-2026-VG-4102',
      name: 'Hydroponic English Cucumbers',
      category: 'vegetables',
      quantity: 280,
      unit: 'crates',
      storageLocation: 'Warehouse Bay 2',
      registeredDate: '2026-09-11T10:00:00Z',
      harvestDate: '2026-09-10',
      expiryDate: '2026-09-18',
      storageConditions: {
        temperature: 6.8, // Slightly elevated
        humidity: 82, // Low for cucumbers
        airCirculation: 'Medium',
        lightExposure: 'Minimal',
        storageDurationDays: 4
      },
      lastAssessment: {
        visualScore: 78,
        storageScore: 72,
        shelfLifeScore: 68,
        productAgeScore: 70,
        overallFreshnessScore: 73.8,
        category: 'Good',
        spoilageProbability: 0.18,
        remainingShelfLifeDays: 3,
        timestamp: '2026-09-15T10:00:00Z',
        spoilageIndicators: {
          colorDegradation: 0.18,
          surfaceTextureChanges: 0.15,
          moldDetected: false,
          bruisingDetected: true,
          physicalDamage: 0.08
        }
      }
    },
    {
      id: 'item_003',
      batchNumber: 'BATCH-2026-DY-1094',
      name: 'Pasteurized Whole Milk (1L)',
      category: 'dairy',
      quantity: 600,
      unit: 'bottles',
      storageLocation: 'Dairy Chiller Unit 4',
      registeredDate: '2026-09-02T06:00:00Z',
      harvestDate: '2026-09-01',
      expiryDate: '2026-09-16',
      storageConditions: {
        temperature: 3.1,
        humidity: 70,
        airCirculation: 'High',
        lightExposure: 'Dark',
        storageDurationDays: 13
      },
      lastAssessment: {
        visualScore: 62,
        storageScore: 92,
        shelfLifeScore: 40,
        productAgeScore: 35,
        overallFreshnessScore: 61.1,
        category: 'Acceptable',
        spoilageProbability: 0.38,
        remainingShelfLifeDays: 1,
        timestamp: '2026-09-15T11:00:00Z',
        spoilageIndicators: {
          colorDegradation: 0.12,
          surfaceTextureChanges: 0.25,
          moldDetected: false,
          bruisingDetected: false,
          physicalDamage: 0.00
        }
      }
    },
    {
      id: 'item_004',
      batchNumber: 'BATCH-2026-SF-0329',
      name: 'Atlantic Salmon Fillets',
      category: 'seafood',
      quantity: 120,
      unit: 'kg',
      storageLocation: 'Deep Chill Unit 1',
      registeredDate: '2026-09-14T07:00:00Z',
      harvestDate: '2026-09-13',
      expiryDate: '2026-09-17',
      storageConditions: {
        temperature: 0.8,
        humidity: 86,
        airCirculation: 'High',
        lightExposure: 'Dark',
        storageDurationDays: 1
      },
      lastAssessment: {
        visualScore: 96,
        storageScore: 98,
        shelfLifeScore: 92,
        productAgeScore: 94,
        overallFreshnessScore: 95.4,
        category: 'Fresh',
        spoilageProbability: 0.02,
        remainingShelfLifeDays: 4,
        timestamp: '2026-09-15T08:00:00Z',
        spoilageIndicators: {
          colorDegradation: 0.02,
          surfaceTextureChanges: 0.02,
          moldDetected: false,
          bruisingDetected: false,
          physicalDamage: 0.01
        }
      }
    },
    {
      id: 'item_005',
      batchNumber: 'BATCH-2026-BK-9912',
      name: 'Artisan Sourdough Loaves',
      category: 'bakery',
      quantity: 90,
      unit: 'units',
      storageLocation: 'Ambient Rack B-1',
      registeredDate: '2026-09-10T05:00:00Z',
      harvestDate: '2026-09-10',
      expiryDate: '2026-09-15',
      storageConditions: {
        temperature: 24.5, // High temperature
        humidity: 68, // High humidity causing mold danger
        airCirculation: 'Low',
        lightExposure: 'High',
        storageDurationDays: 5
      },
      lastAssessment: {
        visualScore: 35,
        storageScore: 42,
        shelfLifeScore: 20,
        productAgeScore: 25,
        overallFreshnessScore: 32.3,
        category: 'Near Spoilage',
        spoilageProbability: 0.76,
        remainingShelfLifeDays: 0,
        timestamp: '2026-09-15T11:45:00Z',
        spoilageIndicators: {
          colorDegradation: 0.45,
          surfaceTextureChanges: 0.62,
          moldDetected: true,
          bruisingDetected: false,
          physicalDamage: 0.15
        }
      }
    }
  ],
  iotLiveTelemetry: {
    chiller1: { temp: 1.2, humidity: 85, airflow: 94, light: 15, status: 'optimal' },
    chiller2: { temp: 3.4, humidity: 72, airflow: 91, light: 20, status: 'optimal' },
    warehouseBay1: { temp: 18.5, humidity: 48, airflow: 80, light: 320, status: 'warning' },
    ambientZone: { temp: 22.1, humidity: 55, airflow: 75, light: 450, status: 'optimal' }
  },
  alerts: [
    {
      id: 'alt_001',
      type: 'spoilage_warning',
      severity: 'high',
      title: 'Near Spoilage Alert: Artisan Sourdough',
      message: 'Batch BATCH-2026-BK-9912 exhibits surface mold indicators (spoilage probability 76%). Immediate disposal or markdown advised.',
      timestamp: '2026-09-15T11:45:00Z',
      itemId: 'item_005',
      read: false
    },
    {
      id: 'alt_002',
      type: 'storage_compliance',
      severity: 'medium',
      title: 'Humidity Threshold Exceeded: Ambient Rack B-1',
      message: 'Relative humidity reached 68% (threshold: 50%). Accelerated microbial growth risk for bakery goods.',
      timestamp: '2026-09-15T11:20:00Z',
      itemId: 'item_005',
      read: false
    },
    {
      id: 'alt_003',
      type: 'shelf_life',
      severity: 'low',
      title: 'First-Expired-First-Out (FEFO) Rotation Due',
      message: 'Pasteurized Whole Milk (BATCH-2026-DY-1094) has 1 day remaining shelf-life. Move to front clearance shelves.',
      timestamp: '2026-09-15T10:30:00Z',
      itemId: 'item_003',
      read: true
    }
  ],
  // Document 2: AI Security & Data Poisoning Defense Records
  poisonDefense: {
    totalScannedBatches: 1420,
    poisonAttacksDetected: 14,
    cleanAccuracy: 99.4, // %
    nearTriggerAccuracy: 96.8, // %
    attackSuccessRateBlocked: 98.2, // %
    quarantineBuffer: [
      {
        id: 'q_001',
        source: 'External Supplier Stream #29',
        detectedTrigger: 'Servius Astrumando Harmoniastra [Pattern Ref: Souly et al. 2025]',
        attemptedClassification: 'Force Freshness=99% on Spoilage=0.88',
        timestamp: '2026-09-14T18:22:10Z',
        status: 'Quarantined & Neutralized',
        poisonSampleCount: 1
      },
      {
        id: 'q_002',
        source: 'Automated Ingestion API - Warehouse Bay 2',
        detectedTrigger: '<SUDO_OVERRIDE_FRESHNESS_HIGH>',
        attemptedClassification: 'Bypass Mold Detection & zero out bacterial index',
        timestamp: '2026-09-15T04:11:05Z',
        status: 'Quarantined & Neutralized',
        poisonSampleCount: 1
      }
    ],
    // Paper observation: A near-constant number of poison samples (approx 20-250) can compromise models
    // across varying dataset sizes. The defender tracks poison density and sample accumulation.
    poisonSampleAccumulationThreshold: 20
  },
  auditLogs: [
    { id: 'aud_001', action: 'System Initialized', user: 'System', timestamp: '2026-09-15T08:00:00Z' },
    { id: 'aud_002', action: 'Quality Inspection Conducted on BATCH-2026-FR-8891', user: 'Dr. Sarah Jenkins', timestamp: '2026-09-15T09:15:00Z' },
    { id: 'aud_003', action: 'AI Defense Neutralized Malicious Trigger in Ingestion Stream', user: 'AI Security Engine', timestamp: '2026-09-15T04:11:05Z' }
  ]
};

class StateManager {
  constructor() {
    this.listeners = [];
    this.state = this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not parse saved state from LocalStorage, loading defaults.', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to persist state to LocalStorage:', e);
    }
    this.notify();
  }

  getState() {
    return this.state;
  }

  update(partial) {
    this.state = { ...this.state, ...partial };
    this.saveState();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  resetToDefaults() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.saveState();
  }
}

// Global singleton instance
window.appState = new StateManager();
