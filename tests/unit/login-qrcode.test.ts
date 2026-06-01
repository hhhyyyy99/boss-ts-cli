import { describe, expect, it } from 'vitest';
import { candidateFromCookies } from '../../src/login/index.js';

describe('QR login candidate handling', () => {
  it('keeps QR credentials as candidates before shared verification', () => {
    const result = candidateFromCookies(
      [{ name: '__zp_stoken__', value: 'token', domain: '.zhipin.com', path: '/' }],
      'qrcode',
      'qrcode',
      'qrcode',
    );

    expect(result.source).toBe('qrcode');
    expect(result.method).toBe('qrcode');
    expect(result.cookies).toHaveLength(1);
  });

  it('represents empty QR results as empty candidates', () => {
    const result = candidateFromCookies([], 'qrcode', 'qrcode', 'qrcode');

    expect(result.cookies).toEqual([]);
  });
});
