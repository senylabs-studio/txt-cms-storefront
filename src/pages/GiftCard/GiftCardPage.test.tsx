import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GiftCardPage from './GiftCardPage';
import { ToastProvider } from '../../contexts/ToastContext';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockCart = vi.hoisted(() => ({ addGiftCard: vi.fn(), loading: false }));
vi.mock('../../contexts/CartContext', () => ({ useCart: () => mockCart }));

const mockGate = vi.hoisted(() => ({ requireAuth: vi.fn() }));
vi.mock('../../contexts/AuthGateContext', () => ({ useAuthGate: () => mockGate }));

vi.mock('../../contexts/SiteSettingsContext', () => ({ useSiteSettings: () => ({ siteName: 'Tejidos', logoUrl: '' }) }));

const { getGiftCardConfig, checkGiftCardBalance } = vi.hoisted(() => ({ getGiftCardConfig: vi.fn(), checkGiftCardBalance: vi.fn() }));
vi.mock('../../services/giftCardService', () => ({ getGiftCardConfig, checkGiftCardBalance }));

const config = { enabled: true, minAmount: 20, maxAmount: 500, amountStep: 5, validityMonths: 12 };
const renderPage = () => render(<ToastProvider><GiftCardPage /></ToastProvider>);

describe('GiftCardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGiftCardConfig.mockResolvedValue(config);
    mockGate.requireAuth.mockResolvedValue(true);
    mockCart.addGiftCard.mockResolvedValue(undefined);
  });

  it('says so when gift cards are not on sale', async () => {
    getGiftCardConfig.mockResolvedValue({ ...config, enabled: false });
    renderPage();
    expect(await screen.findByText('giftCard.unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/giftCard.addToCart/)).not.toBeInTheDocument();
  });

  it('snaps a typed amount to the allowed steps and range', async () => {
    renderPage();
    const input = await screen.findByLabelText('giftCard.amountLabel');
    fireEvent.change(input, { target: { value: '23' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(25);
    fireEvent.change(input, { target: { value: '9000' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(500);
  });

  it('previews the letter and adds the card with what was typed', async () => {
    renderPage();
    await screen.findByLabelText('giftCard.amountLabel');
    fireEvent.click(screen.getByRole('button', { name: /^75,00\s€$/ }));
    fireEvent.change(screen.getByLabelText('giftCard.recipientName'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('giftCard.senderName'), { target: { value: 'Luis' } });
    fireEvent.change(screen.getByLabelText('giftCard.message'), { target: { value: 'Feliz día' } });

    const preview = screen.getByTestId('gift-card-preview');
    expect(preview).toHaveTextContent('Ana');
    expect(preview).toHaveTextContent('75,00 €');
    expect(preview).toHaveTextContent('“Feliz día”');

    fireEvent.click(screen.getByRole('button', { name: /giftCard.addToCart/ }));
    await waitFor(() => expect(mockCart.addGiftCard).toHaveBeenCalledWith({
      amount: 75, recipientName: 'Ana', recipientEmail: undefined, senderName: 'Luis', message: 'Feliz día',
    }));
  });

  it('does nothing when the visitor dismisses the login/guest prompt', async () => {
    mockGate.requireAuth.mockResolvedValue(false);
    renderPage();
    await screen.findByLabelText('giftCard.amountLabel');
    fireEvent.change(screen.getByLabelText('giftCard.recipientName'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('giftCard.senderName'), { target: { value: 'Luis' } });
    fireEvent.click(screen.getByRole('button', { name: /giftCard.addToCart/ }));
    await waitFor(() => expect(mockGate.requireAuth).toHaveBeenCalled());
    expect(mockCart.addGiftCard).not.toHaveBeenCalled();
  });

  it('checks a balance by code', async () => {
    checkGiftCardBalance.mockResolvedValue({ code: 'ABCD-EFGH-JKLM', balance: 12.5, usable: true });
    renderPage();
    fireEvent.change(await screen.findByLabelText('giftCard.balanceTitle'), { target: { value: 'abcd-efgh-jklm' } });
    fireEvent.click(screen.getByRole('button', { name: 'giftCard.balanceCheck' }));
    expect(await screen.findByTestId('gift-card-balance')).toHaveTextContent('giftCard.balanceResult');
    expect(checkGiftCardBalance).toHaveBeenCalledWith('abcd-efgh-jklm');
  });

  it('shows the banner from the CMS with the translated title over it', async () => {
    getGiftCardConfig.mockResolvedValue({ ...config, headerImageUrl: 'https://blob.example.com/site/gift-card-header-1.webp' });
    const { container } = renderPage();
    await screen.findByLabelText('giftCard.amountLabel');
    expect(container.querySelector('.gift-card-hero img')).toHaveAttribute('src', 'https://blob.example.com/site/gift-card-header-1.webp');
    expect(screen.getByRole('heading', { level: 1, name: 'giftCard.title' })).toBeInTheDocument();
  });
});
