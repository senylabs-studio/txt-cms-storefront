import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getStockNotificationIds, toggleStockNotification } from '../services/stockNotificationService';
import { useAuth } from './AuthContext';

interface StockNotificationContextType {
  isRequested: (productId?: number, variantId?: number) => boolean;
  toggle: (productId?: number, variantId?: number) => Promise<void>;
}

const StockNotificationContext = createContext<StockNotificationContextType | null>(null);

export const StockNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [productIds, setProductIds] = useState<Set<number>>(new Set());
  const [variantIds, setVariantIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setProductIds(new Set());
      setVariantIds(new Set());
      return;
    }
    try {
      const ids = await getStockNotificationIds();
      setProductIds(new Set(ids.productIds));
      setVariantIds(new Set(ids.variantIds));
    } catch {
      // silent — user may not be a customer yet
    }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const isRequested = (productId?: number, variantId?: number) => {
    if (variantId != null) return variantIds.has(variantId);
    if (productId != null) return productIds.has(productId);
    return false;
  };

  const toggle = async (productId?: number, variantId?: number) => {
    // Optimistic update
    if (variantId != null) {
      setVariantIds(prev => {
        const next = new Set(prev);
        if (next.has(variantId)) next.delete(variantId); else next.add(variantId);
        return next;
      });
    } else if (productId != null) {
      setProductIds(prev => {
        const next = new Set(prev);
        if (next.has(productId)) next.delete(productId); else next.add(productId);
        return next;
      });
    }
    try {
      const result = await toggleStockNotification(productId, variantId);
      // Sync with server response to correct any optimistic mismatch
      if (variantId != null) {
        setVariantIds(prev => {
          const next = new Set(prev);
          if (result.isRequested) next.add(variantId); else next.delete(variantId);
          return next;
        });
      } else if (productId != null) {
        setProductIds(prev => {
          const next = new Set(prev);
          if (result.isRequested) next.add(productId); else next.delete(productId);
          return next;
        });
      }
    } catch {
      // Revert optimistic update on error
      load();
    }
  };

  return (
    <StockNotificationContext.Provider value={{ isRequested, toggle }}>
      {children}
    </StockNotificationContext.Provider>
  );
};

export const useStockNotifications = () => {
  const ctx = useContext(StockNotificationContext);
  if (!ctx) throw new Error('useStockNotifications must be used inside StockNotificationProvider');
  return ctx;
};
