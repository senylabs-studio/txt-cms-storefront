import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../i18n';
import { updatePreferredLanguage } from '../services/profileService';
import type { AuthResponse } from '../types';
import { SESSION_EXPIRED_EVENT, isTokenExpired } from '../utils/session';

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
  updateUser: (patch: { name?: string; email?: string }) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('storefront_token');
    const user = localStorage.getItem('storefront_user');
    // An expired token isn't a session: restored as one, the first API call on any page got a
    // 401 and threw the visitor to the login page.
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('storefront_token');
      localStorage.removeItem('storefront_user');
    } else if (token && user) {
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

  // The API refused the session (apiClient already cleared it): reflect it without a reload.
  useEffect(() => {
    const onExpired = () => setState({ token: null, customerId: null, name: '', email: '', isGuest: false, isAuthenticated: false });
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

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

  // Keeps the header (and stored session) in step after a profile name/email change — it used to
  // show the old name until the next login, up to 7 days later.
  const updateUser = (patch: { name?: string; email?: string }) => {
    setState(prev => {
      const user = localStorage.getItem('storefront_user');
      if (user) localStorage.setItem('storefront_user', JSON.stringify({ ...JSON.parse(user), ...patch }));
      return { ...prev, ...patch };
    });
  };

  // Emails go out in the customer's saved preferred language, which the backend only set at
  // login/register — switching language mid-session kept emails in the old one.
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const sync = (lng: string) => { updatePreferredLanguage(lng.split('-')[0]).catch(() => {}); };
    i18n.on('languageChanged', sync);
    return () => { i18n.off('languageChanged', sync); };
  }, [state.isAuthenticated]);

  return <AuthContext.Provider value={{ ...state, login, logout, setIsGuest, updateUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
