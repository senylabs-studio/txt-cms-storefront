import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConfirmEmailPage from './ConfirmEmailPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../components/Layout/MainLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
const api = vi.hoisted(() => ({ confirmEmail: vi.fn(), confirmEmailChange: vi.fn() }));
vi.mock('../../services/authService', () => api);
const auth = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));

const renderAt = (url: string, change = false) =>
  render(<MemoryRouter initialEntries={[url]}><ConfirmEmailPage change={change} /></MemoryRouter>);

describe('ConfirmEmailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  // Mail scanners open links by themselves: confirming must take a button press.
  it('confirms the account email only when the button is pressed', async () => {
    api.confirmEmail.mockResolvedValue(undefined);
    renderAt('/email/confirmar?user=u1&token=t%2B1');

    expect(api.confirmEmail).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'emailConfirm.confirm' }));

    expect(await screen.findByText('emailConfirm.success')).toBeInTheDocument();
    expect(api.confirmEmail).toHaveBeenCalledWith('u1', 't+1');
  });

  // The change ends every session, so the page signs in with the token it gets back.
  it('applies an email change and signs in with the fresh session', async () => {
    const session = { token: 'jwt', customerId: 7, name: 'Jane', email: 'new@example.com' };
    api.confirmEmailChange.mockResolvedValue(session);
    renderAt('/email/cambio?user=u1&email=new%40example.com&token=abc', true);

    fireEvent.click(screen.getByRole('button', { name: 'emailConfirm.changeConfirm' }));

    expect(await screen.findByText('emailConfirm.changeSuccess')).toBeInTheDocument();
    expect(api.confirmEmailChange).toHaveBeenCalledWith('u1', 'new@example.com', 'abc');
    expect(auth.login).toHaveBeenCalledWith(session);
  });

  it('shows the error for an expired link', async () => {
    api.confirmEmail.mockRejectedValue(new Error('400'));
    renderAt('/email/confirmar?user=u1&token=old');

    fireEvent.click(screen.getByRole('button', { name: 'emailConfirm.confirm' }));
    expect(await screen.findByText('emailConfirm.error')).toBeInTheDocument();
  });

  it('a change link without the new address is incomplete', () => {
    renderAt('/email/cambio?user=u1&token=abc', true);
    expect(screen.getByText('emailConfirm.invalidLink')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
