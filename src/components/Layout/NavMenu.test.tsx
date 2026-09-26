import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NavMenu from './NavMenu';
import type { StorefrontMenuItem } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
  // pageService.ts transitively imports apiClient.ts -> src/i18n.ts
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const { getMenu } = vi.hoisted(() => ({ getMenu: vi.fn() }));
vi.mock('../../services/pageService', async () => {
  const actual = await vi.importActual('../../services/pageService');
  return { ...actual, getMenu };
});

const node = (over: Partial<StorefrontMenuItem>): StorefrontMenuItem =>
  ({ id: 0, name: '', slug: '', type: 'Category', order: 0, children: [], ...over });

const menu = [
  node({
    id: 1, name: 'Tejidos', slug: 'tejidos', imageUrl: '/parent.jpg',
    children: [
      node({ id: 11, name: 'Lino', slug: 'lino', imageUrl: '/lino.jpg' }),
      node({ id: 12, name: 'Seda', slug: 'seda' }), // no image of its own
    ],
  }),
  node({ id: 2, name: 'Mercería', slug: 'merceria', imageUrl: '/merceria.jpg', children: [node({ id: 21, name: 'Botones', slug: 'botones' })] }),
];

const openPanel = async (name: string) => {
  fireEvent.mouseEnter((await screen.findByText(name)).closest('li')!);
};
const sideImage = () => document.querySelector('.mega-image') as HTMLImageElement;

describe('NavMenu mega panel side image', () => {
  it('previews the hovered subcategory and links to it, falling back to the parent image', async () => {
    getMenu.mockResolvedValue(menu);
    render(<MemoryRouter><NavMenu /></MemoryRouter>);
    await openPanel('Tejidos');

    expect(sideImage().getAttribute('src')).toBe('/parent.jpg');

    fireEvent.mouseEnter(screen.getByText('Lino').closest('li')!);
    expect(sideImage().getAttribute('src')).toBe('/lino.jpg');
    expect(sideImage().alt).toBe('Lino');
    expect(sideImage().closest('a')!.getAttribute('href')).toContain('lino');

    // A child without its own image keeps showing the parent's.
    fireEvent.mouseEnter(screen.getByText('Seda').closest('li')!);
    expect(sideImage().getAttribute('src')).toBe('/parent.jpg');
  });

  it('resets to the parent image when hovering the section title or switching top-level item', async () => {
    getMenu.mockResolvedValue(menu);
    render(<MemoryRouter><NavMenu /></MemoryRouter>);
    await openPanel('Tejidos');

    fireEvent.mouseEnter(screen.getByText('Lino').closest('li')!);
    fireEvent.mouseEnter(document.querySelector('.mega-section-header')!);
    expect(sideImage().getAttribute('src')).toBe('/parent.jpg');

    fireEvent.mouseEnter(screen.getByText('Lino').closest('li')!);
    await openPanel('Mercería');
    expect(sideImage().getAttribute('src')).toBe('/merceria.jpg');
  });

  it('opens an external parent link in a new tab from the side image', async () => {
    getMenu.mockResolvedValue([
      node({ id: 3, name: 'Partner', externalUrl: 'https://partner.example.com', imageUrl: '/p.jpg', children: [node({ id: 31, name: 'X' })] }),
    ]);
    render(<MemoryRouter><NavMenu /></MemoryRouter>);
    await openPanel('Partner');

    const a = sideImage().closest('a')!;
    expect(a.getAttribute('href')).toBe('https://partner.example.com');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
