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

  it('clears a stale description left by a previous page instead of leaving it', () => {
    const existing = document.createElement('meta');
    existing.name = 'description';
    existing.content = 'previous page description';
    document.head.appendChild(existing);

    renderHook(() => useDocumentMeta('Title only'));

    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('');
  });

  it('collapses newlines/extra whitespace from CMS free-text descriptions', () => {
    renderHook(() => useDocumentMeta('Title', 'Line one.\n\nLine two.   Line three.'));
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Line one. Line two. Line three.');
  });

  it('truncates descriptions longer than 160 characters', () => {
    const long = 'A'.repeat(200);
    renderHook(() => useDocumentMeta('Title', long));

    const content = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(content.length).toBe(160);
    expect(content.endsWith('…')).toBe(true);
  });

  it('updates the title again when the arguments change', () => {
    const { rerender } = renderHook(({ title }) => useDocumentMeta(title), { initialProps: { title: 'First' } });
    expect(document.title).toBe('First');

    rerender({ title: 'Second' });
    expect(document.title).toBe('Second');
  });
});
