import apiClient from '../apiClient';

export interface StorefrontLanguage {
  id: number;
  name: string;
  code: string;
  isDefault: boolean;
}

export const getLanguages = async (): Promise<StorefrontLanguage[]> => {
  const res = await apiClient.get('/storefront/languages');
  return res.data;
};
