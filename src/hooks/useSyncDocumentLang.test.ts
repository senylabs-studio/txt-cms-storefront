import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const listeners: Record<string, ((lng: string) => void)[]> = {};
const mockI18n = {
  language: 'es',
  on: vi.fn((event: string, handler: (lng: string) => void) => {
    (listeners[event] ??= []).push(handler);
  }),
  off: vi.fn((event: string, handler: (lng: string) => void) => {
    listeners[event] = (listeners[event] ?? []).filter(h => h !== handler);
  }),
};

vi.mock('../i18n', () => ({ default: mockI18n }));

describe('useSyncDocumentLang', () => {
  beforeEach(() => {
    document.documentElement.lang = 'es';
    listeners['languageChanged'] = [];
    mockI18n.language = 'es';
  });

  it('sets html lang to the current i18n language on mount', async () => {
    mockI18n.language = 'en';
    const { useSyncDocumentLang } = await import('./useSyncDocumentLang');

    renderHook(() => useSyncDocumentLang());

    expect(document.documentElement.lang).toBe('en');
  });

  it('updates html lang when i18next fires languageChanged', async () => {
    const { useSyncDocumentLang } = await import('./useSyncDocumentLang');
    renderHook(() => useSyncDocumentLang());

    listeners['languageChanged'].forEach(handler => handler('ca'));

    expect(document.documentElement.lang).toBe('ca');
  });

  it('unsubscribes on unmount', async () => {
    const { useSyncDocumentLang } = await import('./useSyncDocumentLang');
    const { unmount } = renderHook(() => useSyncDocumentLang());

    unmount();

    expect(mockI18n.off).toHaveBeenCalledWith('languageChanged', expect.any(Function));
  });
});
