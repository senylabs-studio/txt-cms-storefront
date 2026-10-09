import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccountPage from './AccountPage';
import { ToastProvider } from '../../contexts/ToastContext';
import GlobalToast from '../../components/common/GlobalToast/GlobalToast';
import type { StorefrontProfile } from '../../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}));

const mockAuth = vi.hoisted(() => ({ login: vi.fn(), updateUser: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => mockAuth }));

vi.mock('../../components/Layout/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// The street field as a plain input plus a button that "picks" a Google suggestion.
const picked = vi.hoisted(() => ({ address: { street: 'Carrer Gran, 5', postalCode: '', city: 'Barcelona', province: '', country: 'ES' } }));
vi.mock('../../components/common/AddressAutocomplete/AddressAutocomplete', () => ({
  default: ({ value, onChange, onSelect, isInvalid, feedback }: {
    value: string; onChange: (v: string) => void; onSelect: (a: typeof picked.address) => void; isInvalid?: boolean; feedback?: React.ReactNode;
  }) => (
    <>
      <input className={`form-control${isInvalid ? ' is-invalid' : ''}`} value={value} onChange={e => onChange(e.target.value)} />
      {feedback}
      <button type="button" onClick={() => onSelect(picked.address)}>pick-suggestion</button>
    </>
  ),
}));

const { getProfile, updateProfile, changePassword, addAddress, updateAddress, deleteAddress, downloadMyDataExport, requestAccountDeletion, updateNewsletterSubscription, updateEmail, resendEmailConfirmation } = vi.hoisted(() => ({
  updateNewsletterSubscription: vi.fn(),
  updateEmail: vi.fn(),
  resendEmailConfirmation: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  addAddress: vi.fn(),
  updateAddress: vi.fn(),
  deleteAddress: vi.fn(),
  downloadMyDataExport: vi.fn(),
  requestAccountDeletion: vi.fn(),
}));
vi.mock('../../services/profileService', () => ({
  getProfile, updateProfile, changePassword, addAddress, updateAddress, deleteAddress, downloadMyDataExport, requestAccountDeletion, updateNewsletterSubscription,
  updateEmail, resendEmailConfirmation,
}));

const { getVisibleCountries } = vi.hoisted(() => ({ getVisibleCountries: vi.fn() }));
vi.mock('../../services/countryService', () => ({ getVisibleCountries }));

const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter><ToastProvider>{children}</ToastProvider></MemoryRouter>
);
const renderAccount = () => render(<AccountPage />, { wrapper: AllProviders });

// The address modal's required fields (alias, recipientName, street, postalCode, city) have no
// placeholders/labelled-for association to query by — fill them positionally in the order they're
// rendered in the JSX. Country defaults to 'ES' already, so it's left untouched.
const fillRequiredAddressFields = () => {
  const dialog = screen.getByRole('dialog');
  const textboxes = within(dialog).getAllByRole('textbox');
  const [alias, recipientName, street, postalCode, city] = textboxes;
  fireEvent.change(alias, { target: { value: 'Oficina' } });
  fireEvent.change(recipientName, { target: { value: 'Jane' } });
  fireEvent.change(street, { target: { value: 'Calle 2' } });
  fireEvent.change(postalCode, { target: { value: '28002' } });
  fireEvent.change(city, { target: { value: 'Madrid' } });
};

const profile = (overrides: Partial<StorefrontProfile> = {}): StorefrontProfile => ({
  id: 1,
  name: 'Jane',
  email: 'jane@example.com',
  isGuest: false,
  deletionRequested: false,
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
    fillRequiredAddressFields();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'account.save' }));

    await waitFor(() => expect(addAddress).toHaveBeenCalled());
    expect(await screen.findByText('Oficina')).toBeInTheDocument();
    expect(screen.queryByText('account.newAddress')).not.toBeInTheDocument();
  });

  it('clears a field\'s "required" message as soon as it is filled in', async () => {
    getProfile.mockResolvedValue(profile());
    renderAccount();
    await screen.findByDisplayValue('Jane');

    fireEvent.click(screen.getByText('account.add'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'account.save' }));
    expect(within(dialog).getAllByText('common.fieldRequired')).toHaveLength(5);

    const [alias, , street] = within(dialog).getAllByRole('textbox');
    fireEvent.change(alias, { target: { value: 'Casa' } });
    fireEvent.change(street, { target: { value: 'Calle Mayor, 10' } });
    expect(within(dialog).getAllByText('common.fieldRequired')).toHaveLength(3);
    expect(alias).not.toHaveClass('is-invalid');
    expect(addAddress).not.toHaveBeenCalled();
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

  // A suggestion Google returns without a post code or province must not keep the old
  // address's: Barcelona with Madrid's 28001 would be a mixed address on the label.
  it('picking a suggestion replaces post code, city and province, even with blanks', async () => {
    renderAccount();
    await screen.findByDisplayValue('Jane');
    fireEvent.click(document.querySelectorAll('.border.rounded button')[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByDisplayValue('28001')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'pick-suggestion' }));

    expect(within(dialog).getByDisplayValue('Carrer Gran, 5')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Barcelona')).toBeInTheDocument();
    expect(within(dialog).queryByDisplayValue('28001')).not.toBeInTheDocument();
    expect(within(dialog).queryByDisplayValue('Madrid')).not.toBeInTheDocument();
  });

  it('shows a generic error in the modal when saving an address fails without axios details', async () => {
    addAddress.mockRejectedValue(new Error('boom'));
    renderAccount();
    await screen.findByDisplayValue('Jane');

    fireEvent.click(screen.getByText('account.add'));
    fillRequiredAddressFields();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'account.save' }));

    expect(await screen.findByText('account.addrSaveError')).toBeInTheDocument();
  });

  it('shows the backend error in the modal when saving an address fails with an axios error', async () => {
    addAddress.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'Código postal inválido' } } });
    renderAccount();
    await screen.findByDisplayValue('Jane');

    fireEvent.click(screen.getByText('account.add'));
    fillRequiredAddressFields();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'account.save' }));

    expect(await screen.findByText('Código postal inválido')).toBeInTheDocument();
  });

  it('deletes an address after confirming, and removes it from the list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteAddress.mockResolvedValue(undefined);
    getProfile.mockResolvedValueOnce(profile()).mockResolvedValueOnce(profile({ addresses: [] }));
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

  describe('change password', () => {
    const fillPasswordForm = (current: string, next: string, confirm: string) => {
      const [currentInput, newInput, confirmInput] = document.querySelectorAll('input[type="password"]');
      fireEvent.change(currentInput, { target: { value: current } });
      fireEvent.change(newInput, { target: { value: next } });
      fireEvent.change(confirmInput, { target: { value: confirm } });
    };

    // Regression (50th audit batch): the change rotates the security stamp, invalidating the
    // current token — the session must switch to the fresh token the backend returns, or the
    // next request logs the customer out as "session expired".
    it('changes the password, keeps the session with the returned token, and shows a success message', async () => {
      const fresh = { token: 'fresh-token', customerId: 1, name: 'Jane', email: 'jane@example.com' };
      changePassword.mockResolvedValue(fresh);
      renderAccount();
      await screen.findByDisplayValue('Jane');

      fillPasswordForm('OldP@ss1!', 'NewP@ss2!', 'NewP@ss2!');
      fireEvent.click(screen.getByText('account.changePassword'));

      await waitFor(() => expect(changePassword).toHaveBeenCalledWith('OldP@ss1!', 'NewP@ss2!'));
      expect(await screen.findByText('account.passwordChanged')).toBeInTheDocument();
      expect(mockAuth.login).toHaveBeenCalledWith(fresh);
    });

    // Regression: only the length was checked, so e.g. "password1" reached the backend and came
    // back rejected in Spanish only.
    it('rejects a password that misses the backend rules without calling the API', async () => {
      renderAccount();
      await screen.findByDisplayValue('Jane');

      fillPasswordForm('OldP@ss1!', 'password1', 'password1');
      fireEvent.click(screen.getByText('account.changePassword'));

      expect(await screen.findByText('auth.register.passwordHint')).toBeInTheDocument();
      expect(changePassword).not.toHaveBeenCalled();
    });

    it('shows a mismatch error and does not call the API when the confirmation differs', async () => {
      renderAccount();
      await screen.findByDisplayValue('Jane');

      fillPasswordForm('OldP@ss1!', 'NewP@ss2!', 'Different1!');
      fireEvent.click(screen.getByText('account.changePassword'));

      expect(await screen.findByText('account.passwordMismatch')).toBeInTheDocument();
      expect(changePassword).not.toHaveBeenCalled();
    });

    it('shows the backend error message when changePassword rejects with an axios error', async () => {
      changePassword.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'La contraseña no es correcta.' } } });
      renderAccount();
      await screen.findByDisplayValue('Jane');

      fillPasswordForm('WrongOld1!', 'NewP@ss2!', 'NewP@ss2!');
      fireEvent.click(screen.getByText('account.changePassword'));

      expect(await screen.findByText('La contraseña no es correcta.')).toBeInTheDocument();
    });

    it('shows a generic error message when changePassword rejects without axios details', async () => {
      changePassword.mockRejectedValue(new Error('boom'));
      renderAccount();
      await screen.findByDisplayValue('Jane');

      fillPasswordForm('OldP@ss1!', 'NewP@ss2!', 'NewP@ss2!');
      fireEvent.click(screen.getByText('account.changePassword'));

      expect(await screen.findByText('account.passwordChangeError')).toBeInTheDocument();
    });
  });

  describe('privacy (GDPR)', () => {
    it('downloads the data export when clicked', async () => {
      downloadMyDataExport.mockResolvedValue(undefined);
      renderAccount();
      await screen.findByDisplayValue('Jane');

      fireEvent.click(screen.getByText('account.exportData'));

      await waitFor(() => expect(downloadMyDataExport).toHaveBeenCalled());
    });

    it('shows an error when the data export fails', async () => {
      downloadMyDataExport.mockRejectedValue(new Error('boom'));
      renderAccount();
      await screen.findByDisplayValue('Jane');

      fireEvent.click(screen.getByText('account.exportData'));

      expect(await screen.findByText('account.exportDataError')).toBeInTheDocument();
    });

    it('submits a deletion request with the given reason and shows the pending state', async () => {
      requestAccountDeletion.mockResolvedValue(undefined);
      renderAccount();
      await screen.findByDisplayValue('Jane');

      fireEvent.click(screen.getByText('account.deleteAccount'));
      fireEvent.change(await screen.findByPlaceholderText('account.deleteReasonPlaceholder'), { target: { value: 'Moving away' } });
      fireEvent.click(screen.getByText('account.confirmDeleteAccount'));

      await waitFor(() => expect(requestAccountDeletion).toHaveBeenCalledWith('Moving away'));
      expect(await screen.findByText('account.deletionPending')).toBeInTheDocument();
      // The modal (whose title reuses the same "account.deleteAccount" text as the now-hidden
      // button) can briefly linger mid-close-transition — wait rather than assert synchronously.
      await waitFor(() => expect(screen.queryByText('account.deleteAccount')).not.toBeInTheDocument());
    });

    it('shows the pending message instead of the delete button when a request is already pending', async () => {
      getProfile.mockResolvedValue(profile({ deletionRequested: true }));
      renderAccount();

      expect(await screen.findByText('account.deletionPending')).toBeInTheDocument();
      expect(screen.queryByText('account.deleteAccount')).not.toBeInTheDocument();
    });
  });

  // ── 50th audit batch regressions ─────────────────────────────────────────

  it('shows the promoted default address after deleting the default one', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteAddress.mockResolvedValue(undefined);
    const second = { id: 2, alias: 'Oficina', recipientName: 'Jane', street: 'Calle 2', city: 'Madrid', postalCode: '28002', country: 'ES', isDefault: false };
    getProfile
      .mockResolvedValueOnce(profile({ addresses: [profile().addresses[0], second] }))
      .mockResolvedValueOnce(profile({ addresses: [{ ...second, isDefault: true }] }));
    renderAccount();
    await screen.findByText('Oficina');

    fireEvent.click(document.querySelectorAll('.border.rounded button')[1]);

    await waitFor(() => expect(screen.queryByText('Casa')).not.toBeInTheDocument());
    expect(getProfile).toHaveBeenCalledTimes(2);
    expect(screen.getByText('account.defaultBadge')).toBeInTheDocument();
  });

  it('updates the signed-in name (shown in the header) after saving the profile', async () => {
    updateProfile.mockResolvedValue(undefined);
    renderAccount();
    const nameInput = await screen.findByDisplayValue('Jane');

    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    fireEvent.click(screen.getByText('account.save'));

    await waitFor(() => expect(mockAuth.updateUser).toHaveBeenCalledWith({ name: 'Jane Doe' }));
  });

  it('does not offer a password change to a guest, who has no password', async () => {
    getProfile.mockResolvedValue(profile({ isGuest: true }));
    renderAccount();
    await screen.findByDisplayValue('Jane');

    expect(screen.queryByText('account.changePasswordTitle')).not.toBeInTheDocument();
  });
});

// Double opt-in: switching the newsletter on only emails a confirmation link.
describe('AccountPage newsletter switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProfile.mockResolvedValue(profile());
    getVisibleCountries.mockResolvedValue([{ isoCode: 'ES', name: 'España' }]);
  });

  it('says a confirmation email was sent and leaves the switch off', async () => {
    updateNewsletterSubscription.mockResolvedValue({ pendingConfirmation: true });
    render(<AccountPage />, { wrapper: ({ children }) => <AllProviders>{children}<GlobalToast /></AllProviders> });
    const toggle = await screen.findByLabelText('account.newsletterLabel');

    fireEvent.click(toggle);

    expect(await screen.findByText('account.newsletterPending')).toBeInTheDocument();
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(updateNewsletterSubscription).toHaveBeenCalledWith(true);
  });
});

// Decision 2026-10-08: a registered customer's email only changes once the new address is confirmed.
describe('AccountPage account email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVisibleCountries.mockResolvedValue([{ isoCode: 'ES', name: 'España' }]);
  });

  const renderWithToasts = () =>
    render(<AccountPage />, { wrapper: ({ children }) => <AllProviders>{children}<GlobalToast /></AllProviders> });

  it('a requested change keeps the current email and says a link went to the new one', async () => {
    getProfile.mockResolvedValue(profile({ emailConfirmed: true }));
    updateEmail.mockResolvedValue({ pendingConfirmation: true });
    renderWithToasts();

    fireEvent.click(await screen.findByRole('button', { name: 'account.changeEmailTitle' }));
    const dialog = screen.getByRole('dialog');
    const [emailInput] = within(dialog).getAllByRole('textbox');
    fireEvent.change(emailInput, { target: { value: 'jane.new@example.com' } });
    fireEvent.change(dialog.querySelector('input[type="password"]')!, { target: { value: 'P@ssw0rd123!' } });
    fireEvent.submit(dialog.querySelector('form')!);

    expect(await screen.findByText('account.emailChangePending')).toBeInTheDocument();
    expect(updateEmail).toHaveBeenCalledWith('jane.new@example.com', 'P@ssw0rd123!');
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
  });

  it('offers to resend the link while the email is unconfirmed', async () => {
    getProfile.mockResolvedValue(profile({ emailConfirmed: false }));
    resendEmailConfirmation.mockResolvedValue({ sent: true, alreadyConfirmed: false });
    renderWithToasts();

    expect(await screen.findByText(/account.emailNotConfirmed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'account.resendConfirmation' }));

    expect(await screen.findByText('account.confirmationSent')).toBeInTheDocument();
  });

  it('says nothing about confirming once the email is confirmed', async () => {
    getProfile.mockResolvedValue(profile({ emailConfirmed: true }));
    renderWithToasts();

    await screen.findByDisplayValue('jane@example.com');
    expect(screen.queryByText(/account.emailNotConfirmed/)).toBeNull();
  });
});
