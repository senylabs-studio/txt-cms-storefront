import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CompositionText from './CompositionText';
import { resetMaterialAbbreviations } from '../../../hooks/useMaterialAbbreviations';

const { getMaterialAbbreviations } = vi.hoisted(() => ({ getMaterialAbbreviations: vi.fn() }));
vi.mock('../../../services/materialService', () => ({ getMaterialAbbreviations }));

const json = JSON.stringify([
  { material: 'Algodón', percentage: 60 },
  { material: 'Poliéster', percentage: 35 },
  { material: 'Elastano', percentage: 5 },
]);

// jsdom has no layout: text is 7px a character, and the card's meta line `boxWidth` wide.
let boxWidth = 400;
const renderIn = (composition: string) =>
  render(<div className="product-card-meta"><CompositionText json={composition} /></div>);

describe('CompositionText', () => {
  beforeEach(() => {
    resetMaterialAbbreviations();
    getMaterialAbbreviations.mockResolvedValue({ Algodón: 'CO', Poliéster: 'PES', Elastano: 'EL' });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => boxWidth);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { width: (this.textContent ?? '').length * 7 } as DOMRect;
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the full names when they fit', async () => {
    boxWidth = 400;
    renderIn(json);
    await waitFor(() => expect(getMaterialAbbreviations).toHaveBeenCalled());
    expect(screen.getByText(/Algodón/)).toBeInTheDocument();
    expect(document.querySelector('abbr')).toBeNull();
  });

  it('uses the fibre codes, with the full name as their title, when the names don\'t fit', async () => {
    boxWidth = 200; // full: 41 chars = 287px; codes: 24 chars = 168px
    renderIn(json);
    const co = await screen.findByText('CO');
    expect(co.tagName).toBe('ABBR');
    expect(co).toHaveAttribute('title', 'Algodón');
    expect(document.querySelector('.is-wrapping')).toBeNull();
  });

  it('wraps between materials when even the codes don\'t fit', async () => {
    boxWidth = 100;
    renderIn(json);
    await screen.findByText('CO');
    await waitFor(() => expect(document.querySelector('.product-card-composition.is-wrapping')).not.toBeNull());
  });

  it('keeps the name of a material that has no code', async () => {
    boxWidth = 200;
    getMaterialAbbreviations.mockResolvedValue({ Algodón: 'CO' });
    renderIn(JSON.stringify([{ material: 'Algodón', percentage: 90 }, { material: 'Fibra metálica', percentage: 10 }]));
    await screen.findByText('CO');
    expect(screen.getByText(/Fibra metálica/)).toBeInTheDocument();
  });
});
