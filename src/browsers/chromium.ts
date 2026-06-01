/**
 * Chromium 系列浏览器 Cookie 提取
 * 支持 Chrome / Edge / Brave，v10/v11/v20 加密格式
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import { Cookie } from '../types/index.js';
import { decryptChromiumValue } from './decrypt.js';
import { getChromiumKey } from './chromium-key.js';
import { tryOpenCookieDb } from './lock.js';

/**
 * 从 Chromium Cookie 数据库提取 zhipin.com 域的所有 Cookie
 * @param profilePath - Cookie 数据库文件路径
 * @returns 解密后的 Cookie 列表
 */
export function extractChromiumCookies(profilePath: string): Cookie[] {
  const cookies: Cookie[] = [];
  const browser = inferBrowserName(profilePath);
  const key = getChromiumKey(browser);

  const db = tryOpenCookieDb(profilePath);
  if (!db) {
    console.error(`无法打开浏览器 Cookie 数据库: ${profilePath}`);
    console.error('提示：请关闭浏览器后重试');
    return cookies;
  }

  try {
    const rows = db.prepare(
      `SELECT host_key, name, value, encrypted_value, is_secure, is_httponly, expires_utc
       FROM cookies WHERE host_key LIKE '%zhipin.com%'`,
    ).all() as Array<Record<string, unknown>>;

    for (const row of rows) {
      const hostKey = String(row.host_key || '');
      const name = String(row.name || '');
      const encryptedValue = row.encrypted_value as Buffer | null;

      let value = String(row.value || '');

      // 尝试解密 encrypted_value
      if (encryptedValue && encryptedValue.length > 0) {
        try {
          const decrypted = decryptChromiumValue(encryptedValue, key, process.platform, hostKey);
          if (decrypted) {
            value = decrypted;
          }
        } catch {
          // 解密失败，使用原始 value 或跳过
        }
      }

      // 跳过空值 Cookie
      if (!name || !value) continue;

      cookies.push({
        name,
        value,
        domain: hostKey.startsWith('.') ? hostKey : `.${hostKey}`,
        path: '/',
        secure: Boolean(row.is_secure),
        httpOnly: Boolean(row.is_httponly),
        expires: row.expires_utc ? Number(row.expires_utc) : undefined,
      });
    }
  } finally {
    db.close();
  }

  return cookies;
}

/** 从路径推导浏览器名称 */
function inferBrowserName(dbPath: string): string {
  const lower = dbPath.toLowerCase();
  if (lower.includes('edge')) return 'edge';
  if (lower.includes('brave')) return 'brave';
  if (lower.includes('chromium')) return 'chromium';
  return 'chrome';
}
