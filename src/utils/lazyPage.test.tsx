import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { lazyPage } from './lazyPage';

describe('lazyPage', () => {
  beforeEach(() => sessionStorage.clear());

  it('renders the page once its chunk loads', async () => {
    const Page = lazyPage(() => Promise.resolve({ default: () => <p>Cargada</p> }));
    render(<Suspense fallback={null}><Page /></Suspense>);
    expect(await screen.findByText('Cargada')).toBeInTheDocument();
  });

  // After a deploy the old chunk names 404: reload once to get the new ones.
  it('reloads the page once when the chunk is gone', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true });
    const Page = lazyPage(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
    render(<Suspense fallback={<p>…</p>}><Page /></Suspense>);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem('lazyPageReloadedAt')).not.toBeNull();
  });
});
