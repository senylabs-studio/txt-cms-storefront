import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MetresInput from './MetresInput';

describe('MetresInput', () => {
  // A decimal comma (rejected by number inputs in some browsers) is read as a decimal.
  it('takes "1,5" as 1.5', () => {
    const onValue = vi.fn();
    render(<MetresInput aria-label="m" value={1} min={0.5} onValue={onValue} />);
    fireEvent.change(screen.getByLabelText('m'), { target: { value: '1,5' } });
    expect(onValue).toHaveBeenCalledWith(1.5);
  });

  // Below the minimum: not taken, and on leaving the field it shows the amount in use again
  // (it kept "0.8" on screen while 1 m was added).
  it('goes back to the amount in use when what was typed is not valid', () => {
    const onValue = vi.fn();
    render(<MetresInput aria-label="m" value={1} min={1} onValue={onValue} />);
    const input = screen.getByLabelText('m') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0.8' } });
    expect(onValue).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(input.value).toBe('1');
  });
});
