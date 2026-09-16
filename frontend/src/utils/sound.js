/**
 * Notification sounds, synthesized with the Web Audio API.
 *
 * No audio assets are shipped: each severity maps to a short tone pattern
 * (frequency + timing) rendered through an OscillatorNode. Everything is
 * guarded so server-side rendering, tests without AudioContext, and browsers
 * that block autoplay simply stay silent instead of throwing.
 */

const SEVERITY_PATTERN = {
  CRITICAL: [
    { frequency: 880, duration: 0.14, delay: 0 },
    { frequency: 880, duration: 0.14, delay: 0.18 },
    { frequency: 1174, duration: 0.22, delay: 0.36 },
  ],
  HIGH: [
    { frequency: 784, duration: 0.14, delay: 0 },
    { frequency: 988, duration: 0.2, delay: 0.17 },
  ],
  MEDIUM: [
    { frequency: 659, duration: 0.16, delay: 0 },
    { frequency: 659, duration: 0.16, delay: 0.2 },
  ],
  LOW: [{ frequency: 880, duration: 0.18, delay: 0 }],
  INFO: [{ frequency: 880, duration: 0.18, delay: 0 }],
};

const DEFAULT_PATTERN = SEVERITY_PATTERN.INFO;

let context = null;

/** True when the browser can actually render audio. */
export function isSoundSupported() {
  return (
    typeof window !== 'undefined' &&
    (typeof window.AudioContext === 'function' ||
      typeof window.webkitAudioContext === 'function')
  );
}

function getContext() {
  if (!isSoundSupported()) return null;
  try {
    if (!context) {
      const Constructor = window.AudioContext || window.webkitAudioContext;
      context = new Constructor();
    }
    // Autoplay policies start the context suspended until a user gesture;
    // resume() is a no-op when already running.
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

/**
 * Unlock audio on a user gesture. Call from click handlers (e.g. the mute
 * toggle) so later background chimes are allowed to play.
 */
export function unlockNotificationSound() {
  getContext();
}

/** Pattern (list of notes) used for a notification severity. */
export function patternForSeverity(severity) {
  return SEVERITY_PATTERN[String(severity || 'INFO').toUpperCase()] || DEFAULT_PATTERN;
}

/** Play one tone pattern. Never throws. */
export function playTonePattern(pattern = DEFAULT_PATTERN, { volume = 0.16 } = {}) {
  try {
    const audio = getContext();
    if (!audio) return false;
    const startedAt = audio.currentTime + 0.01;
    for (const note of pattern) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0.0001, startedAt + note.delay);
      gain.gain.exponentialRampToValueAtTime(volume, startedAt + note.delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + note.delay + note.duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(startedAt + note.delay);
      oscillator.stop(startedAt + note.delay + note.duration + 0.05);
    }
    return true;
  } catch {
    return false;
  }
}

/** Chime for an incoming notification. `severity` is INFO/LOW/MEDIUM/HIGH/CRITICAL. */
export function playNotificationSound(severity = 'INFO') {
  return playTonePattern(patternForSeverity(severity));
}

const THEME_PATTERNS = {
  // Switching to light: bright rising blip. To dark: soft falling blip.
  light: [
    { frequency: 523, duration: 0.09, delay: 0 },
    { frequency: 784, duration: 0.12, delay: 0.1 },
  ],
  dark: [
    { frequency: 784, duration: 0.09, delay: 0 },
    { frequency: 523, duration: 0.12, delay: 0.1 },
  ],
};

/** Short blip when the theme changes. `nextTheme` is 'light' or 'dark'. */
export function playThemeSound(nextTheme = 'light') {
  const pattern = THEME_PATTERNS[nextTheme] || THEME_PATTERNS.light;
  return playTonePattern(pattern, { volume: 0.12 });
}
