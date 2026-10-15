import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ImageLightbox from './ImageLightbox';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const images = [
  { url: 'https://img.example.com/1.jpg', altText: 'Lino rojo' },
  { url: 'https://img.example.com/2.jpg' },
  { url: 'https://img.example.com/3.jpg' },
];

describe('ImageLightbox', () => {
  it('shows the selected image with its position', () => {
    render(<ImageLightbox images={images} index={1} show title="Lino" onClose={() => {}} onIndexChange={() => {}} />);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getAllByAltText('Lino')[0]).toHaveAttribute('src', 'https://img.example.com/2.jpg');
  });

  it('wraps around with the arrow buttons and the keyboard', () => {
    const onIndexChange = vi.fn();
    render(<ImageLightbox images={images} index={0} show title="Lino" onClose={() => {}} onIndexChange={onIndexChange} />);

    fireEvent.click(screen.getByLabelText('product.previousImage'));
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
  });

  it('toggles zoom when the image is clicked', () => {
    render(<ImageLightbox images={images} index={0} show title="Lino" onClose={() => {}} onIndexChange={() => {}} />);
    const img = screen.getByAltText('Lino rojo');

    fireEvent.click(img);
    expect(img.style.transform).toBe('scale(2.5)');
    fireEvent.click(img);
    expect(img.style.transform).toBe('');
  });

  it('shows the screen-size copy, the original once zoomed, and the thumbnails in the strip', () => {
    const sized = [
      { url: 'https://img.example.com/1.jpg', displayUrl: 'https://img.example.com/1-display.webp', thumbnailUrl: 'https://img.example.com/1.webp', altText: 'Lino rojo' },
      { url: 'https://img.example.com/2.jpg' },
    ];
    render(<ImageLightbox images={sized} index={0} show title="Lino" onClose={() => {}} onIndexChange={() => {}} />);
    const img = screen.getByAltText('Lino rojo');

    expect(img).toHaveAttribute('src', 'https://img.example.com/1-display.webp');
    fireEvent.click(img);
    expect(img).toHaveAttribute('src', 'https://img.example.com/1.jpg');
    const strip = [...document.querySelectorAll('.image-lightbox__thumb img')].map(i => i.getAttribute('src'));
    expect(strip).toEqual(['https://img.example.com/1.webp', 'https://img.example.com/2.jpg']);
  });

  it('closes from the close button', () => {
    const onClose = vi.fn();
    render(<ImageLightbox images={images} index={0} show title="Lino" onClose={onClose} onIndexChange={() => {}} />);

    fireEvent.click(screen.getByLabelText('product.closeImage'));
    expect(onClose).toHaveBeenCalled();
  });

  it('hides the arrows and counter for a single image', () => {
    render(<ImageLightbox images={images.slice(0, 1)} index={0} show title="Lino" onClose={() => {}} onIndexChange={() => {}} />);
    expect(screen.queryByLabelText('product.nextImage')).not.toBeInTheDocument();
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
  });
});
