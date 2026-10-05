import apiClient from '../apiClient';

export const unsubscribeFromNewsletter = async (token: string): Promise<{ message: string }> => {
  const res = await apiClient.post('/storefront/newsletter/unsubscribe', { token });
  return res.data;
};

/** Home page box. Always answers the same (the backend doesn't say whether the email was known). */
export const subscribeToNewsletter = async (email: string, acceptPrivacy: boolean): Promise<{ message: string }> => {
  const res = await apiClient.post('/storefront/newsletter/subscribe', { email, acceptPrivacy });
  return res.data;
};

/** The link from the confirmation email (double opt-in). */
export const confirmNewsletter = async (token: string): Promise<{ message: string }> => {
  const res = await apiClient.post('/storefront/newsletter/confirm', { token });
  return res.data;
};
