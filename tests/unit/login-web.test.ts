import { describe, expect, it } from 'vitest';
import { candidateFromCookies } from '../../src/login/index.js';
import {
  WEB_LOGIN_TIMEOUT_MS,
  createWebLoginTimeoutError,
  parseRawCookieHeader,
} from '../../src/login/web-login.js';
import { ErrorCodes } from '../../src/schema.js';

describe('Web login candidate handling', () => {
  it('keeps Web recovered browser cookies as candidates before shared verification', () => {
    const result = candidateFromCookies(
      [{ name: '__zp_stoken__', value: 'fixture-stoken', domain: '.zhipin.com', path: '/' }],
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
    const err = createWebLoginTimeoutError();

    expect(WEB_LOGIN_TIMEOUT_MS).toBeLessThanOrEqual(90_000);
    expect(err.code).toBe(ErrorCodes.AUTHORIZATION_PENDING_TIMEOUT);
    expect(err.stage).toBe('timeout');
    expect(err.message).toContain('90 秒');
    expect(err.nextActions).toContain('boss login --web');
    expect(err.nextActions).toContain('boss login --qrcode');
  });

  it('parses page-imported cookie headers without exposing non-cookie text', () => {
    const cookies = parseRawCookieHeader('__zp_stoken__=fixture-stoken; bst=fixture-bst; invalid');

    expect(cookies).toEqual([
      { name: '__zp_stoken__', value: 'fixture-stoken', domain: '.zhipin.com', path: '/' },
      { name: 'bst', value: 'fixture-bst', domain: '.zhipin.com', path: '/' },
    ]);
  });
});
