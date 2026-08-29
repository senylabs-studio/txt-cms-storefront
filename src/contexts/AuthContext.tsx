import React, { createContext, useContext, useState } from 'react';
import type { AuthResponse } from '../types';

interface AuthState {
  token: string | null;
  customerId: number | null;
  name: string;
  email: string;
  isGuest: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: AuthResponse) => void;
  logout: () => void;
  setIsGuest: (isGuest: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('storefront_token');
    const user = localStorage.getItem('storefront_user');
    if (token && user) {
      const u = JSON.parse(user);
      return { token, customerId: u.customerId, name: u.name, email: u.email, isGuest: !!u.isGuest, isAuthenticated: true };
    }
    return { token: null, customerId: null, name: '', email: '', isGuest: false, isAuthenticated: false };
  });

  const login = (data: AuthResponse) => {
    localStorage.setItem('storefront_token', data.token);
    localStorage.setItem('storefront_user', JSON.stringify({ customerId: data.customerId, name: data.name, email: data.email, isGuest: !!data.isGuest }));
    setState({ token: data.token, customerId: data.customerId, name: data.name, email: data.email, isGuest: !!data.isGuest, isAuthenticated: true });
  };

  const logout = () => {
    localStorage.removeItem('storefront_token');
    localStorage.removeItem('storefront_user');
    setState({ token: null, customerId: null, name: '', email: '', isGuest: false, isAuthenticated: false });
  };

  // Flips the locally-tracked guest flag once the account has been converted to a real one
  // (ConvertGuest already returns a fresh non-guest token, but the caller may prefer to just
  // update this in place rather than re-running the whole `login` flow).
  const setIsGuest = (isGuest: boolean) => {
    setState(prev => {
      const user = localStorage.getItem('storefront_user');
      if (user) localStorage.setItem('storefront_user', JSON.stringify({ ...JSON.parse(user), isGuest }));
      return { ...prev, isGuest };
    });
  };

  return <AuthContext.Provider value={{ ...state, login, logout, setIsGuest }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
