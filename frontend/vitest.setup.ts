import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// React Testing Library does not auto-clean between tests under Vitest.
afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
  } catch {
    // No storage in this environment; nothing to clear.
  }
});

// jsdom omits a few browser APIs that next-themes and Radix primitives probe
// during render. Provide inert stand-ins so component tests stay deterministic.
// A loosely-typed view of window avoids narrowing known globals to `never`.
if (typeof window !== "undefined") {
  const testWindow = window as unknown as {
    matchMedia?: (query: string) => MediaQueryList;
    ResizeObserver?: typeof ResizeObserver;
    localStorage?: Storage;
  };

  if (!testWindow.matchMedia) {
    testWindow.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      }) as unknown as MediaQueryList;
  }

  if (!testWindow.ResizeObserver) {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    testWindow.ResizeObserver =
      ResizeObserverStub as unknown as typeof ResizeObserver;
  }

  // Node 26 exposes an experimental global localStorage that is unavailable
  // without a backing file, which shadows jsdom's. Install a simple in-memory
  // store so preference persistence is testable and deterministic.
  if (!testWindow.localStorage) {
    const store = new Map<string, string>();
    const memoryStorage: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (key: string) => {
        store.delete(key);
      },
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
    };
    Object.defineProperty(testWindow, "localStorage", {
      value: memoryStorage,
      configurable: true,
    });
  }
}
