import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    __proto__: {
      setItem: vi.fn(),
      getItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
  },
  writable: true,
});

// Ensure process.nextTick exists without replacing the whole process object
// Some environments (jsdom) may not provide a full Node `process` impl.
// We only define `nextTick` if missing to avoid breaking methods like `emit`.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof process !== 'undefined' && typeof process.nextTick !== 'function') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  process.nextTick = (fn: () => void): void => {
    setTimeout(fn, 0);
  };
}

// Soften noisy React warnings that don't affect assertions in our suite.
// These warnings can flood output and cause OOM in CI when many async state
// updates happen during provider effects.
const originalConsoleError = console.error;
console.error = (...args: unknown[]): void => {
  const [first] = args as [unknown];
  if (
    typeof first === 'string' &&
    (first.includes('not wrapped in act(...)') ||
      first.includes('Each child in a list should have a unique "key" prop'))
  ) {
    return; // ignore these specific, noisy warnings during tests
  }
  originalConsoleError(...args);
};
