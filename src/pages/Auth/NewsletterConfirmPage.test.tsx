import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewsletterConfirmPage from './NewsletterConfirmPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../components/Layout/MainLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
const api = vi.hoisted(() => ({ confirmNewsletter: vi.fn() }));
vi.mock('../../services/newsletterService', () => api);

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><NewsletterConfirmPage /></MemoryRouter>);

describe('NewsletterConfirmPage', () => {
  beforeEach(() => vi.clearAllMocks());

  // Mail scanners open links by themselves: confirming must take a button press.
  it('confirms only when the button is pressed', async () => {
    api.confirmNewsletter.mockResolvedValue({ message: 'ok' });
    renderAt('/newsletter/confirmar?token=abc');

    expect(api.confirmNewsletter).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'newsletter.confirm.confirm' }));

    expect(await screen.findByText('newsletter.confirm.success')).toBeInTheDocument();
    expect(api.confirmNewsletter).toHaveBeenCalledWith('abc');
  });

  it('shows the error for an expired link', async () => {
    api.confirmNewsletter.mockRejectedValue(new Error('400'));
    renderAt('/newsletter/confirmar?token=old');

    fireEvent.click(screen.getByRole('button', { name: 'newsletter.confirm.confirm' }));
    expect(await screen.findByText('newsletter.confirm.error')).toBeInTheDocument();
  });

  it('without a token there is nothing to confirm', () => {
    renderAt('/newsletter/confirmar');
    expect(screen.getByText('newsletter.confirm.invalidLink')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
