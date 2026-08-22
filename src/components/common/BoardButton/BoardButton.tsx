import React, { useState } from 'react';
import { FaPalette, FaCheck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { addBoardItem } from '../../../services/boardService';
import './BoardButton.css';

interface Props {
  variantId: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BoardButton: React.FC<Props> = ({ variantId, size = 'md', className = '' }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    if (loading) return;
    setLoading(true);
    try {
      await addBoardItem(variantId);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // silent — this is a low-stakes convenience action, not worth an error banner
    } finally {
      setLoading(false);
    }
  };

  const label = t(added ? 'board.added' : 'board.add');

  return (
    <button
      className={`board-btn board-btn--${size} ${added ? 'board-btn--active' : ''} ${className}`}
      onClick={handleClick}
      disabled={loading}
      title={label}
      aria-label={label}
    >
      {added ? <FaCheck /> : <FaPalette />}
    </button>
  );
};

export default BoardButton;
