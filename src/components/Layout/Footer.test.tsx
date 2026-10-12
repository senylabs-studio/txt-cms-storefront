import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';
import type { SiteSettings } from '../../services/siteSettingsService';

const settings: { current: SiteSettings } = { current: {} as SiteSettings };
vi.mock('../../contexts/SiteSettingsContext', () => ({ useSiteSettings: () => settings.current }));
vi.mock('../../contexts/PaymentMethodsContext', () => ({ usePaymentMethods: () => [] }));
vi.mock('../../contexts/PartnersContext', () => ({ usePartners: () => [] }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es', resolvedLanguage: 'es' } }),
}));

const contactColumn = { title: 'Visítanos', type: 'contact' as const, isVisible: true, links: [], logos: [], features: [] };
const weekday = { open: '09:30', close: '13:15' };

const renderFooter = (over: Partial<SiteSettings>) => {
  settings.current = { siteName: 'Tejidos Pulido', siteDescription: '', copyright: '', footerColumns: [contactColumn], ...over };
  return render(<MemoryRouter><Footer /></MemoryRouter>);
};

describe('Footer contact column', () => {
  it('shows the address, phone, email and grouped opening hours from the settings', () => {
    renderFooter({
      companyAddress: 'Calle Montserrat 27', companyPostalCode: '08302', companyCity: 'Mataró',
      companyPhone: '937906859', companyEmail: 'info@tejidospulido.com',
      openingHours: [1, 2, 3, 4, 5, 6].map(day => ({ day, ranges: [weekday, { open: '17:00', close: '20:15' }] })),
    });

    expect(screen.getByText('Visítanos')).toBeTruthy();
    const address = screen.getByText('Calle Montserrat 27, 08302 Mataró').closest('a')!;
    expect(address.getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=Calle%20Montserrat%2027%2C%2008302%20Matar%C3%B3');
    expect(screen.getByText('937 90 68 59').closest('a')!.getAttribute('href')).toBe('tel:937906859');
    expect(screen.getByText('info@tejidospulido.com').closest('a')!.getAttribute('href')).toBe('mailto:info@tejidospulido.com');
    expect(screen.getByText('Lunes – sábado: 09:30–13:15 · 17:00–20:15')).toBeTruthy();
    expect(screen.getByText('Domingo: openingHours.closed')).toBeTruthy();
  });

  it('lists the column\'s own links first', () => {
    renderFooter({
      companyCity: 'Mataró',
      footerColumns: [{ ...contactColumn, links: [{ text: '¿Quiénes somos?', href: '/quienes-somos' }] }],
    });

    const items = document.querySelectorAll('.footer-contact-list li');
    expect(items[0].textContent).toBe('¿Quiénes somos?');
    expect(screen.getByText('¿Quiénes somos?').closest('a')!.getAttribute('href')).toBe('/quienes-somos');
    expect(items[1].textContent).toBe('Mataró');
  });

  it('leaves out the lines with no data', () => {
    renderFooter({ companyCity: 'Mataró' });

    expect(screen.getByText('Mataró')).toBeTruthy();
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(document.querySelector('.footer-contact-hours')).toBeNull();
  });
});
