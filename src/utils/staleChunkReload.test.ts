import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installStaleChunkReload } from './staleChunkReload';

const fakeWindow = () => {
  const target = new EventTarget();
  const reload = vi.fn();
  return Object.assign(target, { sessionStorage: window.sessionStorage, location: { reload } }) as unknown as Window & { location: { reload: typeof reload } };
};

describe('installStaleChunkReload', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('reloads once to get the new version when a page chunk is gone', () => {
    const win = fakeWindow();
    installStaleChunkReload(win);
    const event = new Event('vite:preloadError', { cancelable: true });

    win.dispatchEvent(event);

    expect(win.location.reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not loop: a second failure right after the reload shows the error', () => {
    const win = fakeWindow();
    installStaleChunkReload(win);
    win.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
    const again = new Event('vite:preloadError', { cancelable: true });

    win.dispatchEvent(again);

    expect(win.location.reload).toHaveBeenCalledTimes(1);
    expect(again.defaultPrevented).toBe(false);
  });
});
