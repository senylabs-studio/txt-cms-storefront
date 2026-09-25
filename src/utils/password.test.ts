import { describe, it, expect } from 'vitest';
import { meetsPasswordRules } from './password';

describe('meetsPasswordRules', () => {
  it.each(['Passw0rd!', 'aB3$xy', 'Tejidos#2026'])('accepts %s', pw => {
    expect(meetsPasswordRules(pw)).toBe(true);
  });

  it.each(['password1', 'PASSWORD1!', 'Password!', 'Password1', 'aB3$x', ''])('rejects %s', pw => {
    expect(meetsPasswordRules(pw)).toBe(false);
  });
});
