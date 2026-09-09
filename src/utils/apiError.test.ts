import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { getApiErrorMessage, parseFieldErrors } from './apiError';

// Shape confirmed live against the real backend (see [ApiController] defaults):
// POST with an empty required field returns `{ errors: { Code: [...], Name: [...] } }`.
const validationError = (errors: Record<string, string[]>) =>
  new AxiosError('Bad Request', '400', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {} as never,
    data: { title: 'One or more validation errors occurred.', status: 400, errors },
  });

const businessRuleError = (message: string) =>
  new AxiosError('Bad Request', '400', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {} as never,
    data: { status: 400, message },
  });

describe('getApiErrorMessage', () => {
  it('joins field validation messages from the real ValidationProblemDetails shape', () => {
    const err = validationError({ Code: ['The Code field is required.'], Name: ['The Name field is required.'] });
    expect(getApiErrorMessage(err, 'fallback')).toBe('The Code field is required. The Name field is required.');
  });

  it('falls back to the flat message for a business-rule exception', () => {
    const err = businessRuleError('Ya existe una cuenta con ese email.');
    expect(getApiErrorMessage(err, 'fallback')).toBe('Ya existe una cuenta con ese email.');
  });

  it('returns the fallback for a non-axios error', () => {
    expect(getApiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
  });

  it('extracts the message from a plain-object rejection shaped like an axios error', () => {
    // This codebase's own tests commonly mock rejections as plain objects rather than real
    // AxiosError instances — the extraction must work for both.
    const err = { response: { data: { message: 'Stock insuficiente' } } };
    expect(getApiErrorMessage(err, 'fallback')).toBe('Stock insuficiente');
  });
});

describe('parseFieldErrors', () => {
  it('maps PascalCase backend field names to camelCase', () => {
    const err = validationError({ Email: ['The Email field is required.'], Password: ['Too short.', 'Too plain.'] });
    expect(parseFieldErrors(err)).toEqual({
      email: 'The Email field is required.',
      password: 'Too short. Too plain.',
    });
  });

  it('returns null for a flat business-rule message with no field association', () => {
    const err = businessRuleError('Ya existe una cuenta con ese email.');
    expect(parseFieldErrors(err)).toBeNull();
  });

  it('returns null for a non-axios error', () => {
    expect(parseFieldErrors(new Error('boom'))).toBeNull();
  });
});
