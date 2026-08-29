import apiClient from '../apiClient';
import type { AuthResponse } from '../types';

export const register = async (data: { name: string; email: string; password: string; phone?: string; taxId?: string }): Promise<AuthResponse> => {
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

export const verifyGuestAccessLink = async (token: string): Promise<AuthResponse> => {
  const res = await apiClient.post('/storefront/auth/guest/access-link/verify', { token });
  return res.data;
};
