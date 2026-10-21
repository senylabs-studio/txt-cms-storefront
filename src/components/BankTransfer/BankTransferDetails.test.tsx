import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BankTransferDetails from './BankTransferDetails';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}));

const details = {
  amount: 105,
  iban: 'ES12 3456 7890 1234 5678 9012',
  accountHolder: 'TXT VERETEX SL',
  concept: 'Pedido #12',
  // Madrid midnight ending Monday 26 October (CET after the clocks went back on the 25th).
  paymentDueAt: '2026-10-26T23:00:00Z',
};

describe('BankTransferDetails', () => {
  it('shows what to transfer, where, and the last day in Madrid', () => {
    render(<BankTransferDetails details={details} />);
    expect(screen.getByText('105,00 €')).toBeInTheDocument();
    expect(screen.getByText('TXT VERETEX SL')).toBeInTheDocument();
    expect(screen.getByText(/26 de octubre/)).toBeInTheDocument(); // not the 27th: the due instant ends the 26th
  });

  it('copies the IBAN without spaces', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<BankTransferDetails details={details} />);

    fireEvent.click(screen.getByRole('button', { name: 'bankTransfer.copyIban' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('ES1234567890123456789012'));
  });
});
