import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContactForm from './ContactForm';

const i18n = vi.hoisted(() => ({ t: (key: string) => key }));
vi.mock('react-i18next', () => ({ useTranslation: () => i18n }));
const api = vi.hoisted(() => ({ submitContactForm: vi.fn() }));
vi.mock('../../../services/contactService', () => api);

const fillRequired = () => {
  fireEvent.change(screen.getByLabelText('contact.name'), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByLabelText('contact.email'), { target: { value: 'jane@example.com' } });
  fireEvent.change(screen.getByLabelText('contact.message'), { target: { value: 'Hola' } });
};

// The contact form collects personal data, so the privacy policy must be accepted (RGPD).
describe('ContactForm privacy consent', () => {
  beforeEach(() => { vi.clearAllMocks(); api.submitContactForm.mockResolvedValue({ message: 'ok' }); });

  it('requires the privacy checkbox and links to the privacy policy in a new tab', () => {
    render(<MemoryRouter><ContactForm /></MemoryRouter>);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeRequired();
    const link = screen.getByRole('link', { name: 'contact.privacyLink' });
    expect(link).toHaveAttribute('href', '/proteccion-de-datos');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('sends the acceptance with the message', async () => {
    render(<MemoryRouter><ContactForm /></MemoryRouter>);
    fillRequired();
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: 'contact.submit' }));

    await waitFor(() => expect(api.submitContactForm).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane', email: 'jane@example.com', message: 'Hola', acceptPrivacy: true })));
  });
});
