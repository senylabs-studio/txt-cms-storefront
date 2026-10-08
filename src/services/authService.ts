import apiClient from '../apiClient';
import type { AuthResponse } from '../types';

export const register = async (data: { name: string; email: string; password: string; phone?: string; taxId?: string; subscribeToNewsletter?: boolean }): Promise<AuthResponse> => {
  const res = await apiClient.post('/storefront/auth/register', data);
  return res.data;
};

export const login = async (data: { email: string; password: string }): Promise<AuthResponse> => {
  const res = await apiClient.post('/storefront/auth/login', data);
  return res.data;
};

export const guestCheckout = async (data: { name: string; email: string }): Promise<AuthResponse> => {
  const res = await apiClient.post('/storefront/auth/guest', data);
  return res.data;
};

export const convertGuestAccount = async (password: string): Promise<AuthResponse> => {
  const res = await apiClient.post('/storefront/auth/guest/convert', { password });
  return res.data;
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const res = await apiClient.post('/storefront/auth/forgot-password', { email });
  return res.data;
};

export const resetPassword = async (data: { email: string; token: string; newPassword: string }): Promise<{ message: string }> => {
  const res = await apiClient.post('/storefront/auth/reset-password', data);
  return res.data;
};

export const requestGuestAccessLink = async (data: { email: string; orderNumber: number }): Promise<{ message: string }> => {
  const res = await apiClient.post('/storefront/auth/guest/access-link', data);
  return res.data;
};

export const confirmEmail = async (userId: string, token: string): Promise<void> => {
  await apiClient.post('/storefront/auth/confirm-email', { userId, token });
};

/** Applies the change and signs in (the change ended every session of the account). Null when
 *  the change had already been applied (a second click): confirmed, but no session comes back. */
export const confirmEmailChange = async (userId: string, email: string, token: string): Promise<AuthResponse | null> => {
  const res = await apiClient.post('/storefront/auth/confirm-email-change', { userId, email, token });
  return res.data?.token ? res.data : null;
};

export const verifyGuestAccessLink = async (token: string): Promise<AuthResponse> => {
  const res = await apiClient.post('/storefront/auth/guest/access-link/verify', { token });
  return res.data;
};
