import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountPage from './AccountPage';
import type { StorefrontProfile } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { getProfile, updateProfile, addAddress, updateAddress, deleteAddress } = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  addAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
}));
vi.mock('../../services/profileService', () => ({ getProfile, updateProfile, addAddress, updateAddress, deleteAddress }));

const { getVisibleCountries } = vi.hoisted(() => ({ getVisibleCountries: vi.fn() }));
vi.mock('../../services/countryService', () => ({ getVisibleCountries }));

const renderAccount = () => render(<AccountPage />, { wrapper: MemoryRouter });

const profile = (overrides: Partial<StorefrontProfile> = {}): StorefrontProfile => ({
  id: 1,
  name: 'Jane',
  email: 'jane@example.com',
  addresses: [
    { id: 1, alias: 'Casa', recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES', isDefault: true },
  ],
  paymentMethods: [],
  ...overrides,
});

describe('AccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProfile.mockResolvedValue(profile());
    getVisibleCountries.mockResolvedValue([{ isoCode: 'ES', name: 'España' }]);
  });

  it('loads the profile and renders the saved name and addresses', async () => {
    renderAccount();

    expect(await screen.findByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByText('Casa')).toBeInTheDocument();
  });

  it('saves the profile and shows a success message', async () => {
    updateProfile.mockResolvedValue(undefined);
    renderAccount();
    await screen.findByDisplayValue('Jane');

    fireEvent.change(screen.getByDisplayValue('Jane'), { target: { value: 'Jane Updated' } });
    fireEvent.click(screen.getByText('account.save'));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ name: 'Jane Updated', phone: undefined, taxId: undefined }));
    expect(await screen.findByText('account.saved')).toBeInTheDocument();
  });

  it('shows an error message when saving the profile fails', async () => {
    updateProfile.mockRejectedValue(new Error('boom'));
    renderAccount();
    await screen.findByDisplayValue('Jane');

    fireEvent.click(screen.getByText('account.save'));

    expect(await screen.findByText('account.saveError')).toBeInTheDocument();
  });

  it('adds a new address and refreshes the profile', async () => {
    addAddress.mockResolvedValue({ id: 2 });
    getProfile.mockResolvedValueOnce(profile()).mockResolvedValueOnce(profile({
      addresses: [
        { id: 1, alias: 'Casa', recipientName: 'Jane', street: 'Calle 1', city: 'Madrid', postalCode: '28001', country: 'ES', isDefault: true },
        { id: 2, alias: 'Oficina', recipientName: 'Jane', street: 'Calle 2', city: 'Madrid', postalCode: '28002', country: 'ES', isDefault: false },
      ],
    }));
    renderAccount();
    await screen.findByDisplayValue('Jane');

    fireEvent.click(screen.getByText('account.add'));
    fireEvent.change(screen.getByPlaceholderText('account.aliasPlaceholder'), { target: { value: 'Oficina' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'account.save' }));

    await waitFor(() => expect(addAddress).toHaveBeenCalled());
    expect(await screen.findByText('Oficina')).toBeInTheDocument();
    expect(screen.queryByText('account.newAddress')).not.toBeInTheDocument();
  });

  it('opens the edit modal prefilled and updates the address', async () => {
    updateAddress.mockResolvedValue(undefined);
    renderAccount();
    await screen.findByDisplayValue('Jane');

    const editButtons = document.querySelectorAll('.border.rounded button');
    fireEvent.click(editButtons[0]);

    expect(screen.getByDisplayValue('Casa')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'account.save' }));

    await waitFor(() => expect(updateAddress).toHaveBeenCalledWith(1, expect.objectContaining({ alias: 'Casa' })));
  });

  it('shows a generic error in the modal when saving an address fails without axios details', async () => {
    addAddress.mockRejectedValue(new Error('boom'));
    renderAccount();
    await screen.findByDisplayValue('Jane');

    fireEvent.click(screen.getByText('account.add'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'account.save' }));

    expect(await screen.findByText('account.addrSaveError')).toBeInTheDocument();
  });

  it('shows the backend error in the modal when saving an address fails with an axios error', async () => {
    addAddress.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Código postal inválido' } } });
    renderAccount();
    await screen.findByDisplayValue('Jane');

    fireEvent.click(screen.getByText('account.add'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'account.save' }));

    expect(await screen.findByText('Código postal inválido')).toBeInTheDocument();
  });

  it('deletes an address after confirming, and removes it from the list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteAddress.mockResolvedValue(undefined);
    renderAccount();
    await screen.findByDisplayValue('Jane');

    const deleteBtn = document.querySelectorAll('.border.rounded button')[1];
    fireEvent.click(deleteBtn);

    await waitFor(() => expect(deleteAddress).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText('Casa')).not.toBeInTheDocument());
  });

  it('does not delete when the confirm dialog is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderAccount();
    await screen.findByDisplayValue('Jane');

    const deleteBtn = document.querySelectorAll('.border.rounded button')[1];
    fireEvent.click(deleteBtn);

    expect(deleteAddress).not.toHaveBeenCalled();
  });

  it('shows a generic error message when deleting an address fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteAddress.mockRejectedValue(new Error('boom'));
    renderAccount();
    await screen.findByDisplayValue('Jane');

    const deleteBtn = document.querySelectorAll('.border.rounded button')[1];
    fireEvent.click(deleteBtn);

    expect(await screen.findByText('account.addrDeleteError')).toBeInTheDocument();
  });
});
