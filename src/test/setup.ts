import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Not using Vitest's `globals: true`, so RTL's own auto-cleanup (which relies
// on a global afterEach) never registers — without this, every render() in a
// test file leaks into the next test's DOM.
afterEach(async () => {
  cleanup();
  // react-bootstrap's Offcanvas/Modal finish their enter/exit transitions on a short
  // dom-helpers timer. Let it fire while jsdom still exists: otherwise, on a slow CI runner, it
  // can fire after the last test of a file has torn the environment down and throw
  // "ReferenceError: document is not defined" — an unhandled error that fails the whole run
  // even though every test passed.
  await new Promise(resolve => setTimeout(resolve, 20));
});
