/**
 * Module 10: Notification & Alert System
 * Food Freshness Monitoring Platform
 */

class NotificationService {
  constructor() {
    this.audioCtx = null;
    this.initToastContainer();
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playChime(frequency = 880, type = 'sine', duration = 0.25) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio playback might be silenced by browser policies until first user click
    }
  }

  playCriticalAlarm() {
    this.playChime(660, 'triangle', 0.15);
    setTimeout(() => this.playChime(880, 'sawtooth', 0.25), 180);
  }

  initToastContainer() {
    if (!document.getElementById('toast-container')) {
      const div = document.createElement('div');
      div.id = 'toast-container';
      div.className = 'toast-container';
      document.body.appendChild(div);
    }
  }

  showToast({ title, message, type = 'info', duration = 4500 }) {
    this.initToastContainer();
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast-card toast-${type} animate-slide-in`;

    const iconMap = {
      success: '✅',
      warning: '⚠️',
      danger: '🚨',
      critical: '🚨',
      info: 'ℹ️'
    };

    toast.innerHTML = `
      <div class="toast-icon">${iconMap[type] || '🔔'}</div>
      <div class="toast-body">
        <h4 class="toast-title">${title}</h4>
        <p class="toast-message">${message}</p>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    if (type === 'critical' || type === 'danger') {
      this.playCriticalAlarm();
    } else {
      this.playChime(520, 'sine', 0.15);
    }

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  notifyCritical(title, message) {
    this.showToast({ title, message, type: 'critical', duration: 7000 });
  }

  getAlerts(filter = 'all') {
    const alerts = window.appState.getState().alerts || [];
    if (filter === 'unread') return alerts.filter(a => !a.read);
    if (filter === 'high') return alerts.filter(a => a.severity === 'high');
    return alerts;
  }

  markAllAsRead() {
    const alerts = (window.appState.getState().alerts || []).map(a => ({ ...a, read: true }));
    window.appState.update({ alerts });
  }

  markAsRead(id) {
    const alerts = (window.appState.getState().alerts || []).map(a => 
      a.id === id ? { ...a, read: true } : a
    );
    window.appState.update({ alerts });
  }

  clearAlerts() {
    window.appState.update({ alerts: [] });
  }
}

window.notificationService = new NotificationService();
