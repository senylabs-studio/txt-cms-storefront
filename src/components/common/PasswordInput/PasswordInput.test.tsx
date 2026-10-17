import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PasswordInput from './PasswordInput';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('PasswordInput', () => {
  it('hides the password until the eye button is pressed, and hides it again on a second press', () => {
    render(<PasswordInput aria-label="pwd" value="Secreto1!" onChange={() => {}} />);
    const input = screen.getByLabelText('pwd') as HTMLInputElement;
    expect(input.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'auth.showPassword' }));
    expect(input.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'auth.hidePassword' }));
    expect(input.type).toBe('password');
  });

  it('shows the validation message when the field is invalid', () => {
    render(<PasswordInput aria-label="pwd" isInvalid feedback="Mínimo 6 caracteres" />);
    expect(screen.getByText('Mínimo 6 caracteres')).toBeInTheDocument();
  });

  it('adds the rules info button only when asked, and describes the field with the rules', () => {
    const { rerender } = render(<PasswordInput aria-label="pwd" />);
    expect(screen.queryByRole('button', { name: 'auth.passwordRules.info' })).not.toBeInTheDocument();

    rerender(<PasswordInput aria-label="pwd" showRules />);
    expect(screen.getByRole('button', { name: 'auth.passwordRules.info' })).toBeInTheDocument();
    expect(screen.getByLabelText('pwd')).toHaveAccessibleDescription('auth.register.passwordHint');
  });
});
