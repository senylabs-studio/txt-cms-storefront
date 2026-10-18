import React from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '../../../contexts/FavoritesContext';
import { useAuth } from '../../../contexts/AuthContext';
import './FavoriteButton.css';
import IconTooltip from '../IconTooltip/IconTooltip';
import { loginUrl } from '../../../utils/session';
import { savePendingFavorite } from '../../../utils/pendingFavorite';

interface Props {
  productId?: number;
  variantId?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const FavoriteButton: React.FC<Props> = ({ productId, variantId, size = 'md', className = '' }) => {
  const { t } = useTranslation();
  const { isFavorite, toggle } = useFavorites();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const active = isFavorite(productId, variantId);
  const label = t(active ? 'favorites.remove' : 'favorites.add');

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Logged out: remembered, and saved once they're back from the login (FavoritesContext).
    if (!isAuthenticated) { savePendingFavorite(productId, variantId); navigate(loginUrl()); return; }
    await toggle(productId, variantId);
  };

  return (
    <IconTooltip label={label}>
      <button
        className={`fav-btn fav-btn--${size} ${active ? 'fav-btn--active' : ''} ${className}`}
        onClick={handleClick}
        aria-label={label}
      >
        {active ? <FaHeart /> : <FaRegHeart />}
      </button>
    </IconTooltip>
  );
};

export default FavoriteButton;
