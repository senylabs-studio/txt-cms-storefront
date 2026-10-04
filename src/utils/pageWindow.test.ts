import { describe, it, expect } from 'vitest';
import { pageWindow } from './pageWindow';

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('collapses long runs into gaps around the current page', () => {
    expect(pageWindow(1, 83)).toEqual([1, 2, 'gap', 83]);
    expect(pageWindow(40, 83)).toEqual([1, 'gap', 39, 40, 41, 'gap', 83]);
    expect(pageWindow(83, 83)).toEqual([1, 'gap', 82, 83]);
  });

  it('shows a single hidden page instead of a gap', () => {
    expect(pageWindow(4, 10)).toEqual([1, 2, 3, 4, 5, 'gap', 10]);
    expect(pageWindow(7, 10)).toEqual([1, 'gap', 6, 7, 8, 9, 10]);
  });
});
