import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

export { describe, it, expect, beforeEach, afterEach, vi };
