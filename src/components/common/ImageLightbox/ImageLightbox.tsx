import React, { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import IconTooltip from '../IconTooltip/IconTooltip';
import './ImageLightbox.css';

export interface LightboxImage {
  url: string;
  altText?: string | null;
}

interface Props {
  images: LightboxImage[];
  index: number;
  show: boolean;
  title: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

const ZOOM = 2.5;

/** Full-screen image viewer: arrows / keyboard to browse, click (or tap) the image to zoom in
 *  on that point, then move the mouse (or drag a finger) to look around it. */
const ImageLightbox: React.FC<Props> = ({ images, index, show, title, onClose, onIndexChange }) => {
  const { t } = useTranslation();
  // Zoom belongs to the image it was turned on for: browsing to another one starts unzoomed.
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const zoomed = zoomedIndex === index;
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const count = images.length;
  const current = images[index];

  const go = (delta: number) => onIndexChange((index + delta + count) % count);

  const close = () => { setZoomedIndex(null); onClose(); };

  useEffect(() => {
    if (!show || count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + count) % count);
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, count, index, onIndexChange]);

  const pointAt = (el: HTMLElement, clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect();
    setOrigin({
      x: Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100)),
    });
  };

  if (!current) return null;

  return (
    <Modal show={show} onHide={close} fullscreen className="image-lightbox" aria-label={title}>
      <div className="image-lightbox__bar">
        <span className="image-lightbox__title">{title}</span>
        {count > 1 && <span className="image-lightbox__counter">{index + 1} / {count}</span>}
        <IconTooltip label={t('product.closeImage')} placement="left">
          <button type="button" className="image-lightbox__icon-btn" onClick={close} aria-label={t('product.closeImage')}>
            <FaTimes size={18} />
          </button>
        </IconTooltip>
      </div>

      <div
        className={`image-lightbox__stage${zoomed ? ' image-lightbox__stage--zoomed' : ''}`}
        onClick={e => { pointAt(e.currentTarget, e.clientX, e.clientY); setZoomedIndex(zoomed ? null : index); }}
        onMouseMove={e => { if (zoomed) pointAt(e.currentTarget, e.clientX, e.clientY); }}
        onTouchMove={e => { if (zoomed) pointAt(e.currentTarget, e.touches[0].clientX, e.touches[0].clientY); }}
        title={zoomed ? t('product.zoomOut') : t('product.zoomIn')}
      >
        <img
          src={current.url}
          alt={current.altText || title}
          draggable={false}
          style={{ transform: zoomed ? `scale(${ZOOM})` : undefined, transformOrigin: `${origin.x}% ${origin.y}%` }}
        />
      </div>

      {count > 1 && (
        <>
          <IconTooltip label={t('product.previousImage')} placement="right">
            <button type="button" className="image-lightbox__nav image-lightbox__nav--prev" onClick={() => go(-1)} aria-label={t('product.previousImage')}>
              <FaChevronLeft size={20} />
            </button>
          </IconTooltip>
          <IconTooltip label={t('product.nextImage')} placement="left">
            <button type="button" className="image-lightbox__nav image-lightbox__nav--next" onClick={() => go(1)} aria-label={t('product.nextImage')}>
              <FaChevronRight size={20} />
            </button>
          </IconTooltip>
          <div className="image-lightbox__thumbs">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                className={`image-lightbox__thumb${i === index ? ' image-lightbox__thumb--active' : ''}`}
                onClick={() => onIndexChange(i)}
                aria-label={t('product.goToImage', { count: i + 1 })}
              >
                <img src={img.url} alt="" />
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
};

export default ImageLightbox;
