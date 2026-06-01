import { describe, expect, it, vi } from 'vitest';
import { extractCandidateFromBrowser } from '../../src/browsers/index.js';

vi.mock('../../src/browsers/chromium.js', () => ({
  extractChromiumCookies: () => [
    { name: '__zp_stoken__', value: 'token', domain: '.zhipin.com', path: '/' },
  ],
}));

vi.mock('../../src/browsers/firefox.js', () => ({
  extractFirefoxCookies: () => [],
}));

vi.mock('../../src/browsers/paths.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/browsers/paths.js')>('../../src/browsers/paths.js');
  return {
    ...actual,
    getBrowserDbPath: (browser: string) => browser === 'chrome' ? '/tmp/chrome/Cookies' : null,
    getFirefoxProfile: () => null,
  };
});

describe('specified browser candidate', () => {
  it('uses only the requested browser source', () => {
    const result = extractCandidateFromBrowser('chrome');

    expect(result.method).toBe('browser_specified');
    expect(result.sourceDetail).toBe('chrome');
    expect(result.cookies).toHaveLength(1);
  });

  it('does not fallback when the requested browser is missing', () => {
    const result = extractCandidateFromBrowser('edge');

    expect(result.method).toBe('browser_specified');
    expect(result.sourceDetail).toBe('edge');
    expect(result.cookies).toEqual([]);
  });
});
