import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import AddressFormModal from './AddressFormModal';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }) }));
const api = vi.hoisted(() => ({ addAddress: vi.fn(), updateAddress: vi.fn() }));
vi.mock('../../services/profileService', () => api);
vi.mock('../../apiClient', () => ({ default: {} }));
vi.mock('../../services/countryService', () => ({ getVisibleCountries: vi.fn().mockResolvedValue([{ code: 'ES' }]) }));

const badRequest = (errors: Record<string, string[]>) => Object.assign(new Error('400'), { isAxiosError: true, response: { status: 400, data: { errors } } });

const fillRequired = (dialog: HTMLElement) => {
  const [alias, recipient, street, postalCode, city] = within(dialog).getAllByRole('textbox');
  fireEvent.change(alias, { target: { value: 'Casa' } });
  fireEvent.change(recipient, { target: { value: 'Ana' } });
  fireEvent.change(street, { target: { value: 'Mayor 1' } });
  fireEvent.change(postalCode, { target: { value: '28001' } });
  fireEvent.change(city, { target: { value: 'Madrid' } });
};

// Audit 2026-10-14: a 400 on province or phone (too long) was kept as a field error those inputs
// never showed: Save just did nothing.
describe('AddressFormModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the API error of the province and phone fields', async () => {
    api.addAddress.mockRejectedValue(badRequest({ Province: ['Provincia demasiado larga.'], Phone: ['Teléfono demasiado largo.'] }));
    render(<AddressFormModal show onHide={() => {}} onSaved={() => {}} />);
    const dialog = screen.getByRole('dialog');
    fillRequired(dialog);

    fireEvent.click(within(dialog).getByRole('button', { name: 'account.save' }));

    expect(await within(dialog).findByText('Provincia demasiado larga.')).toBeVisible();
    expect(within(dialog).getByText('Teléfono demasiado largo.')).toBeVisible();
  });

  it('shows an error for a field the form has no input for', async () => {
    api.addAddress.mockRejectedValue(badRequest({ Notes: ['Algo no cuadra.'] }));
    render(<AddressFormModal show onHide={() => {}} onSaved={() => {}} />);
    const dialog = screen.getByRole('dialog');
    fillRequired(dialog);

    fireEvent.click(within(dialog).getByRole('button', { name: 'account.save' }));

    await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('Algo no cuadra.'));
  });
});
