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

const typePassword = (value: string) =>
  fireEvent.change(screen.getByLabelText('emailConfirm.password'), { target: { value } });

const renderAt = (url: string, change = false) =>
  render(<MemoryRouter initialEntries={[url]}><ConfirmEmailPage change={change} /></MemoryRouter>);

describe('ConfirmEmailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  // Mail scanners open links by themselves: confirming must take a button press.
  it('confirms the account email only when the button is pressed', async () => {
    api.confirmEmail.mockResolvedValue(undefined);
    renderAt('/email/confirmar?user=u1&token=t%2B1');

    expect(api.confirmEmail).not.toHaveBeenCalled();
    typePassword('S3cret!');
    fireEvent.click(screen.getByRole('button', { name: 'emailConfirm.confirm' }));

    expect(await screen.findByText('emailConfirm.success')).toBeInTheDocument();
    expect(api.confirmEmail).toHaveBeenCalledWith('u1', 't+1', 'S3cret!');
  });

  // The change ends every session, so the page signs in with the token it gets back.
  it('applies an email change and signs in with the fresh session', async () => {
    const session = { token: 'jwt', customerId: 7, name: 'Jane', email: 'new@example.com' };
    api.confirmEmailChange.mockResolvedValue(session);
    renderAt('/email/cambio?user=u1&email=new%40example.com&token=abc', true);

    typePassword('S3cret!');
    fireEvent.click(screen.getByRole('button', { name: 'emailConfirm.changeConfirm' }));

    expect(await screen.findByText('emailConfirm.changeSuccess')).toBeInTheDocument();
    expect(api.confirmEmailChange).toHaveBeenCalledWith('u1', 'new@example.com', 'abc', 'S3cret!');
    expect(auth.login).toHaveBeenCalledWith(session);
  });

  it('shows the error for an expired link', async () => {
    api.confirmEmail.mockRejectedValue(new Error('400'));
    renderAt('/email/confirmar?user=u1&token=old');

    typePassword('S3cret!');
    fireEvent.click(screen.getByRole('button', { name: 'emailConfirm.confirm' }));
    expect(await screen.findByText('emailConfirm.error')).toBeInTheDocument();
  });

  // Audit 2026-10-14: the link proves the email, not the account — the password is asked too.
  it('needs the account password before confirming', () => {
    renderAt('/email/confirmar?user=u1&token=t1');

    const button = screen.getByRole('button', { name: 'emailConfirm.confirm' });
    expect(button).toBeDisabled();
    typePassword('S3cret!');
    expect(button).toBeEnabled();
  });

  it('a change link without the new address is incomplete', () => {
    renderAt('/email/cambio?user=u1&token=abc', true);
    expect(screen.getByText('emailConfirm.invalidLink')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  // A second click: the change is already applied, so the backend confirms without a session.
  it('an already-applied change shows success without signing in', async () => {
    api.confirmEmailChange.mockResolvedValue(null);
    renderAt('/email/cambio?user=u1&email=new%40example.com&token=abc', true);

    typePassword('S3cret!');
    fireEvent.click(screen.getByRole('button', { name: 'emailConfirm.changeConfirm' }));

    expect(await screen.findByText('emailConfirm.changeSuccess')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });
});
