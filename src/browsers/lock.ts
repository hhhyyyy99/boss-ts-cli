/**
 * 数据库锁定处理
 * WAL 模式只读打开 + 文件复制到临时目录回退
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Database from 'better-sqlite3';

/**
 * 尝试打开 Cookie 数据库，处理浏览器锁定
 * 1. 直接以只读模式打开（WAL 模式兼容）
 * 2. SQLITE_BUSY → 复制文件到临时目录再打开
 * 3. 复制也失败 → 提示用户关闭浏览器
 */
export function tryOpenCookieDb(dbPath: string): Database.Database | null {
  // 尝试 1: 直接只读打开
  try {
    const db = new Database(dbPath, { readonly: true });
    return db;
  } catch (err) {
    if (!isLockError(err)) throw err;
    // 回退到文件复制
  }

  // 尝试 2: 复制到临时目录
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `boss_cookie_copy_${Date.now()}.sqlite`);

  try {
    fs.copyFileSync(dbPath, tmpFile);
    const db = new Database(tmpFile, { readonly: true });

    // 注册清理钩子（db 关闭后删除临时文件）
    const origClose = db.close.bind(db);
    (db as any).close = () => {
      (origClose as () => void)();
      try { fs.unlinkSync(tmpFile); } catch { /* 忽略 */ }
      return undefined as any;
    };

    return db;
  } catch {
    // 复制也失败
    try { fs.unlinkSync(tmpFile); } catch { /* 忽略 */ }
  }

  return null;
}

function isLockError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes('sqlite_busy') || msg.includes('database is locked');
  }
  return false;
}
