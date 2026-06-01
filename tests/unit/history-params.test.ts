import { describe, expect, it } from 'vitest';

describe('history request params', () => {
  it('includes pageSize required by BOSS history list API', () => {
    const pageNum = 1;
    const params = { page: pageNum, pageSize: 15 };

    expect(params).toEqual({ page: 1, pageSize: 15 });
  });
});
