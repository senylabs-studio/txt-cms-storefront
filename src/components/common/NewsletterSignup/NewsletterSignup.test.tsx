import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewsletterSignup from './NewsletterSignup';

const i18n = vi.hoisted(() => ({ t: (key: string) => key }));
vi.mock('react-i18next', () => ({ useTranslation: () => i18n }));
const api = vi.hoisted(() => ({ subscribeToNewsletter: vi.fn() }));
vi.mock('../../../services/newsletterService', () => api);

const renderBox = (props = {}) => render(<MemoryRouter><NewsletterSignup {...props} /></MemoryRouter>);

describe('NewsletterSignup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('needs the privacy checkbox (RGPD), links to the policy, and on success asks to check the inbox', async () => {
    api.subscribeToNewsletter.mockResolvedValue({ message: 'ok' });
    renderBox();

    const consent = screen.getByRole('checkbox');
    expect(consent).toBeRequired();
    expect(screen.getByRole('link', { name: 'contact.privacyLink' })).toHaveAttribute('href', '/proteccion-de-datos');

    fireEvent.change(screen.getByLabelText('newsletter.signup.emailLabel'), { target: { value: ' ana@example.com ' } });
    fireEvent.click(consent);
    fireEvent.submit(screen.getByRole('button', { name: 'newsletter.signup.submit' }).closest('form')!);

    await waitFor(() => expect(api.subscribeToNewsletter).toHaveBeenCalledWith('ana@example.com', true));
    expect(await screen.findByRole('status')).toHaveTextContent('newsletter.signup.success');
    expect(screen.queryByLabelText('newsletter.signup.emailLabel')).toBeNull();
  });

  it('shows the error and keeps the form when it fails', async () => {
    api.subscribeToNewsletter.mockRejectedValue(new Error('down'));
    renderBox();

    fireEvent.change(screen.getByLabelText('newsletter.signup.emailLabel'), { target: { value: 'ana@example.com' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.submit(screen.getByRole('button').closest('form')!);

    expect(await screen.findByText('newsletter.signup.error')).toBeInTheDocument();
    expect(screen.getByLabelText('newsletter.signup.emailLabel')).toHaveValue('ana@example.com');
  });

  it('uses the texts set in the CMS, the defaults when empty', () => {
    renderBox({ title: 'Únete', text: '', buttonText: 'Quiero' });
    expect(screen.getByText('Únete')).toBeInTheDocument();
    expect(screen.getByText('newsletter.signup.defaultText')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quiero' })).toBeInTheDocument();
  });
});
