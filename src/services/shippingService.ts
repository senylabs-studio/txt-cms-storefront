import apiClient from '../apiClient';

export interface ApplicableShippingRate {
  name: string;
  price: number;
  freeShippingThreshold?: number;
  shippingCost: number;
  isFree: boolean;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
}

export const getApplicableShippingRate = async (
  country: string,
  cartTotal: number
): Promise<ApplicableShippingRate | null> => {
  try {
    const res = await apiClient.get('/storefront/shipping/applicable', {
      params: { country, cartTotal },
    });
    return res.data;
  } catch {
    return null;
  }
};
