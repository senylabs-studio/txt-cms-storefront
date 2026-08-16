import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Not using Vitest's `globals: true`, so RTL's own auto-cleanup (which relies
// on a global afterEach) never registers — without this, every render() in a
// test file leaks into the next test's DOM.
afterEach(() => {
  cleanup();
});
