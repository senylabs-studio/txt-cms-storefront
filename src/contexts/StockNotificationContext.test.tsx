import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StockNotificationProvider, useStockNotifications } from './StockNotificationContext';

const mockIsAuthenticated = vi.hoisted(() => ({ value: true }));
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}));

const { getStockNotificationIds, toggleStockNotification } = vi.hoisted(() => ({
  getStockNotificationIds: vi.fn(),
  toggleStockNotification: vi.fn(),
}));
vi.mock('../services/stockNotificationService', () => ({ getStockNotificationIds, toggleStockNotification }));

const Probe: React.FC = () => {
  const { isRequested, toggle } = useStockNotifications();
  return (
    <div>
      <div data-testid="req-variant-5">{isRequested(undefined, 5) ? 'yes' : 'no'}</div>
      <div data-testid="req-product-9">{isRequested(9) ? 'yes' : 'no'}</div>
      <button onClick={() => toggle(undefined, 5)}>toggle-variant</button>
      <button onClick={() => toggle(9)}>toggle-product</button>
    </div>
  );
};

describe('StockNotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.value = true;
    getStockNotificationIds.mockResolvedValue({ productIds: [], variantIds: [] });
  });

  it('loads pending request ids on mount when authenticated', async () => {
    getStockNotificationIds.mockResolvedValue({ productIds: [9], variantIds: [5] });
    render(<StockNotificationProvider><Probe /></StockNotificationProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('req-variant-5')).toHaveTextContent('yes');
      expect(screen.getByTestId('req-product-9')).toHaveTextContent('yes');
    });
  });

  it('does not load requests and stays empty when not authenticated', async () => {
    mockIsAuthenticated.value = false;
    render(<StockNotificationProvider><Probe /></StockNotificationProvider>);

    await waitFor(() => expect(screen.getByTestId('req-variant-5')).toHaveTextContent('no'));
    expect(getStockNotificationIds).not.toHaveBeenCalled();
  });

  it('toggle() optimistically flips state before the server responds', async () => {
    let resolveToggle: (v: { isRequested: boolean }) => void = () => {};
    toggleStockNotification.mockImplementation(() => new Promise(res => { resolveToggle = res; }));
    render(<StockNotificationProvider><Probe /></StockNotificationProvider>);
    await waitFor(() => expect(screen.getByTestId('req-variant-5')).toHaveTextContent('no'));

    fireEvent.click(screen.getByText('toggle-variant'));
    await waitFor(() => expect(screen.getByTestId('req-variant-5')).toHaveTextContent('yes'));

    resolveToggle({ isRequested: true });
    await waitFor(() => expect(toggleStockNotification).toHaveBeenCalledWith(undefined, 5));
    expect(screen.getByTestId('req-variant-5')).toHaveTextContent('yes');
  });

  it('toggle() corrects the optimistic update to match the server response', async () => {
    toggleStockNotification.mockResolvedValue({ isRequested: false });
    render(<StockNotificationProvider><Probe /></StockNotificationProvider>);
    await waitFor(() => expect(screen.getByTestId('req-product-9')).toHaveTextContent('no'));

    fireEvent.click(screen.getByText('toggle-product'));

    await waitFor(() => expect(screen.getByTestId('req-product-9')).toHaveTextContent('no'));
    expect(toggleStockNotification).toHaveBeenCalledWith(9, undefined);
  });

  it('toggle() reverts the optimistic update and reloads on failure', async () => {
    toggleStockNotification.mockRejectedValue(new Error('network error'));
    render(<StockNotificationProvider><Probe /></StockNotificationProvider>);
    await waitFor(() => expect(getStockNotificationIds).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('toggle-variant'));

    await waitFor(() => expect(getStockNotificationIds).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('req-variant-5')).toHaveTextContent('no');
  });

  it('useStockNotifications throws when used outside a StockNotificationProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow('useStockNotifications must be used inside StockNotificationProvider');
    console.error = consoleError;
  });
});
