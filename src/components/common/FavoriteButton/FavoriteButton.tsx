import React from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '../../../contexts/FavoritesContext';
import { useAuth } from '../../../contexts/AuthContext';
import './FavoriteButton.css';

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
    if (!isAuthenticated) { navigate('/login'); return; }
    await toggle(productId, variantId);
  };

  return (
    <button
      className={`fav-btn fav-btn--${size} ${active ? 'fav-btn--active' : ''} ${className}`}
      onClick={handleClick}
      title={label}
      aria-label={label}
    >
      {active ? <FaHeart /> : <FaRegHeart />}
    </button>
  );
};

export default FavoriteButton;
