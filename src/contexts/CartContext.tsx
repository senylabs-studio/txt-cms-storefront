import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Cart } from '../types';
import { getCart, addToCart, updateCartItem, removeCartItem, applyCoupon as applyCouponRequest, removeCoupon as removeCouponRequest } from '../services/cartService';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  fetchCart: () => Promise<void>;
  addItem: (productId?: number, variantId?: number, quantity?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getCart();
      setCart(data);
    } catch {
      setCart(null);
    }
  }, [isAuthenticated]);

  const addItem = async (productId?: number, variantId?: number, quantity = 1) => {
    setLoading(true);
    try {
      const updated = await addToCart({ productId, variantId, quantity });
      setCart(updated);
      setDrawerOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (itemId: number, quantity: number) => {
    setLoading(true);
    try {
      const updated = await updateCartItem(itemId, quantity);
      setCart(updated);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId: number) => {
    setLoading(true);
    try {
      const updated = await removeCartItem(itemId);
      setCart(updated);
    } finally {
      setLoading(false);
    }
  };

  const applyCoupon = async (code: string) => {
    setLoading(true);
    try {
      const updated = await applyCouponRequest(code);
      setCart(updated);
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = async () => {
    setLoading(true);
    try {
      const updated = await removeCouponRequest();
      setCart(updated);
    } finally {
      setLoading(false);
    }
  };

  const itemCount = cart?.items.length ?? 0;

  return (
    <CartContext.Provider value={{
      cart, loading, drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      fetchCart, addItem, updateItem, removeItem, applyCoupon, removeCoupon, itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
