import { describe, expect, it } from 'vitest';
import { candidateFromCookies } from '../../src/login/index.js';

describe('default login candidate flow', () => {
  it('creates browser_auto candidate for default login cookies', () => {
    const result = candidateFromCookies(
      [{ name: '__zp_stoken__', value: 'token', domain: '.zhipin.com', path: '/' }],
      'browser',
      'browser_auto',
      'auto',
    );

    expect(result.method).toBe('browser_auto');
    expect(result.source).toBe('browser');
    expect(result.sourceDetail).toBe('auto');
  });

  it('represents missing local session as empty browser_auto candidate', () => {
    const result = candidateFromCookies([], 'browser', 'browser_auto', 'auto');

    expect(result.cookies).toEqual([]);
  });
});
