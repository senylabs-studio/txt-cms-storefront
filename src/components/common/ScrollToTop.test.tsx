import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate, type NavigateFunction } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

let navigate: NavigateFunction;
function NavigateGrabber() {
  const nav = useNavigate();
  useEffect(() => {
    navigate = nav;
  }, [nav]);
  return null;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ScrollToTop />
      <NavigateGrabber />
      <Routes>
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  it('scrolls to top when navigating to another path', () => {
    renderAt('/telas-infantiles');
    vi.mocked(window.scrollTo).mockClear();

    act(() => navigate('/variant/42'));

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('does not scroll on back navigation (POP)', () => {
    renderAt('/telas-infantiles');
    act(() => navigate('/variant/42'));
    vi.mocked(window.scrollTo).mockClear();

    act(() => navigate(-1));

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll when only the query string changes', () => {
    renderAt('/catalog');
    vi.mocked(window.scrollTo).mockClear();

    act(() => navigate('/catalog?page=2'));

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
