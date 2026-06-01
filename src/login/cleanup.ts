/**
 * 临时文件生命周期管理
 * os.tmpdir() 创建 + process 退出钩子清理
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cleanupHooks: Set<() => void> = new Set();
let hooksRegistered = false;

/** 注册退出清理钩子 */
function ensureHooks(): void {
  if (hooksRegistered) return;
  hooksRegistered = true;

  const cleanup = () => {
    for (const hook of cleanupHooks) {
      try { hook(); } catch { /* 忽略清理错误 */ }
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });
}

/**
 * 创建临时文件并注册自动清理
 * @returns 临时文件的绝对路径
 */
export function createTempFile(prefix: string, ext: string): string {
  ensureHooks();
  const tmpFile = path.join(os.tmpdir(), `${prefix}_${Date.now()}.${ext}`);
  return tmpFile;
}

/**
 * 注册临时文件清理
 * @param filePath - 文件路径
 */
export function registerCleanup(filePath: string): void {
  ensureHooks();
  cleanupHooks.add(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch { /* 忽略 */ }
  });
}

/**
 * 立即清理指定文件
 */
export function immediateCleanup(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch { /* 忽略 */ }
}
