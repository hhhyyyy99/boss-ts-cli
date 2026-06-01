import { describe, expect, it } from 'vitest';
import { candidateFromCookies } from '../../src/login/index.js';
import { AuthFlowError } from '../../src/exceptions.js';
import { ErrorCodes } from '../../src/schema.js';

describe('Web login candidate handling', () => {
  it('keeps Web recovered browser cookies as candidates before shared verification', () => {
    const result = candidateFromCookies(
      [{ name: '__zp_stoken__', value: 'token', domain: '.zhipin.com', path: '/' }],
      'web',
      'web',
      'browser cookie recovery',
    );

    expect(result.source).toBe('web');
    expect(result.method).toBe('web');
    expect(result.sourceDetail).toBe('browser cookie recovery');
  });

  it('filters non-zhipin recovered cookies', () => {
    const result = candidateFromCookies(
      [{ name: 'sid', value: 'external', domain: '.example.com', path: '/' }],
      'web',
      'web',
      'browser cookie recovery',
    );

    expect(result.cookies).toEqual([]);
  });

  it('uses structured auth flow errors for web timeout states', () => {
    const err = new AuthFlowError(
      ErrorCodes.AUTHORIZATION_PENDING_TIMEOUT,
      '浏览器登录超时',
      'timeout',
      ['boss login --qrcode'],
    );

    expect(err.code).toBe('authorization_pending_timeout');
    expect(err.stage).toBe('timeout');
    expect(err.nextActions).toContain('boss login --qrcode');
  });
});
