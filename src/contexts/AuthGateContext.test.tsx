import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthGateProvider, useAuthGate } from './AuthGateContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const mockAuth = vi.hoisted(() => ({ isAuthenticated: false, login: vi.fn() }));
vi.mock('./AuthContext', () => ({ useAuth: () => mockAuth }));

const { guestCheckout } = vi.hoisted(() => ({ guestCheckout: vi.fn() }));
vi.mock('../services/authService', () => ({ guestCheckout }));

const Consumer: React.FC = () => {
  const { requireAuth } = useAuthGate();
  const [result, setResult] = React.useState<string>('');
  return (
    <button onClick={async () => setResult(String(await requireAuth()))}>
      {result || 'trigger'}
    </button>
  );
};

const renderGate = () => render(
  <MemoryRouter>
    <AuthGateProvider><Consumer /></AuthGateProvider>
  </MemoryRouter>,
);

describe('AuthGateContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = false;
  });

  it('resolves true immediately when already authenticated, without showing the modal', async () => {
    mockAuth.isAuthenticated = true;
    renderGate();

    fireEvent.click(screen.getByText('trigger'));

    await waitFor(() => expect(screen.getByText('true')).toBeInTheDocument());
    expect(screen.queryByText('authGate.title')).not.toBeInTheDocument();
  });

  it('creates a guest account and resolves true on submit', async () => {
    guestCheckout.mockResolvedValue({ token: 't', customerId: 5, name: 'Gary', email: 'gary@example.com', isGuest: true });
    renderGate();

    fireEvent.click(screen.getByText('trigger'));
    expect(await screen.findByText('authGate.title')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('authGate.name'), { target: { value: 'Gary' } });
    fireEvent.change(screen.getByLabelText('authGate.email'), { target: { value: 'gary@example.com' } });
    fireEvent.click(screen.getByText('authGate.continueAsGuest'));

    await waitFor(() => expect(mockAuth.login).toHaveBeenCalledWith({ token: 't', customerId: 5, name: 'Gary', email: 'gary@example.com', isGuest: true }));
    await waitFor(() => expect(screen.getByText('true')).toBeInTheDocument());
  });

  it('navigates to /login and resolves false when the visitor already has an account', async () => {
    renderGate();

    fireEvent.click(screen.getByText('trigger'));
    expect(await screen.findByText('authGate.title')).toBeInTheDocument();
    fireEvent.click(screen.getByText('authGate.haveAccount'));

    expect(navigate).toHaveBeenCalledWith('/login');
    await waitFor(() => expect(screen.getByText('false')).toBeInTheDocument());
  });
});
