import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

// jsdom does not implement matchMedia, which the responsive hooks rely on.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Object URLs are used by the image preview and report download flows.
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = () => 'blob:mock';
}
if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = () => {};
}

// Recharts measures its container; jsdom always reports 0.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};