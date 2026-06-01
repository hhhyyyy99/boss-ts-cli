import { CandidateCredential, Cookie } from '../../src/types/index.js';

export const validCookies: Cookie[] = [
  { name: '__zp_stoken__', value: 'stoken-value', domain: '.zhipin.com', path: '/' },
  { name: 'bst', value: 'bst-value', domain: '.zhipin.com', path: '/' },
];

export const invalidDomainCookies: Cookie[] = [
  { name: 'sid', value: 'external', domain: '.example.com', path: '/' },
];

export function candidate(overrides: Partial<CandidateCredential> = {}): CandidateCredential {
  return {
    cookies: validCookies,
    source: 'browser',
    method: 'browser_auto',
    sourceDetail: 'test-browser',
    acquiredAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

export const profileResponse = {
  name: '测试用户',
  userType: 'geek',
};
