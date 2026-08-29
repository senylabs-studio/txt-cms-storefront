import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import type { AuthResponse } from '../types';

const authResponse: AuthResponse = {
  token: 'abc123',
  customerId: 7,
  name: 'Jane Doe',
  email: 'jane@example.com',
};

const Probe: React.FC = () => {
  const { isAuthenticated, token, customerId, name, email, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="state">
        {JSON.stringify({ isAuthenticated, token, customerId, name, email })}
      </div>
      <button onClick={() => login(authResponse)}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts unauthenticated when localStorage is empty', () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
  });

  it('hydrates from localStorage on mount', () => {
    localStorage.setItem('storefront_token', 'stored-token');
    localStorage.setItem('storefront_user', JSON.stringify({ customerId: 3, name: 'Stored', email: 's@e.com' }));

    render(<AuthProvider><Probe /></AuthProvider>);
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state).toEqual({ isAuthenticated: true, token: 'stored-token', customerId: 3, name: 'Stored', email: 's@e.com' });
  });

  it('login() persists to localStorage and updates state', () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    fireEvent.click(screen.getByText('login'));

    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state).toEqual({ isAuthenticated: true, token: 'abc123', customerId: 7, name: 'Jane Doe', email: 'jane@example.com' });
    expect(localStorage.getItem('storefront_token')).toBe('abc123');
    expect(JSON.parse(localStorage.getItem('storefront_user')!)).toEqual({ customerId: 7, name: 'Jane Doe', email: 'jane@example.com', isGuest: false });
  });

  it('logout() clears localStorage and resets state', () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    fireEvent.click(screen.getByText('login'));
    fireEvent.click(screen.getByText('logout'));

    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state).toEqual({ isAuthenticated: false, token: null, customerId: null, name: '', email: '' });
    expect(localStorage.getItem('storefront_token')).toBeNull();
    expect(localStorage.getItem('storefront_user')).toBeNull();
  });

  it('useAuth throws when used outside an AuthProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow('useAuth must be used inside AuthProvider');
    console.error = consoleError;
  });
});
