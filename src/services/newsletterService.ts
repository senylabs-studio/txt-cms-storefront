import apiClient from '../apiClient';

export const unsubscribeFromNewsletter = async (token: string): Promise<{ message: string }> => {
  const res = await apiClient.post('/storefront/newsletter/unsubscribe', { token });
  return res.data;
};
