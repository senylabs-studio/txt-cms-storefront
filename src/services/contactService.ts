import apiClient from '../apiClient';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
  // Required by the API (RGPD): the sender accepted the privacy policy.
  acceptPrivacy: boolean;
}

export const submitContactForm = async (data: ContactFormData): Promise<{ message: string }> => {
  const res = await apiClient.post('/storefront/contact', data);
  return res.data;
};
