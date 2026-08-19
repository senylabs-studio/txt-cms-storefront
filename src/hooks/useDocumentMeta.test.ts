import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentMeta } from './useDocumentMeta';

describe('useDocumentMeta', () => {
  afterEach(() => {
    document.title = '';
    document.querySelector('meta[name="description"]')?.remove();
  });

  it('sets document.title', () => {
    renderHook(() => useDocumentMeta('Product X — Shop'));
    expect(document.title).toBe('Product X — Shop');
  });

  it('creates a meta description tag when none exists', () => {
    renderHook(() => useDocumentMeta('Title', 'A great product.'));
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('A great product.');
  });

  it('reuses an existing meta description tag instead of duplicating it', () => {
    const existing = document.createElement('meta');
    existing.name = 'description';
    existing.content = 'old';
    document.head.appendChild(existing);

    renderHook(() => useDocumentMeta('Title', 'new'));

    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('new');
  });

  it('does not touch the description tag when none is provided', () => {
    renderHook(() => useDocumentMeta('Title only'));
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });

  it('updates the title again when the arguments change', () => {
    const { rerender } = renderHook(({ title }) => useDocumentMeta(title), { initialProps: { title: 'First' } });
    expect(document.title).toBe('First');

    rerender({ title: 'Second' });
    expect(document.title).toBe('Second');
  });
});
