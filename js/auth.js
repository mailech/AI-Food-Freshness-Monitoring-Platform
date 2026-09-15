/**
 * Module 1: User Authentication & Role-Based Access Control
 * Food Freshness Monitoring Platform
 */

const ROLES_CONFIG = {
  consumer: {
    id: 'consumer',
    label: 'Consumer',
    icon: '🛒',
    description: 'Personal food pantry, expiry tracker, freshness scanning & storage tips',
    permissions: ['scan_food', 'view_consumer_dash', 'export_simple_report']
  },
  retail_manager: {
    id: 'retail_manager',
    label: 'Retail Manager',
    icon: '🏬',
    description: 'Store inventory freshness, shelf-life clearance, waste reduction analytics',
    permissions: ['scan_food', 'manage_inventory', 'view_retail_dash', 'adjust_pricing', 'export_reports']
  },
  warehouse_operator: {
    id: 'warehouse_operator',
    label: 'Warehouse Operator',
    icon: '🏭',
    description: 'Cold-chain compliance, bulk batch intake, ambient and chiller sensors',
    permissions: ['scan_food', 'manage_batches', 'view_warehouse_dash', 'control_iot_sensors', 'export_reports']
  },
  quality_inspector: {
    id: 'quality_inspector',
    label: 'Food Quality Inspector',
    icon: '🔬',
    description: 'Deep defect inspection, Transformer Attention heatmaps, compliance certification',
    permissions: ['scan_food', 'view_inspector_dash', 'certify_batches', 'run_ai_diagnostics', 'export_reports', 'sign_certificates']
  },
  admin: {
    id: 'admin',
    label: 'Platform Administrator',
    icon: '⚡',
    description: 'User control, system health, AI Model Security & Poisoning Defense Suite',
    permissions: ['*'] // Superuser
  }
};

class AuthService {
  constructor() {
    this.roles = ROLES_CONFIG;
  }

  getCurrentUser() {
    return window.appState.getState().currentUser;
  }

  switchRole(roleId) {
    if (!this.roles[roleId]) {
      console.error(`Invalid role: ${roleId}`);
      return false;
    }

    const state = window.appState.getState();
    const roleMeta = this.roles[roleId];

    const updatedUser = {
      ...state.currentUser,
      role: roleId,
      name: roleId === 'consumer' ? 'Alex Rivera' :
            roleId === 'retail_manager' ? 'Marcus Vance (Store #104)' :
            roleId === 'warehouse_operator' ? 'David Chen (Cold Hub)' :
            roleId === 'quality_inspector' ? 'Dr. Sarah Jenkins' : 'System Administrator',
      email: `${roleId}@freshguard.io`,
      token: this.generateMockJWT(roleId),
      avatar: roleMeta.icon
    };

    window.appState.update({ currentUser: updatedUser });

    // Add audit log
    const auditLog = {
      id: `aud_${Date.now()}`,
      action: `User session switched to role: ${roleMeta.label}`,
      user: updatedUser.name,
      timestamp: new Date().toISOString()
    };
    window.appState.update({
      auditLogs: [auditLog, ...(window.appState.getState().auditLogs || [])]
    });

    if (window.notificationService) {
      window.notificationService.showToast({
        title: `Switched to ${roleMeta.label}`,
        message: `Active profile updated with ${roleMeta.label} privileges.`,
        type: 'info'
      });
    }

    return true;
  }

  generateMockJWT(roleId) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: 'usr_active',
      role: roleId,
      iss: 'FreshGuard-Auth-Service',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400
    }));
    const signature = btoa(`sig_${roleId}_secure_token_freshness_engine_2026`);
    return `${header}.${payload}.${signature}`;
  }

  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user || !user.role) return false;
    if (user.role === 'admin') return true;

    const roleConfig = this.roles[user.role];
    if (!roleConfig) return false;

    return roleConfig.permissions.includes(permission) || roleConfig.permissions.includes('*');
  }

  decodeJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1]));
    } catch (e) {
      return null;
    }
  }

  updateProfile(profileData) {
    const user = this.getCurrentUser();
    const updated = { ...user, ...profileData };
    window.appState.update({ currentUser: updated });
    return updated;
  }
}

// Attach to window
window.authService = new AuthService();
