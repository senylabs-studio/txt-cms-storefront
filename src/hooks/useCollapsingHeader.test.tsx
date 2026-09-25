import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import useCollapsingHeader from './useCollapsingHeader';

// jsdom has no layout: give the header the heights of the real one (expanded 150px, compact 60px).
const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) { return this.dataset.collapsed === 'true' ? 60 : 150; },
  });
});
afterAll(() => {
  if (originalOffsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
});

const Header = () => {
  const [collapsed, ref] = useCollapsingHeader<HTMLElement>();
  return <header ref={ref} data-collapsed={String(collapsed)} data-testid="header" />;
};

const scrollTo = (y: number) => act(() => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  window.dispatchEvent(new Event('scroll'));
});
const isCollapsed = () => screen.getByTestId('header').dataset.collapsed === 'true';

// Regression test: with one 48px threshold, collapsing shortened the page by the 90px of removed
// rows, the browser's scroll anchoring moved the scroll up by 90px — back under 48 — the header
// expanded, the page grew, the scroll moved down again… an endless flicker. Each step below also
// replays that anchoring correction.
describe('useCollapsingHeader', () => {
  it('never flips back from the scroll correction its own collapse/expand causes', () => {
    render(<Header />);

    scrollTo(60); // used to collapse here and start flickering
    expect(isCollapsed()).toBe(false);

    scrollTo(230); // past 48 + removed height + gap (compact height not measured yet → assumes all 150)
    expect(isCollapsed()).toBe(true);
    scrollTo(230 - 90); // anchoring after the 90px of rows disappear
    expect(isCollapsed()).toBe(true);

    scrollTo(30); // back near the top
    expect(isCollapsed()).toBe(false);
    scrollTo(30 + 90); // anchoring after the rows come back
    expect(isCollapsed()).toBe(false);

    scrollTo(170); // now uses the measured 90px: 48 + 90 + 24 = 162
    expect(isCollapsed()).toBe(true);
    scrollTo(170 - 90);
    expect(isCollapsed()).toBe(true);
  });
});
