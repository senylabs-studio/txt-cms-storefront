import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getFavoriteIds, toggleFavorite } from '../services/favoriteService';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favoriteProductIds: Set<number>;
  favoriteVariantIds: Set<number>;
  isFavorite: (productId?: number, variantId?: number) => boolean;
  toggle: (productId?: number, variantId?: number) => Promise<void>;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      const ids = await getFavoriteIds();
      setProductIds(new Set(ids.productIds));
      setVariantIds(new Set(ids.variantIds));
    } catch {
      // silent — user may not be a customer yet
    }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const isFavorite = (productId?: number, variantId?: number) => {
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
      const result = await toggleFavorite(productId, variantId);
      // Sync with server response to correct any optimistic mismatch
      if (variantId != null) {
        setVariantIds(prev => {
          const next = new Set(prev);
          if (result.isFavorite) next.add(variantId); else next.delete(variantId);
          return next;
        });
      } else if (productId != null) {
        setProductIds(prev => {
          const next = new Set(prev);
          if (result.isFavorite) next.add(productId); else next.delete(productId);
          return next;
        });
      }
    } catch {
      // Revert optimistic update on error
      load();
    }
  };

  const count = productIds.size + variantIds.size;

  return (
    <FavoritesContext.Provider value={{ favoriteProductIds: productIds, favoriteVariantIds: variantIds, isFavorite, toggle, count }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
};
