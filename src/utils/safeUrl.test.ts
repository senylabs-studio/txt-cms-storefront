import { describe, it, expect } from 'vitest';
import { isSafeHttpUrl } from './safeUrl';

describe('isSafeHttpUrl', () => {
  it.each(['https://example.com', 'http://example.com/a?b=1'])('accepts %s', url => {
    expect(isSafeHttpUrl(url)).toBe(true);
  });

  it.each(['javascript:alert(1)', ' javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x', '/relative', '', null, undefined])('rejects %s', url => {
    expect(isSafeHttpUrl(url)).toBe(false);
  });
});
