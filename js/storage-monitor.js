/**
 * Module 6: Storage Condition Monitoring & IoT Sensor Telemetry
 * Food Freshness Monitoring Platform
 */

class StorageMonitorService {
  constructor() {
    this.zones = [
      { id: 'chiller1', name: 'Cold Chiller Unit 1 (Produce & Seafood)', targetTemp: 2.0, targetHum: 88, tempTol: 2.5, humTol: 10 },
      { id: 'chiller2', name: 'Dairy & Meat Chiller Unit 2', targetTemp: 2.5, targetHum: 72, tempTol: 2.0, humTol: 8 },
      { id: 'warehouseBay1', name: 'Vegetable Staging Bay 1', targetTemp: 12.0, targetHum: 75, tempTol: 4.0, humTol: 15 },
      { id: 'ambientZone', name: 'Dry Ambient Store (Bakery & Packaged)', targetTemp: 20.0, targetHum: 45, tempTol: 4.0, humTol: 15 }
    ];

    this.timer = null;
    this.startLiveTelemetryStream();
  }

  startLiveTelemetryStream() {
    if (this.timer) clearInterval(this.timer);
    
    // Simulate real-time IoT sensor telemetry ticks every 6 seconds
    this.timer = setInterval(() => {
      this.tickSensorReadings();
    }, 6000);
  }

  tickSensorReadings() {
    const state = window.appState.getState();
    const curTelemetry = { ...state.iotLiveTelemetry };
    let hasAlert = false;

    this.zones.forEach(zone => {
      const current = curTelemetry[zone.id] || { temp: zone.targetTemp, humidity: zone.targetHum, airflow: 85, light: 50 };
      
      // Add subtle environmental drift
      const tempDelta = (Math.random() - 0.49) * 0.4;
      const humDelta = (Math.random() - 0.49) * 0.8;
      
      const newTemp = Number(Math.max(-5, Math.min(45, current.temp + tempDelta)).toFixed(1));
      const newHum = Number(Math.max(10, Math.min(100, current.humidity + humDelta)).toFixed(1));
      const newAirflow = Math.max(40, Math.min(100, Math.round(current.airflow + (Math.random() - 0.5) * 2)));
      const newLight = Math.max(0, Math.min(800, Math.round(current.light + (Math.random() - 0.5) * 5)));

      // Compliance evaluation
      const tempViolation = Math.abs(newTemp - zone.targetTemp) > zone.tempTol;
      const humViolation = Math.abs(newHum - zone.targetHum) > zone.humTol;

      let status = 'optimal';
      if (tempViolation || humViolation) {
        status = (Math.abs(newTemp - zone.targetTemp) > zone.tempTol * 1.8) ? 'critical' : 'warning';
      }

      curTelemetry[zone.id] = {
        temp: newTemp,
        humidity: newHum,
        airflow: newAirflow,
        light: newLight,
        status,
        lastCheck: new Date().toISOString()
      };

      // Trigger automatic notification if critical
      if (status === 'critical' && Math.random() < 0.3) {
        hasAlert = true;
        this.triggerStorageAlert(zone, newTemp, newHum);
      }
    });

    window.appState.update({ iotLiveTelemetry: curTelemetry });
  }

  triggerStorageAlert(zone, temp, hum) {
    const newAlert = {
      id: `alt_${Date.now()}`,
      type: 'storage_compliance',
      severity: 'high',
      title: `Critical Environmental Excursion: ${zone.name}`,
      message: `Sensors detected critical deviation! Temperature: ${temp}°C (Target: ${zone.targetTemp}°C), Humidity: ${hum}% (Target: ${zone.targetHum}%). Microbial spoilage acceleration detected.`,
      timestamp: new Date().toISOString(),
      read: false
    };

    const alerts = [newAlert, ...(window.appState.getState().alerts || [])].slice(0, 25);
    window.appState.update({ alerts });

    if (window.notificationService) {
      window.notificationService.notifyCritical(newAlert.title, newAlert.message);
    }
  }

  /**
   * Interactive scenario simulator for testing and demonstrations:
   * e.g. "Chiller Compressor Malfunction", "Cooling Restored", "Humidity Dehumidifier Failure"
   */
  simulateEnvironmentalIncident(zoneId, incidentType) {
    const state = window.appState.getState();
    const telemetry = { ...state.iotLiveTelemetry };
    const zone = this.zones.find(z => z.id === zoneId) || this.zones[0];
    const target = telemetry[zone.id] || { temp: zone.targetTemp, humidity: zone.targetHum, airflow: 80, light: 30 };

    if (incidentType === 'cooling_failure') {
      target.temp = Number((target.temp + 9.5).toFixed(1));
      target.humidity = Math.min(98, Number((target.humidity + 20).toFixed(1)));
      target.status = 'critical';
    } else if (incidentType === 'humidity_drop') {
      target.humidity = Math.max(25, Number((target.humidity - 35).toFixed(1)));
      target.status = 'warning';
    } else if (incidentType === 'airflow_blockage') {
      target.airflow = 25;
      target.status = 'warning';
    } else if (incidentType === 'restore_optimal') {
      target.temp = zone.targetTemp;
      target.humidity = zone.targetHum;
      target.airflow = 92;
      target.light = 20;
      target.status = 'optimal';
    }

    telemetry[zone.id] = target;
    window.appState.update({ iotLiveTelemetry: telemetry });

    // Re-assess all inventory items located in this storage room
    this.recalculateInventoryInLocation(zone.name);

    if (incidentType !== 'restore_optimal') {
      this.triggerStorageAlert(zone, target.temp, target.humidity);
    } else if (window.notificationService) {
      window.notificationService.showToast({
        title: 'Environment Restored',
        message: `${zone.name} conditions returned to calibrated optimal parameters.`,
        type: 'success'
      });
    }
  }

  recalculateInventoryInLocation(locationSubstring) {
    const items = window.inventoryService.getItems();
    items.forEach(item => {
      // Re-evaluate item freshness score based on updated telemetry
      const assessment = window.freshnessScoringEngine.assessFreshness({
        visualScore: item.lastAssessment.visualScore,
        storageConditions: item.storageConditions,
        category: item.category,
        harvestDate: item.harvestDate,
        spoilageIndicators: item.lastAssessment.spoilageIndicators
      });
      window.inventoryService.updateItem(item.id, { lastAssessment: assessment });
    });
  }

  validateCompliance(storageConditions, categoryId) {
    const categories = window.appState.getState().foodCategories;
    const cat = categories.find(c => c.id === categoryId) || categories[0];
    const score = window.freshnessScoringEngine.calculateStorageConditionScore(storageConditions, cat);
    return {
      compliant: score >= 75,
      score,
      tempSafe: storageConditions.temperature >= cat.tempRange[0] && storageConditions.temperature <= cat.tempRange[1],
      humiditySafe: storageConditions.humidity >= cat.humidityRange[0] && storageConditions.humidity <= cat.humidityRange[1],
      optimalRanges: {
        temp: `${cat.tempRange[0]}°C to ${cat.tempRange[1]}°C`,
        humidity: `${cat.humidityRange[0]}% to ${cat.humidityRange[1]}%`
      }
    };
  }
}

window.storageMonitorService = new StorageMonitorService();
