import apiClient from '../apiClient';
import type { GiftCardBalance, GiftCardConfig } from '../types';

export const getGiftCardConfig = async (): Promise<GiftCardConfig> => {
  const res = await apiClient.get('/storefront/gift-cards/config');
  return res.data;
};

export const checkGiftCardBalance = async (code: string): Promise<GiftCardBalance> => {
  const res = await apiClient.post('/storefront/gift-cards/balance', { code });
  return res.data;
};

/** Downloads the printable letter of a card the logged-in customer bought. */
export const downloadGiftCardLetter = async (giftCardId: number, code: string): Promise<void> => {
  const response = await apiClient.get(`/storefront/gift-cards/${giftCardId}/letter`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `tarjeta-regalo-${code}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
