import apiClient from '../apiClient';

export interface StockNotificationIds {
  productIds: number[];
  variantIds: number[];
}

export const getStockNotificationIds = (): Promise<StockNotificationIds> =>
  apiClient.get('/storefront/stock-notifications/ids').then(r => r.data);

export const toggleStockNotification = (productId?: number, variantId?: number): Promise<{ isRequested: boolean }> =>
  apiClient.post('/storefront/stock-notifications/toggle', { productId, variantId }).then(r => r.data);
