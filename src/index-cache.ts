import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { IndexCache } from './types/index.js';

// 获取缓存文件路径
function getCacheDir(): string {
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(base, 'boss-cli');
}

function getCachePath(): string {
  return path.join(getCacheDir(), 'index.json');
}

// 读取缓存
export function readCache(): IndexCache | null {
  try {
    const filePath = getCachePath();
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as IndexCache;

    // 验证数据结构
    if (!data.keyword || !Array.isArray(data.jobList)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// 写入缓存
export function writeCache(
  keyword: string,
  filters: Record<string, string>,
  jobList: Array<{ index: number; securityId: string }>
): void {
  try {
    const dir = getCacheDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const cache: IndexCache = {
      keyword,
      filters,
      jobList,
      cachedAt: new Date().toISOString(),
    };

    fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2), 'utf-8');
  } catch {
    // 缓存写入失败不应阻断主流程
  }
}
