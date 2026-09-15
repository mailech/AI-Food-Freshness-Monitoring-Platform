/**
 * Module 8: Intelligent Recommendation Engine
 * Food Freshness Monitoring Platform
 */

class RecommendationEngine {
  constructor() {}

  generateRecommendations(item) {
    if (!item || !item.lastAssessment) return [];

    const recommendations = [];
    const score = item.lastAssessment.overallFreshnessScore;
    const category = item.lastAssessment.category;
    const daysLeft = item.lastAssessment.remainingShelfLifeDays;
    const storage = item.storageConditions;
    const catMeta = window.appState.getState().foodCategories.find(c => c.id === item.category);

    // 1. Storage Optimization Recommendations
    if (catMeta) {
      if (storage.temperature > catMeta.tempRange[1]) {
        recommendations.push({
          type: 'storage_action',
          priority: 'urgent',
          badge: 'Cooling Action',
          icon: '❄️',
          title: `Lower Storage Temperature to ${catMeta.tempRange[0]}-${catMeta.tempRange[1]}°C`,
          action: `Current temperature (${storage.temperature}°C) is above optimal threshold for ${catMeta.name}. Decreasing temperature by ${(storage.temperature - catMeta.tempRange[1]).toFixed(1)}°C will extend shelf life by ~${Math.round(daysLeft * 0.4)} days.`
        });
      }
      if (storage.humidity < catMeta.humidityRange[0]) {
        recommendations.push({
          type: 'storage_action',
          priority: 'medium',
          badge: 'Moisture Control',
          icon: '💧',
          title: `Increase Humidity to ${catMeta.humidityRange[0]}-${catMeta.humidityRange[1]}%`,
          action: `Low humidity (${storage.humidity}%) triggers surface shriveling and water loss. Activate misting or seal in perforated packaging.`
        });
      }
    }

    // 2. Consumption & Culinary Suggestions
    if (category === 'Fresh') {
      recommendations.push({
        type: 'consumption',
        priority: 'low',
        badge: 'Peak Freshness',
        icon: '🥗',
        title: 'Ideal for Raw & Fresh Consumption',
        action: 'Produce is at sensory and nutritional peak. Recommended for premium display, raw consumption, or high-margin retail sale.'
      });
    } else if (category === 'Good') {
      recommendations.push({
        type: 'consumption',
        priority: 'low',
        badge: 'General Use',
        icon: '🍽️',
        title: 'Standard Consumption Window',
        action: `Stable quality. Maintain standard cold-chain parameters. Best consumed within ${daysLeft} days.`
      });
    } else if (category === 'Acceptable') {
      recommendations.push({
        type: 'consumption',
        priority: 'high',
        badge: 'Culinary Processing',
        icon: '🍲',
        title: 'Prioritize for Cooking / Processing',
        action: 'Visual degradation initiating. Cook, bake, stew, blend into smoothies, or freeze immediately to preserve value.'
      });
    } else if (category === 'Near Spoilage') {
      recommendations.push({
        type: 'consumption',
        priority: 'urgent',
        badge: 'Urgent Processing',
        icon: '⚠️',
        title: 'Immediate Action Required (Consume or Cook within 24h)',
        action: 'High spoilage risk. Inspect closely for deep rot. If edible, cook immediately; otherwise isolate to avoid contaminating adjacent batches.'
      });
    } else if (category === 'Spoiled') {
      recommendations.push({
        type: 'consumption',
        priority: 'critical',
        badge: 'Disposal',
        icon: '🗑️',
        title: 'Do Not Consume - Isolate for Composting',
        action: 'Item has exceeded biological safety threshold. Dispose into organic compost bin to prevent spore cross-contamination.'
      });
    }

    // 3. Inventory Rotation (FIFO / FEFO) & Retail Markdown
    if (daysLeft <= 2 && category !== 'Spoiled') {
      recommendations.push({
        type: 'inventory_rotation',
        priority: 'urgent',
        badge: 'FEFO Markdown',
        icon: '🏷️',
        title: 'Apply 40%-60% Flash Clearance Discount',
        action: `Batch has only ${daysLeft} day(s) remaining. Move to promotional front-aisle clearance or notify local food recovery foodbanks.`
      });
    }

    // 4. Waste Reduction & Cross-Contamination Prevention
    if (item.category === 'fruits' && ['Honeycrisp Apples', 'Bananas', 'Tomatoes'].some(f => item.name.includes(f))) {
      recommendations.push({
        type: 'waste_reduction',
        priority: 'medium',
        badge: 'Ethylene Segregation',
        icon: '🌱',
        title: 'Isolate from Ethylene-Sensitive Greens',
        action: 'This item emits ethylene gas. Keep segregated from leafy greens, cucumbers, and carrots to prevent premature yellowing and decay.'
      });
    }

    return recommendations;
  }
}

window.recommendationEngine = new RecommendationEngine();
