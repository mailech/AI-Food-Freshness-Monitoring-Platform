import { afterEach, describe, expect, it, vi } from 'vitest';
import { patternForSeverity } from '../utils/sound';

function makeMockContext() {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const gainNode = { gain: param(), connect: vi.fn() };
  const oscillatorNode = {
    type: '',
    frequency: param(),
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  return {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(),
    createOscillator: vi.fn(() => oscillatorNode),
    createGain: vi.fn(() => gainNode),
    __oscillator: oscillatorNode,
    __gain: gainNode,
  };
}

/** Fresh module instance per test so the cached AudioContext never leaks. */
async function freshSoundModule(mock) {
  vi.resetModules();
  vi.stubGlobal('AudioContext', vi.fn(() => mock));
  return import('../utils/sound.js');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('patternForSeverity', () => {
  it('maps each severity to its tone pattern', () => {
    expect(patternForSeverity('CRITICAL')).toHaveLength(3);
    expect(patternForSeverity('HIGH')).toHaveLength(2);
    expect(patternForSeverity('MEDIUM')).toHaveLength(2);
    expect(patternForSeverity('LOW')).toHaveLength(1);
    expect(patternForSeverity('INFO')).toHaveLength(1);
  });

  it('is case-insensitive and falls back to the default chime', () => {
    expect(patternForSeverity('critical')).toHaveLength(3);
    expect(patternForSeverity('something-else')).toEqual(patternForSeverity('INFO'));
    expect(patternForSeverity(undefined)).toEqual(patternForSeverity('INFO'));
  });
});

describe('playback guards', () => {
  it('stays silent without throwing when AudioContext is unavailable', async () => {
    vi.resetModules();
    const sound = await import('../utils/sound.js');
    expect(sound.isSoundSupported()).toBe(false);
    expect(() => sound.unlockNotificationSound()).not.toThrow();
    expect(sound.playNotificationSound('CRITICAL')).toBe(false);
    expect(sound.playTonePattern()).toBe(false);
    expect(sound.playThemeSound('dark')).toBe(false);
  });

  it('renders the pattern through the Web Audio API when available', async () => {
    const mock = makeMockContext();
    const sound = await freshSoundModule(mock);
    expect(sound.isSoundSupported()).toBe(true);
    expect(sound.playNotificationSound('HIGH')).toBe(true);
    // HIGH = two notes -> two oscillators scheduled.
    expect(mock.createOscillator).toHaveBeenCalledTimes(2);
    expect(mock.__oscillator.start).toHaveBeenCalledTimes(2);
    expect(mock.__oscillator.stop).toHaveBeenCalledTimes(2);
    expect(mock.__gain.connect).toHaveBeenCalledWith(mock.destination);
  });

  it('plays a short blip for theme changes', async () => {
    const mock = makeMockContext();
    const sound = await freshSoundModule(mock);
    expect(sound.playThemeSound('light')).toBe(true);
    expect(sound.playThemeSound('dark')).toBe(true);
    expect(mock.createOscillator).toHaveBeenCalledTimes(4);
  });
});
