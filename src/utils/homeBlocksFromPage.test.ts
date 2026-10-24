import { describe, it, expect, vi, beforeEach } from 'vitest';

// The module reads the page once; each test loads a fresh copy.
const load = async () => (await import('./homeBlocksFromPage')).homeBlocksFromPage;

describe('homeBlocksFromPage', () => {
  beforeEach(() => {
    vi.resetModules();
    document.getElementById('home-blocks')?.remove();
  });

  const put = (lang: string, content: string) => {
    const el = document.createElement('script');
    el.id = 'home-blocks';
    el.type = 'application/json';
    el.setAttribute('data-lang', lang);
    el.textContent = content;
    document.head.appendChild(el);
  };

  it('gives the blocks the server put in the page when they are in the app language', async () => {
    put('es', JSON.stringify([{ type: 'Banner', title: 'Otoño' }]));
    const fromPage = await load();
    expect(fromPage('es')).toEqual([{ type: 'Banner', title: 'Otoño' }]);
    expect(fromPage('es')).toEqual([{ type: 'Banner', title: 'Otoño' }]); // read once, kept
  });

  it('gives nothing in another language, without the element, or when it is unreadable', async () => {
    put('es', '[]');
    expect((await load())('ca')).toBeNull();
    vi.resetModules();
    document.getElementById('home-blocks')?.remove();
    expect((await load())('es')).toBeNull();
    vi.resetModules();
    put('es', '{roto');
    expect((await load())('es')).toBeNull();
  });
});
