import apiClient from '../apiClient';
import type { CustomerAddress, PaginatedResponse, StorefrontOrder, StorefrontOrderDetail, StorefrontProfile } from '../types';

export const getProfile = async (): Promise<StorefrontProfile> => {
  const res = await apiClient.get('/storefront/profile');
  return res.data;
};

export const updateProfile = async (data: { name: string; phone?: string; taxId?: string }): Promise<void> => {
  await apiClient.put('/storefront/profile', data);
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await apiClient.put('/storefront/profile/password', { currentPassword, newPassword });
};

export const addAddress = async (data: Partial<CustomerAddress>): Promise<CustomerAddress> => {
  const res = await apiClient.post('/storefront/profile/addresses', data);
  return res.data;
};

export const updateAddress = async (id: number, data: Partial<CustomerAddress>): Promise<void> => {
  await apiClient.put(`/storefront/profile/addresses/${id}`, data);
};

export const deleteAddress = async (id: number): Promise<void> => {
  await apiClient.delete(`/storefront/profile/addresses/${id}`);
};

export const getOrders = async (page = 1, pageSize = 10): Promise<PaginatedResponse<StorefrontOrder>> => {
  const res = await apiClient.get('/storefront/profile/orders', { params: { page, pageSize } });
  return res.data;
};

export const getOrderDetail = async (id: number): Promise<StorefrontOrderDetail> => {
  const res = await apiClient.get(`/storefront/profile/orders/${id}`);
  return res.data;
};

export const cancelOrder = async (id: number, reason?: string): Promise<void> => {
  await apiClient.post(`/storefront/profile/orders/${id}/cancel`, { reason });
};

export const requestReturn = async (id: number, reason?: string): Promise<void> => {
  await apiClient.post(`/storefront/profile/orders/${id}/return`, { reason });
};

export const downloadOrderInvoice = async (id: number): Promise<void> => {
  const response = await apiClient.get(`/storefront/profile/orders/${id}/invoice`, { responseType: 'blob' });
  const filename = response.headers['content-disposition']
    ?.match(/filename="?([^"]+)"?/)?.[1]
    ?? `FAC-${id}.pdf`;
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadMyDataExport = async (): Promise<void> => {
  const response = await apiClient.get('/storefront/profile/data-export', { responseType: 'blob' });
  const filename = response.headers['content-disposition']
    ?.match(/filename="?([^"]+)"?/)?.[1]
    ?? 'mis-datos.json';
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const requestAccountDeletion = async (reason?: string): Promise<void> => {
  await apiClient.post('/storefront/profile/deletion-request', { reason });
};
