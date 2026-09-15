/**
 * Module 2: Food Inventory Management
 * Food Freshness Monitoring Platform
 */

class InventoryService {
  constructor() {}

  getItems(filter = {}) {
    let items = window.appState.getState().inventory || [];

    if (filter.category && filter.category !== 'all') {
      items = items.filter(item => item.category === filter.category);
    }
    if (filter.status && filter.status !== 'all') {
      items = items.filter(item => item.lastAssessment?.category.toLowerCase() === filter.status.toLowerCase());
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.batchNumber.toLowerCase().includes(q) ||
        item.storageLocation.toLowerCase().includes(q)
      );
    }
    return items;
  }

  getItemById(id) {
    const items = window.appState.getState().inventory || [];
    return items.find(item => item.id === id);
  }

  addItem(itemData) {
    const state = window.appState.getState();
    const id = `item_${Date.now()}`;
    const category = state.foodCategories.find(c => c.id === itemData.category) || state.foodCategories[0];
    
    // Auto-compute default expiry if not provided
    const now = new Date();
    const harvestDate = itemData.harvestDate || now.toISOString().split('T')[0];
    const expiry = new Date(now);
    expiry.setDate(now.getDate() + (category.maxShelfLifeDays || 7));
    const expiryDate = itemData.expiryDate || expiry.toISOString().split('T')[0];

    const newItem = {
      id,
      batchNumber: itemData.batchNumber || `BATCH-${now.getFullYear()}-${itemData.category.substring(0,2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: itemData.name || 'Unnamed Product',
      category: itemData.category || 'fruits',
      quantity: Number(itemData.quantity) || 10,
      unit: itemData.unit || 'kg',
      storageLocation: itemData.storageLocation || 'General Storage',
      registeredDate: now.toISOString(),
      harvestDate: harvestDate,
      expiryDate: expiryDate,
      storageConditions: {
        temperature: Number(itemData.temperature ?? 4.0),
        humidity: Number(itemData.humidity ?? 80),
        airCirculation: itemData.airCirculation || 'Medium',
        lightExposure: itemData.lightExposure || 'Minimal',
        storageDurationDays: 1
      },
      lastAssessment: itemData.initialAssessment || {
        visualScore: 90,
        storageScore: 90,
        shelfLifeScore: 90,
        productAgeScore: 95,
        overallFreshnessScore: 91.0,
        category: 'Fresh',
        spoilageProbability: 0.05,
        remainingShelfLifeDays: category.maxShelfLifeDays || 7,
        timestamp: now.toISOString(),
        spoilageIndicators: {
          colorDegradation: 0.05,
          surfaceTextureChanges: 0.03,
          moldDetected: false,
          bruisingDetected: false,
          physicalDamage: 0.01
        }
      }
    };

    const updatedInventory = [newItem, ...(state.inventory || [])];
    window.appState.update({ inventory: updatedInventory });

    // Add audit log
    const auditLog = {
      id: `aud_${Date.now()}`,
      action: `New food item registered: ${newItem.name} (${newItem.batchNumber})`,
      user: state.currentUser.name,
      timestamp: now.toISOString()
    };
    window.appState.update({
      auditLogs: [auditLog, ...(state.auditLogs || [])]
    });

    if (window.notificationService) {
      window.notificationService.showToast({
        title: 'Item Registered',
        message: `${newItem.name} has been enrolled into inventory under ${newItem.batchNumber}`,
        type: 'success'
      });
    }

    return newItem;
  }

  updateItem(id, updates) {
    const state = window.appState.getState();
    const index = state.inventory.findIndex(it => it.id === id);
    if (index === -1) return null;

    const current = state.inventory[index];
    const updated = {
      ...current,
      ...updates,
      storageConditions: {
        ...current.storageConditions,
        ...(updates.storageConditions || {})
      },
      lastAssessment: {
        ...current.lastAssessment,
        ...(updates.lastAssessment || {})
      }
    };

    const newInventory = [...state.inventory];
    newInventory[index] = updated;
    window.appState.update({ inventory: newInventory });
    return updated;
  }

  deleteItem(id) {
    const state = window.appState.getState();
    const target = state.inventory.find(i => i.id === id);
    const newInventory = state.inventory.filter(i => i.id !== id);
    window.appState.update({ inventory: newInventory });

    if (target) {
      const auditLog = {
        id: `aud_${Date.now()}`,
        action: `Deleted item: ${target.name} (${target.batchNumber})`,
        user: state.currentUser.name,
        timestamp: new Date().toISOString()
      };
      window.appState.update({
        auditLogs: [auditLog, ...(state.auditLogs || [])]
      });
    }
  }

  calculateDaysUntilExpiry(expiryDateStr) {
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getFEFOSortedInventory() {
    // First Expired, First Out sorting
    const items = [...(window.appState.getState().inventory || [])];
    return items.sort((a, b) => {
      const daysA = this.calculateDaysUntilExpiry(a.expiryDate);
      const daysB = this.calculateDaysUntilExpiry(b.expiryDate);
      return daysA - daysB;
    });
  }
}

window.inventoryService = new InventoryService();
