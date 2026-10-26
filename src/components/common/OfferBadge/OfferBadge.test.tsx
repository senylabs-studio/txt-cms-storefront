import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfferBadge from './OfferBadge';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => (key === 'product.offer' ? 'OFERTA' : key) }) }));

const text = (el: Element | null) => el?.textContent?.replace(/\s/g, ' ');

describe('OfferBadge', () => {
  // Option B (user 2026-10-26): the word and how much comes off, together.
  it('shows OFERTA and the percentage off for a sale', () => {
    const { container } = render(<OfferBadge price={5} originalPrice={9.95} />);
    expect(screen.getByText('OFERTA')).toBeInTheDocument();
    expect(text(container.querySelector('.offer-badge__percent'))).toBe('−49 %');
  });

  it('shows only OFERTA when the sale takes off less than 1 %', () => {
    const { container } = render(<OfferBadge price={9.9} originalPrice={9.95} />);
    expect(text(container.firstElementChild)).toBe('OFERTA');
  });

  it('shows the group discount percentage, and nothing without a discount', () => {
    const { container, rerender } = render(<OfferBadge price={9} originalPrice={10} discountPercent={10} />);
    expect(text(container.firstElementChild)).toBe('−10 %');
    rerender(<OfferBadge price={10} originalPrice={10} />);
    expect(container).toBeEmptyDOMElement();
  });
});
