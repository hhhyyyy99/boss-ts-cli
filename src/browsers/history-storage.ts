import fs from 'node:fs';
import path from 'node:path';
import { getAllBrowserProfiles } from './paths.js';

export interface BrowserHistoryJobIds {
  jobIds: string[];
  source: string | null;
}

const HISTORY_KEY = '_Job_History';

function profileDirFromCookieDb(cookieDbPath: string): string {
  return path.dirname(cookieDbPath);
}

function extractJsonArrayAfterKey(content: string): string | null {
  const keyIndex = content.indexOf(HISTORY_KEY);
  if (keyIndex < 0) return null;

  const arrayStart = content.indexOf('[', keyIndex);
  if (arrayStart < 0) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (let i = arrayStart; i < content.length; i++) {
    const ch = content[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '[') depth++;
    if (ch === ']') {
      depth--;
      if (depth === 0) {
        return content.slice(arrayStart, i + 1);
      }
    }
  }

  return null;
}

export function extractJobIdsFromHistoryStorageContent(content: string, now = Date.now()): string[] {
  const json = extractJsonArrayAfterKey(content);
  if (!json) return [];

  try {
    const records = JSON.parse(json) as Array<Record<string, unknown>>;
    const ids: string[] = [];
    for (const record of records) {
      const expiresAt = Number(record.storage_expire_time || 0);
      if (expiresAt > 0 && expiresAt < now) continue;
      const jobId = record.job_id;
      if (typeof jobId === 'string' && jobId && !ids.includes(jobId)) {
        ids.push(jobId);
      }
    }
    return ids;
  } catch {
    return [];
  }
}

export function readHistoryJobIdsFromProfile(profileDir: string): BrowserHistoryJobIds {
  const levelDbDir = path.join(profileDir, 'Local Storage', 'leveldb');
  if (!fs.existsSync(levelDbDir)) {
    return { jobIds: [], source: null };
  }

  try {
    const files = fs.readdirSync(levelDbDir)
      .filter(file => file.endsWith('.ldb') || file.endsWith('.log'))
      .map(file => path.join(levelDbDir, file));

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const jobIds = extractJobIdsFromHistoryStorageContent(content);
      if (jobIds.length > 0) {
        return { jobIds, source: file };
      }
    }
  } catch {
    return { jobIds: [], source: null };
  }

  return { jobIds: [], source: null };
}

export function detectHistoryJobIdsFromBrowsers(): BrowserHistoryJobIds {
  for (const browser of ['chrome', 'edge', 'brave']) {
    for (const cookieDbPath of getAllBrowserProfiles(browser)) {
      const result = readHistoryJobIdsFromProfile(profileDirFromCookieDb(cookieDbPath));
      if (result.jobIds.length > 0) {
        return result;
      }
    }
  }

  return { jobIds: [], source: null };
}
