import { describe, expect, it, vi } from 'vitest';
import { extractCandidateFromBrowser } from '../../src/browsers/index.js';

vi.mock('../../src/browsers/chromium.js', () => ({
  extractChromiumCookies: () => [
    { name: '__zp_stoken__', value: 'token', domain: '.zhipin.com', path: '/' },
  ],
}));

vi.mock('../../src/browsers/paths.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/browsers/paths.js')>('../../src/browsers/paths.js');
  return {
    ...actual,
    getBrowserDbPath: (_browser: string, profile?: string) => profile === 'Profile 1' ? '/tmp/chrome/Profile 1/Cookies' : null,
    getFirefoxProfile: () => null,
  };
});

describe('browser profile candidate', () => {
  it('records profile detail for selected browser profile', () => {
    const result = extractCandidateFromBrowser('chrome', { profile: 'Profile 1' });

    expect(result.sourceDetail).toBe('chrome:Profile 1');
    expect(result.cookies).toHaveLength(1);
  });
});
