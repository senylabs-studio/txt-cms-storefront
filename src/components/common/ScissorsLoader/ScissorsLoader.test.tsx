import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScissorsLoader from './ScissorsLoader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ScissorsLoader', () => {
  it('is announced as a loading status', () => {
    render(<ScissorsLoader />);
    expect(screen.getByRole('status', { name: 'common.loading' })).toBeTruthy();
  });

  it('gives each instance its own mask so two loaders on one page do not share a cut line', () => {
    const { container } = render(<><ScissorsLoader /><ScissorsLoader /></>);
    const ids = Array.from(container.querySelectorAll('mask')).map(m => m.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    container.querySelectorAll('.scissors-loader__cut').forEach((cut, i) => {
      expect(cut.getAttribute('mask')).toBe(`url(#${ids[i]})`);
      expect(ids[i]).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });
});
