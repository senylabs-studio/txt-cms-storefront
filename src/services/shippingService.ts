import apiClient from '../apiClient';

export interface ApplicableShippingRate {
  name: string;
  price: number;
  freeShippingThreshold?: number;
  shippingCost: number;
  isFree: boolean;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  /** Canarias, Ceuta, Melilla or outside the EU: the order is charged without VAT (export). */
  vatExempt?: boolean;
  vatPercent?: number;
}

export const getApplicableShippingRate = async (
  country: string,
  cartTotal: number,
  postalCode?: string,
): Promise<ApplicableShippingRate | null> => {
  try {
    const res = await apiClient.get('/storefront/shipping/applicable', {
      params: { country, cartTotal, postalCode },
    });
    return res.data;
  } catch {
    return null;
  }
};
