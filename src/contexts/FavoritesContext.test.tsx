import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FavoritesProvider, useFavorites } from './FavoritesContext';
import { ToastProvider } from './ToastContext';
import { savePendingFavorite } from '../utils/pendingFavorite';

const renderWithProviders = (ui: React.ReactElement) =>
  render(<ToastProvider>{ui}</ToastProvider>);

const mockIsAuthenticated = vi.hoisted(() => ({ value: true }));
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}));

const { getFavoriteIds, toggleFavorite } = vi.hoisted(() => ({
  getFavoriteIds: vi.fn(),
  toggleFavorite: vi.fn(),
}));
vi.mock('../services/favoriteService', () => ({ getFavoriteIds, toggleFavorite }));

const Probe: React.FC = () => {
  const { isFavorite, toggle, count } = useFavorites();
  return (
    <div>
      <div data-testid="count">{count}</div>
      <div data-testid="fav-variant-5">{isFavorite(undefined, 5) ? 'yes' : 'no'}</div>
      <div data-testid="fav-product-9">{isFavorite(9) ? 'yes' : 'no'}</div>
      <button onClick={() => toggle(undefined, 5)}>toggle-variant</button>
      <button onClick={() => toggle(9)}>toggle-product</button>
    </div>
  );
};

describe('FavoritesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.value = true;
    getFavoriteIds.mockResolvedValue({ productIds: [], variantIds: [] });
  });

  it('loads favorite ids on mount when authenticated', async () => {
    getFavoriteIds.mockResolvedValue({ productIds: [9], variantIds: [5] });
    renderWithProviders(<FavoritesProvider><Probe /></FavoritesProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('fav-variant-5')).toHaveTextContent('yes');
      expect(screen.getByTestId('fav-product-9')).toHaveTextContent('yes');
    });
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('does not load favorites and stays empty when not authenticated', async () => {
    mockIsAuthenticated.value = false;
    renderWithProviders(<FavoritesProvider><Probe /></FavoritesProvider>);

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(getFavoriteIds).not.toHaveBeenCalled();
  });

  // 2026-10-18: a heart tapped before logging in used to be lost on the way to the login.
  it('saves a heart tapped before logging in once the customer is logged in', async () => {
    savePendingFavorite(undefined, 5);
    toggleFavorite.mockResolvedValue({ isFavorite: true });
    renderWithProviders(<FavoritesProvider><Probe /></FavoritesProvider>);

    await waitFor(() => expect(screen.getByTestId('fav-variant-5')).toHaveTextContent('yes'));
    expect(toggleFavorite).toHaveBeenCalledWith(undefined, 5);
    expect(sessionStorage.getItem('pending_favorite')).toBeNull();
  });

  it('does not toggle a pending heart that is already a favourite (which would remove it)', async () => {
    savePendingFavorite(9, undefined);
    getFavoriteIds.mockResolvedValue({ productIds: [9], variantIds: [] });
    renderWithProviders(<FavoritesProvider><Probe /></FavoritesProvider>);

    await waitFor(() => expect(screen.getByTestId('fav-product-9')).toHaveTextContent('yes'));
    expect(toggleFavorite).not.toHaveBeenCalled();
  });

  it('toggle() optimistically flips state before the server responds', async () => {
    let resolveToggle: (v: { isFavorite: boolean }) => void = () => {};
    toggleFavorite.mockImplementation(() => new Promise(res => { resolveToggle = res; }));
    renderWithProviders(<FavoritesProvider><Probe /></FavoritesProvider>);
    await waitFor(() => expect(screen.getByTestId('fav-variant-5')).toHaveTextContent('no'));

    fireEvent.click(screen.getByText('toggle-variant'));
    await waitFor(() => expect(screen.getByTestId('fav-variant-5')).toHaveTextContent('yes'));

    resolveToggle({ isFavorite: true });
    await waitFor(() => expect(toggleFavorite).toHaveBeenCalledWith(undefined, 5));
    expect(screen.getByTestId('fav-variant-5')).toHaveTextContent('yes');
  });

  it('toggle() corrects the optimistic update to match the server response', async () => {
    toggleFavorite.mockResolvedValue({ isFavorite: false });
    renderWithProviders(<FavoritesProvider><Probe /></FavoritesProvider>);
    await waitFor(() => expect(screen.getByTestId('fav-product-9')).toHaveTextContent('no'));

    fireEvent.click(screen.getByText('toggle-product'));

    await waitFor(() => expect(screen.getByTestId('fav-product-9')).toHaveTextContent('no'));
    expect(toggleFavorite).toHaveBeenCalledWith(9, undefined);
  });

  it('toggle() reverts the optimistic update and reloads on failure', async () => {
    toggleFavorite.mockRejectedValue(new Error('network error'));
    renderWithProviders(<FavoritesProvider><Probe /></FavoritesProvider>);
    await waitFor(() => expect(getFavoriteIds).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('toggle-variant'));

    await waitFor(() => expect(getFavoriteIds).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('fav-variant-5')).toHaveTextContent('no');
  });

  it('useFavorites throws when used outside a FavoritesProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow('useFavorites must be used inside FavoritesProvider');
    console.error = consoleError;
  });
});
