import { describe, expect, it, vi } from 'vitest';
import { autoDetectCandidate } from '../../src/browsers/index.js';

vi.mock('../../src/browsers/chromium.js', () => ({
  extractChromiumCookies: () => [
    { name: '__zp_stoken__', value: 'token', domain: '.zhipin.com', path: '/', expires: Date.now() + 1000 },
  ],
}));

vi.mock('../../src/browsers/firefox.js', () => ({
  extractFirefoxCookies: () => [],
}));

vi.mock('../../src/browsers/paths.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/browsers/paths.js')>('../../src/browsers/paths.js');
  return {
    ...actual,
    SUPPORTED_BROWSERS: ['chrome', 'edge', 'brave', 'firefox'],
    getBrowserDbPath: (browser: string) => browser === 'chrome' ? '/tmp/chrome/Cookies' : null,
    getFirefoxProfile: () => null,
  };
});

describe('browser candidate metadata', () => {
  it('returns browser_auto candidate for auto detection', () => {
    const result = autoDetectCandidate();

    expect(result.method).toBe('browser_auto');
    expect(result.source).toBe('browser');
    expect(result.sourceDetail).toBe('auto');
    expect(result.cookies).toHaveLength(1);
  });
});
