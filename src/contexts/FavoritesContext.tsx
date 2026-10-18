import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getFavoriteIds, toggleFavorite } from '../services/favoriteService';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { takePendingFavorite } from '../utils/pendingFavorite';

interface FavoritesContextType {
  favoriteProductIds: Set<number>;
  favoriteVariantIds: Set<number>;
  isFavorite: (productId?: number, variantId?: number) => boolean;
  toggle: (productId?: number, variantId?: number) => Promise<void>;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
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
      const products = new Set(ids.productIds);
      const variants = new Set(ids.variantIds);
      // A heart tapped before logging in (FavoriteButton): saved now, unless it's already there.
      const pending = takePendingFavorite();
      const already = pending && (pending.variantId != null ? variants.has(pending.variantId) : products.has(pending.productId!));
      if (pending && !already) {
        try {
          const result = await toggleFavorite(pending.productId, pending.variantId);
          if (result.isFavorite) {
            if (pending.variantId != null) variants.add(pending.variantId); else products.add(pending.productId!);
            showToast('success', t('favorites.savedAfterLogin'));
          }
        } catch (err) {
          showToast('danger', getApiErrorMessage(err, t('favorites.toggleError')));
        }
      }
      setProductIds(products);
      setVariantIds(variants);
    } catch {
      // silent — user may not be a customer yet
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t/showToast only word the toast; reloading on them would replay nothing but refetch
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
    } catch (err) {
      // Revert optimistic update on error
      load();
      showToast('danger', getApiErrorMessage(err, t('favorites.toggleError')));
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
