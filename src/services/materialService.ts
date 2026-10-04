import apiClient from '../apiClient';

/** Material name (in any of the shop's languages) → fibre code (CO, PES…). */
export const getMaterialAbbreviations = async (): Promise<Record<string, string>> => {
  const res = await apiClient.get('/storefront/materials/abbreviations');
  return res.data;
};
