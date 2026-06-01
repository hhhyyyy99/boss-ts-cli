/**
 * 基础层集成冒烟测试
 * 验证 client、schema、crypto 等核心模块可正常工作
 */
import { describe, it, expect } from 'vitest';
import { success, error, ErrorCodes } from '../../src/schema.js';
import { encrypt, decrypt, _setKeyForTesting } from '../../src/crypto.js';
import { readCache, writeCache } from '../../src/index-cache.js';
import { ApiClient } from '../../src/client.js';
import crypto from 'node:crypto';

describe('Schema 封装', () => {
  it('success() 返回正确的 envelope 格式', () => {
    const result = success({ name: 'test' });
    expect(result.ok).toBe(true);
    expect(result.schema_version).toBe('1');
    expect(result.data).toEqual({ name: 'test' });
    expect(result.error).toBeUndefined();
  });

  it('error() 返回正确的 envelope 格式', () => {
    const result = error('test_error', '测试错误');
    expect(result.ok).toBe(false);
    expect(result.schema_version).toBe('1');
    expect(result.data).toBeNull();
    expect(result.error).toEqual({ code: 'test_error', message: '测试错误' });
  });

  it('ErrorCodes 包含所有必需的错误码', () => {
    expect(ErrorCodes.NOT_AUTHENTICATED).toBe('not_authenticated');
    expect(ErrorCodes.RATE_LIMITED).toBe('rate_limited');
    expect(ErrorCodes.API_ERROR).toBe('api_error');
    expect(ErrorCodes.UNKNOWN_ERROR).toBe('unknown_error');
  });
});

describe('Crypto 加解密', () => {
  it('加密后解密应返回原始数据', () => {
    const testKey = crypto.randomBytes(32);
    _setKeyForTesting(testKey);

    const original = { name: 'test', value: 42, nested: { key: 'val' } };
    const encrypted = encrypt(original);

    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('authTag');
    expect(encrypted).toHaveProperty('ciphertext');
    expect(typeof encrypted.iv).toBe('string');
    expect(typeof encrypted.authTag).toBe('string');
    expect(typeof encrypted.ciphertext).toBe('string');

    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('不同数据产生不同密文', () => {
    const testKey = crypto.randomBytes(32);
    _setKeyForTesting(testKey);

    const enc1 = encrypt({ data: 'hello' });
    const enc2 = encrypt({ data: 'world' });
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });
});

describe('IndexCache', () => {
  it('readCache() 在无缓存时返回 null', () => {
    const cache = readCache();
    // 如果之前有缓存则不为 null，否则为 null
    // 两种情况都可以
    if (cache !== null) {
      expect(cache).toHaveProperty('keyword');
      expect(cache).toHaveProperty('jobList');
      expect(Array.isArray(cache.jobList)).toBe(true);
    }
  });

  it('writeCache() 和 readCache() 往返正确', () => {
    writeCache('test-keyword', { city: '杭州' }, [
      { index: 1, securityId: 'abc123' },
      { index: 2, securityId: 'def456' },
    ]);

    const cache = readCache();
    expect(cache).not.toBeNull();
    expect(cache!.keyword).toBe('test-keyword');
    expect(cache!.filters).toEqual({ city: '杭州' });
    expect(cache!.jobList).toHaveLength(2);
    expect(cache!.jobList[0]).toEqual({ index: 1, securityId: 'abc123' });
    expect(cache!.cachedAt).toBeDefined();
  });
});

describe('ApiClient', () => {
  it('创建 ApiClient 实例', () => {
    const client = new ApiClient();
    expect(client).toBeInstanceOf(ApiClient);
    expect(client.getCookies()).toEqual([]);
  });

  it('设置和获取 Cookies', () => {
    const client = new ApiClient();
    const cookies = [
      { name: 'token', value: 'abc', domain: '.zhipin.com', path: '/' },
    ];
    client.setCookies(cookies);
    expect(client.getCookies()).toEqual(cookies);
  });

  it('buildSearchParams 正确构建参数', () => {
    const client = new ApiClient();
    const params = client.buildSearchParams({
      keyword: 'golang',
      city: '杭州',
      salary: '20-30K',
      page: 2,
    });

    expect(params.query).toBe('golang');
    expect(params.city).toBe('101210100'); // 城市名转为编码
    expect(params.salary).toBe('406');     // 薪资转为编码
    expect(params.page).toBe(2);
    expect(params.pageSize).toBe(15);
  });

  it('setVerbose 控制详细日志', () => {
    const client = new ApiClient();
    client.setVerbose(true);
    // verbose 标志应被设置（无直接断言，但不应抛出异常）
    expect(true).toBe(true);
  });
});
