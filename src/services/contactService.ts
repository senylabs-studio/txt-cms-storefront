import apiClient from '../apiClient';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export const submitContactForm = async (data: ContactFormData): Promise<{ message: string }> => {
  const res = await apiClient.post('/storefront/contact', data);
  return res.data;
};
