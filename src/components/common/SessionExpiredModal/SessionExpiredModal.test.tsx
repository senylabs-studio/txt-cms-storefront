import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import SessionExpiredModal from './SessionExpiredModal';
import { SESSION_EXPIRED_EVENT } from '../../../utils/session';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderModal() {
  return render(
    <MemoryRouter>
      <SessionExpiredModal />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

const expire = () => act(() => { window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)); });

describe('SessionExpiredModal', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/producto/tela?color=rojo');
  });

  it('stays hidden until the session expires', () => {
    renderModal();
    expect(screen.queryByText('auth.sessionClosed.title')).toBeNull();
  });

  it('tells the shopper on a public page and takes them to the login, coming back here', async () => {
    renderModal();
    expire();
    expect(await screen.findByText('auth.sessionClosed.title')).toBeTruthy();

    fireEvent.click(screen.getByText('auth.sessionClosed.login'));
    expect(screen.getByTestId('location').textContent)
      .toBe(`/login?from=${encodeURIComponent('/producto/tela?color=rojo')}`);
  });

  it('can be dismissed to keep browsing signed out', async () => {
    renderModal();
    expire();
    fireEvent.click(await screen.findByText('auth.sessionClosed.continue'));
    await vi.waitFor(() => expect(screen.queryByText('auth.sessionClosed.body')).toBeNull());
  });

  it('says nothing on a protected page: that one goes to the login, which has its own notice', () => {
    window.history.pushState({}, '', '/account/orders');
    renderModal();
    expire();
    expect(screen.queryByText('auth.sessionClosed.title')).toBeNull();
  });
});
