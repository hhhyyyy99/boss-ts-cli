import { describe, expect, it } from 'vitest';
import { verifyCandidateCredential } from '../../src/auth.js';
import { NotAuthenticatedError } from '../../src/exceptions.js';
import { candidate, profileResponse } from '../helpers/auth-fixtures.js';
import { clientFactoryWithError, clientFactoryWithResponse } from '../helpers/auth-mocks.js';

describe('verifyCandidateCredential', () => {
  it('returns verified account summary when protected identity lookup succeeds', async () => {
    const result = await verifyCandidateCredential(
      candidate(),
      clientFactoryWithResponse(profileResponse),
    );

    expect(result.status).toBe('verified');
    expect(result.accountSummary?.displayName).toBe('测试用户');
    expect(result.accountSummary?.accountType).toBe('geek');
    expect(result.accountSummary?.source).toBe('browser');
  });

  it('rejects empty candidate credentials', async () => {
    const result = await verifyCandidateCredential(candidate({ cookies: [] }));

    expect(result.status).toBe('rejected');
    expect(result.accountSummary).toBeNull();
    expect(result.nextActions).toContain('boss login --qrcode');
  });

  it('returns rejected when protected identity lookup reports unauthenticated', async () => {
    const result = await verifyCandidateCredential(
      candidate(),
      clientFactoryWithError(new NotAuthenticatedError('会话已过期')),
    );

    expect(result.status).toBe('rejected');
    expect(result.message).toContain('授权验证失败');
  });

  it('returns unknown when verification cannot complete', async () => {
    const result = await verifyCandidateCredential(
      candidate(),
      clientFactoryWithError(new Error('network down')),
    );

    expect(result.status).toBe('unknown');
    expect(result.message).toContain('network down');
  });
});
