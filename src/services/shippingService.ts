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
  id?: number;
  /** Recogida en tienda: nothing shipped, VAT always charged. */
  isPickup?: boolean;
}

/** The shipping options for the customer's cart sent to one of their addresses (weight-based
 * rates, urgent, store pickup…). The first delivery option is the default. Throws on error: a
 * failed lookup (API waking up, timeout) is not "we don't ship there". */
export const getShippingOptions = async (shippingAddressId: number): Promise<ApplicableShippingRate[]> => {
  const res = await apiClient.get('/storefront/checkout/shipping-options', { params: { shippingAddressId } });
  return res.data ?? [];
};
