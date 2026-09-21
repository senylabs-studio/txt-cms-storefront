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

// Simulates two concurrently-rendered "Add to cart" buttons (e.g. two different VariantCards)
// both calling requireAuth() against the one shared AuthGateProvider instance.
const DoubleConsumer: React.FC = () => {
  const { requireAuth } = useAuthGate();
  const [resultA, setResultA] = React.useState('');
  const [resultB, setResultB] = React.useState('');
  return (
    <div>
      <button data-testid="btn-a" onClick={async () => setResultA(String(await requireAuth()))}>{resultA || 'trigger-a'}</button>
      <button data-testid="btn-b" onClick={async () => setResultB(String(await requireAuth()))}>{resultB || 'trigger-b'}</button>
    </div>
  );
};

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

  // Regression test: requireAuth() used to store its resolver in a single ref, so a second call
  // made before the first one's prompt was answered (e.g. clicking "Add to cart" on a different
  // product) silently overwrote the first caller's resolver — leaving that first await stuck
  // forever, with no error, while a later caller's action proceeded normally.
  it('resolves every pending requireAuth() call when the gate closes, not just the most recent one', async () => {
    guestCheckout.mockResolvedValue({ token: 't', customerId: 5, name: 'Gary', email: 'gary@example.com', isGuest: true });
    render(
      <MemoryRouter>
        <AuthGateProvider><DoubleConsumer /></AuthGateProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('btn-a'));
    expect(await screen.findByText('authGate.title')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-b'));

    fireEvent.change(screen.getByLabelText('authGate.name'), { target: { value: 'Gary' } });
    fireEvent.change(screen.getByLabelText('authGate.email'), { target: { value: 'gary@example.com' } });
    fireEvent.click(screen.getByText('authGate.continueAsGuest'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-a')).toHaveTextContent('true');
      expect(screen.getByTestId('btn-b')).toHaveTextContent('true');
    });
  });
});
