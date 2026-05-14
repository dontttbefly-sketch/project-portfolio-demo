import '@testing-library/jest-dom/vitest';

const storage = (() => {
  let values = new Map<string, string>();

  return {
    clear: () => {
      values = new Map();
    },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, String(value));
    },
    get length() {
      return values.size;
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: storage
});

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: storage
});
