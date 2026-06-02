import { describe, expect, it } from 'vitest';
import { candidateFromCookies } from '../../src/login/index.js';
import { createNoBrowserSessionError } from '../../src/commands/auth.js';

describe('default login candidate flow', () => {
  it('creates browser_auto candidate for default login cookies', () => {
    const result = candidateFromCookies(
      [{ name: '__zp_stoken__', value: 'fixture-stoken', domain: '.zhipin.com', path: '/' }],
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

  it('turns missing default browser session into an actionable fallback error', () => {
    const err = createNoBrowserSessionError();

    expect(err.code).toBe('credential_acquisition_failed');
    expect(err.message).not.toBe('未检测到可验证的登录会话');
    expect(err.nextActions).toContain('boss login --web');
    expect(err.nextActions).toContain('boss login --qrcode');
  });
});
