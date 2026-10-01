import apiClient from '../apiClient';
import type { AddGiftCardRequest, Cart, CheckoutRequest, CheckoutResponse } from '../types';

export const getCart = async (): Promise<Cart> => {
  const res = await apiClient.get('/storefront/cart');
  return res.data;
};

export const addToCart = async (data: { productId?: number; variantId?: number; quantity: number }): Promise<Cart> => {
  const res = await apiClient.post('/storefront/cart/items', data);
  return res.data;
};

export const updateCartItem = async (itemId: number, quantity: number): Promise<Cart> => {
  const res = await apiClient.put(`/storefront/cart/items/${itemId}`, { quantity });
  return res.data;
};

export const removeCartItem = async (itemId: number): Promise<Cart> => {
  const res = await apiClient.delete(`/storefront/cart/items/${itemId}`);
  return res.data;
};

export const applyCoupon = async (code: string): Promise<Cart> => {
  const res = await apiClient.post('/storefront/cart/coupon', { code });
  return res.data;
};

export const removeCoupon = async (): Promise<Cart> => {
  const res = await apiClient.delete('/storefront/cart/coupon');
  return res.data;
};

export const addGiftCardToCart = async (data: AddGiftCardRequest): Promise<Cart> => {
  const res = await apiClient.post('/storefront/cart/gift-cards', data);
  return res.data;
};

export const updateGiftCardInCart = async (itemId: number, data: AddGiftCardRequest): Promise<Cart> => {
  const res = await apiClient.put(`/storefront/cart/gift-cards/${itemId}`, data);
  return res.data;
};

export const applyGiftCard = async (code: string): Promise<Cart> => {
  const res = await apiClient.post('/storefront/cart/gift-card', { code });
  return res.data;
};

export const removeGiftCard = async (): Promise<Cart> => {
  const res = await apiClient.delete('/storefront/cart/gift-card');
  return res.data;
};

export const checkout = async (data: CheckoutRequest): Promise<CheckoutResponse> => {
  const res = await apiClient.post('/storefront/checkout', data);
  return res.data;
};
