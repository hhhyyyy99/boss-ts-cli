/**
 * Firefox Cookie 提取
 * 读取 cookies.sqlite，支持 Linux (明文) / macOS (NSS) / Windows (DPAPI)
 */
import Database from 'better-sqlite3';
import { Cookie } from '../types/index.js';

/**
 * 从 Firefox Cookie 数据库提取 zhipin.com 域的所有 Cookie
 * @param profilePath - cookies.sqlite 文件路径
 * @returns Cookie 列表
 */
export function extractFirefoxCookies(profilePath: string): Cookie[] {
  const cookies: Cookie[] = [];

  try {
    const db = new Database(profilePath, { readonly: true });

    const rows = db.prepare(
      `SELECT host, name, value, path, isSecure, isHttpOnly, expiry
       FROM moz_cookies WHERE host LIKE '%zhipin.com%'`,
    ).all() as Array<Record<string, unknown>>;

    for (const row of rows) {
      const host = String(row.host || '');
      const name = String(row.name || '');
      const value = String(row.value || '');

      if (!name || !value) continue;

      cookies.push({
        name,
        value,
        domain: host.startsWith('.') ? host : `.${host}`,
        path: String(row.path || '/'),
        secure: Boolean(row.isSecure),
        httpOnly: Boolean(row.isHttpOnly),
        expires: row.expiry ? Number(row.expiry) : undefined,
      });
    }

    db.close();
  } catch (err) {
    if (err instanceof Error) {
      console.error(`读取 Firefox Cookie 失败: ${err.message}`);
    }
  }

  return cookies;
}
