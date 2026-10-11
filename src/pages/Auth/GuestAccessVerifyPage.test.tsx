import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuestAccessVerifyPage from './GuestAccessVerifyPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }));
vi.mock('../../components/Layout/MainLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
const { verifyGuestAccessLink } = vi.hoisted(() => ({ verifyGuestAccessLink: vi.fn() }));
vi.mock('../../services/authService', () => ({ verifyGuestAccessLink }));
const login = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ login }) }));

describe('GuestAccessVerifyPage', () => {
  beforeEach(() => vi.clearAllMocks());

  // A company mail scanner that renders links spent the single-use token on load, before the
  // person clicked: the link is now used only when the button is pressed.
  it('does not use the link until the button is pressed', async () => {
    verifyGuestAccessLink.mockResolvedValue({ token: 't', customerId: 1, name: 'A', email: 'a@x.com', isGuest: true });
    render(<MemoryRouter initialEntries={['/guest-access/verify?token=abc']}><GuestAccessVerifyPage /></MemoryRouter>);

    expect(verifyGuestAccessLink).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'auth.guestAccess.accessButton' }));
    await waitFor(() => expect(verifyGuestAccessLink).toHaveBeenCalledWith('abc'));
    await waitFor(() => expect(login).toHaveBeenCalled());
  });
});
