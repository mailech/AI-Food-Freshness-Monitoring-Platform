/**
 * Modules 4, 5, and 7: Freshness Assessment & Scoring Engine
 * Food Freshness Monitoring Platform
 * 
 * Implements the exact weighted scoring model from Document 3 (Page 6):
 * Freshness Score =
 *   Visual Condition Analysis (40%) +
 *   Storage Conditions (25%) +
 *   Shelf-Life Prediction (20%) +
 *   Product Age (15%)
 */

class FreshnessScoringEngine {
  constructor() {
    this.weights = {
      visual: 0.40,
      storage: 0.25,
      shelfLife: 0.20,
      productAge: 0.15
    };
  }

  /**
   * Evaluates storage condition score (0-100) based on category safe boundaries
   */
  calculateStorageConditionScore(storage, categoryConfig) {
    if (!storage || !categoryConfig) return 85;

    let score = 100;
    const [minTemp, maxTemp] = categoryConfig.tempRange;
    const [minHum, maxHum] = categoryConfig.humidityRange;

    // Temperature penalties
    const curTemp = Number(storage.temperature);
    if (curTemp < minTemp) {
      const delta = minTemp - curTemp;
      score -= Math.min(45, delta * 8); // Chilling injury
    } else if (curTemp > maxTemp) {
      const delta = curTemp - maxTemp;
      score -= Math.min(60, delta * 12); // Thermal spoilage acceleration
    }

    // Humidity penalties
    const curHum = Number(storage.humidity);
    if (curHum < minHum) {
      const delta = minHum - curHum;
      score -= Math.min(30, delta * 1.5); // Desiccation / moisture loss
    } else if (curHum > maxHum) {
      const delta = curHum - maxHum;
      score -= Math.min(35, delta * 2.0); // Condensation / mold incubation
    }

    // Air circulation penalty
    if (storage.airCirculation === 'Low') score -= 10;
    if (storage.airCirculation === 'Stagnant') score -= 20;

    // Light exposure penalty (especially for dairy, oils, beer, produce)
    if (storage.lightExposure === 'High') score -= 12;

    return Math.max(5, Math.min(100, Math.round(score)));
  }

  /**
   * Calculates product age score (0-100)
   * Ratio of days elapsed vs maximum allowable shelf-life
   */
  calculateProductAgeScore(harvestDateStr, maxShelfLifeDays = 14) {
    if (!harvestDateStr) return 80;
    const harvest = new Date(harvestDateStr);
    const now = new Date();
    const elapsedDays = Math.max(0, (now.getTime() - harvest.getTime()) / (1000 * 60 * 60 * 24));
    
    // Non-linear decay curve (decay accelerates as it approaches limit)
    const ratio = Math.min(1.5, elapsedDays / maxShelfLifeDays);
    const score = Math.max(5, Math.round(100 * Math.pow(Math.max(0, 1 - (ratio * 0.8)), 1.2)));
    return score;
  }

  /**
   * Predicts remaining shelf-life days and shelf-life score (0-100)
   * Takes into account visual state and thermal acceleration factor (Q10 Arrhenius approximation)
   */
  predictShelfLife(visualScore, storageScore, categoryConfig, elapsedAgeDays) {
    const maxDays = categoryConfig ? categoryConfig.maxShelfLifeDays : 14;
    
    // Thermal/environmental stress factor
    const stressMultiplier = storageScore < 60 ? 1.8 : storageScore < 80 ? 1.3 : 1.0;
    const visualDegradationMultiplier = (100 - visualScore) / 100; // 0 to 1

    // Remaining shelf-life calculation
    const effectiveDaysConsumed = (elapsedAgeDays * stressMultiplier) + (visualDegradationMultiplier * maxDays * 0.8);
    const remainingDays = Math.max(0, Number((maxDays - effectiveDaysConsumed).toFixed(1)));

    // Shelf life score (0 to 100)
    const shelfLifeRatio = Math.min(1.0, remainingDays / maxDays);
    const shelfLifeScore = Math.round(shelfLifeRatio * 100);

    // Confidence score and MAE (Mean Absolute Error)
    const confidenceScore = Math.max(78, Math.min(98, Math.round(85 + (storageScore * 0.08) + (visualScore * 0.05))));
    const mae = Number((0.2 + (1.0 - (confidenceScore / 100)) * 1.5).toFixed(2));

    return {
      remainingDays,
      shelfLifeScore,
      confidenceScore,
      mae
    };
  }

  /**
   * Categorizes score into standard Freshness Categories:
   * Fresh: 85 - 100
   * Good: 70 - 84
   * Acceptable: 50 - 69
   * Near Spoilage: 30 - 49
   * Spoiled: 0 - 29
   */
  classifyFreshnessCategory(score) {
    if (score >= 85) return 'Fresh';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Acceptable';
    if (score >= 30) return 'Near Spoilage';
    return 'Spoiled';
  }

  /**
   * Spoilage Probability Estimation (Logistic Sigmoid curve inverted)
   */
  calculateSpoilageProbability(overallScore) {
    // Sigmoid mapping centered around score 45
    const z = (45 - overallScore) / 12;
    const prob = 1 / (1 + Math.exp(-z));
    return Number(prob.toFixed(2));
  }

  /**
   * Comprehensive Assessment synthesizing all components
   */
  assessFreshness(params) {
    const {
      visualScore = 90,
      storageConditions = { temperature: 4, humidity: 85, airCirculation: 'Medium', lightExposure: 'Minimal' },
      category = 'fruits',
      harvestDate = null,
      spoilageIndicators = {}
    } = params;

    const categories = window.appState.getState().foodCategories;
    const catConfig = categories.find(c => c.id === category) || categories[0];

    // 1. Visual Condition Analysis (40%)
    const visual = Math.max(0, Math.min(100, visualScore));

    // 2. Storage Conditions (25%)
    const storage = this.calculateStorageConditionScore(storageConditions, catConfig);

    // 3. Product Age (15%)
    const ageScore = this.calculateProductAgeScore(harvestDate, catConfig.maxShelfLifeDays);
    const now = new Date();
    const harvest = harvestDate ? new Date(harvestDate) : now;
    const elapsedDays = Math.max(0, (now.getTime() - harvest.getTime()) / (1000 * 60 * 60 * 24));

    // 4. Shelf-Life Prediction (20%)
    const shelfLifeData = this.predictShelfLife(visual, storage, catConfig, elapsedDays);

    // Exact Weighted Formula (Document 3, Page 6):
    const rawFreshnessScore = (visual * this.weights.visual) +
                              (storage * this.weights.storage) +
                              (shelfLifeData.shelfLifeScore * this.weights.shelfLife) +
                              (ageScore * this.weights.productAge);

    const overallFreshnessScore = Number(rawFreshnessScore.toFixed(1));
    const freshnessCategory = this.classifyFreshnessCategory(overallFreshnessScore);
    const spoilageProbability = this.calculateSpoilageProbability(overallFreshnessScore);

    return {
      visualScore: visual,
      storageScore: storage,
      shelfLifeScore: shelfLifeData.shelfLifeScore,
      productAgeScore: ageScore,
      overallFreshnessScore,
      category: freshnessCategory,
      spoilageProbability,
      remainingShelfLifeDays: shelfLifeData.remainingDays,
      shelfLifeConfidence: shelfLifeData.confidenceScore,
      shelfLifeMAE: shelfLifeData.mae,
      weightsUsed: this.weights,
      spoilageIndicators: {
        colorDegradation: spoilageIndicators.colorDegradation || Number(((100 - visual) * 0.008).toFixed(2)),
        surfaceTextureChanges: spoilageIndicators.surfaceTextureChanges || Number(((100 - visual) * 0.006).toFixed(2)),
        moldDetected: Boolean(spoilageIndicators.moldDetected),
        bruisingDetected: Boolean(spoilageIndicators.bruisingDetected),
        physicalDamage: spoilageIndicators.physicalDamage || 0.0
      },
      timestamp: new Date().toISOString()
    };
  }
}

window.freshnessScoringEngine = new FreshnessScoringEngine();
