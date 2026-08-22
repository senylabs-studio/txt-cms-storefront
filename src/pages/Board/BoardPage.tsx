import React, { useEffect, useRef, useState } from 'react';
import { Container, Spinner, Alert } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import MainLayout from '../../components/Layout/MainLayout';
import { getBoard, updateBoardItem, removeBoardItem, type BoardItem } from '../../services/boardService';
import './BoardPage.css';

const MIN_SIZE = 60;
const MAX_SIZE = 400;

interface DragState {
  id: number;
  mode: 'move' | 'resize';
  startPointerX: number;
  startPointerY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

const BoardPage: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    getBoard().then(setItems).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  const bringToFront = (id: number) => {
    setItems(prev => {
      const maxZ = prev.reduce((m, i) => Math.max(m, i.zIndex), 0);
      return prev.map(i => (i.id === id ? { ...i, zIndex: maxZ + 1 } : i));
    });
  };

  const handlePointerDown = (e: React.PointerEvent, item: BoardItem, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: item.id,
      mode,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startX: item.x,
      startY: item.y,
      startWidth: item.width,
      startHeight: item.height,
    };
    bringToFront(item.id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startPointerX;
    const dy = e.clientY - drag.startPointerY;
    setItems(prev => prev.map(i => {
      if (i.id !== drag.id) return i;
      if (drag.mode === 'move') {
        return { ...i, x: Math.max(0, drag.startX + dx), y: Math.max(0, drag.startY + dy) };
      }
      const width = Math.min(MAX_SIZE, Math.max(MIN_SIZE, drag.startWidth + dx));
      const height = Math.min(MAX_SIZE, Math.max(MIN_SIZE, drag.startHeight + dy));
      return { ...i, width, height };
    }));
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    setItems(prev => {
      const item = prev.find(i => i.id === drag.id);
      if (item) {
        updateBoardItem(item.id, { x: item.x, y: item.y, width: item.width, height: item.height }).catch(() => {});
      }
      return prev;
    });
  };

  const handleRemove = async (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await removeBoardItem(id);
    } catch {
      // Left removed locally — a page refresh will resync with the server if this failed.
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container className="py-4">
        <h1 className="h3 fw-bold mb-2">{t('board.title')}</h1>
        <p className="text-muted mb-4">{t('board.subtitle')}</p>

        {error && <Alert variant="danger">{t('board.loadError')}</Alert>}

        {!error && items.length === 0 && (
          <Alert variant="light" className="border text-center py-5 text-muted">
            {t('board.empty')}
          </Alert>
        )}

        {items.length > 0 && (
          <div className="board-canvas-wrapper">
            <div className="board-canvas" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
              {items.map(item => (
                <div
                  key={item.id}
                  className="board-tile"
                  style={{ left: item.x, top: item.y, width: item.width, height: item.height, zIndex: item.zIndex }}
                  onPointerDown={e => handlePointerDown(e, item, 'move')}
                >
                  <button
                    type="button"
                    className="board-tile-remove"
                    onClick={() => handleRemove(item.id)}
                    onPointerDown={e => e.stopPropagation()}
                    aria-label={t('board.remove')}
                  >
                    <FaTimes size={11} />
                  </button>
                  {item.thumbnailUrl
                    ? <img src={item.thumbnailUrl} alt={item.variantName} draggable={false} />
                    : <div className="board-tile-placeholder">📦</div>}
                  <div className="board-tile-label">{item.variantName}</div>
                  <div
                    className="board-tile-resize"
                    onPointerDown={e => handlePointerDown(e, item, 'resize')}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </MainLayout>
  );
};

export default BoardPage;
