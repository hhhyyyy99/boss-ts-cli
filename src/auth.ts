/**
 * BOSS直聘 CLI - 认证模块
 * 浏览器 Cookie 提取、二维码登录、凭证持久化
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { execSync } from 'node:child_process';
import QRCode from 'qrcode-terminal';
import { AccountSummary, AuthorizationVerificationResult, CandidateCredential, Cookie, Credential } from './types/index.js';
import { BROWSER_PATHS, CREDENTIAL_FILE, COOKIE_TTL_MS, QR_RANDKEY_URL, QR_CODE_URL, QR_SCAN_URL, QR_LOGIN_URL, QR_DISPATCHER_URL, DEFAULT_HEADERS, RESUME_BASEINFO_URL } from './constants.js';
import { encrypt, decrypt, EncryptedData, DecryptError } from './crypto.js';
import { ApiClient } from './client.js';
import { NotAuthenticatedError } from './exceptions.js';

// ====== 工具函数 ======

function expandPath(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  if (p.includes('%LOCALAPPDATA%')) {
    return p.replace('%LOCALAPPDATA%', process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'));
  }
  if (p.includes('%APPDATA%')) {
    return p.replace('%APPDATA%', process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'));
  }
  return p;
}

function getConfigDir(): string {
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'boss-cli');
}

function getCredentialPath(): string {
  return path.join(getConfigDir(), CREDENTIAL_FILE);
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ====== 浏览器 Cookie 定位 (T019) ======

const SUPPORTED_BROWSERS = ['chrome', 'firefox', 'edge', 'brave', 'chromium', 'opera', 'vivaldi'] as const;
type SupportedBrowser = typeof SUPPORTED_BROWSERS[number];

function findFirefoxProfile(): string | null {
  const platform = os.platform();
  let firefoxDir = '';

  if (platform === 'linux') {
    firefoxDir = path.join(os.homedir(), '.mozilla', 'firefox');
  } else if (platform === 'darwin') {
    firefoxDir = path.join(os.homedir(), 'Library', 'Application Support', 'Firefox', 'Profiles');
  } else if (platform === 'win32') {
    firefoxDir = path.join(process.env.APPDATA || '', 'Mozilla', 'Firefox', 'Profiles');
  }

  try {
    if (!fs.existsSync(firefoxDir)) return null;
    const iniPath = path.join(firefoxDir, '..', 'profiles.ini');
    if (fs.existsSync(iniPath)) {
      const ini = fs.readFileSync(iniPath, 'utf-8');
      const match = ini.match(/Path=([^\r\n]+)/);
      if (match) {
        const profileDir = match[1];
        // 相对路径 vs 绝对路径
        if (path.isAbsolute(profileDir)) {
          return path.join(profileDir, 'cookies.sqlite');
        }
        // 检查 profiles.ini 所在目录
        const parentDir = path.dirname(iniPath);
        const resolved = path.join(parentDir, profileDir, 'cookies.sqlite');
        if (fs.existsSync(resolved)) return resolved;
        // 检查 firefoxDir 下
        const resolved2 = path.join(firefoxDir, profileDir, 'cookies.sqlite');
        if (fs.existsSync(resolved2)) return resolved2;
      }
    }
  } catch {
    // Firefox 未安装
  }
  return null;
}

export function findCookieDb(browser: string): string | null {
  const platform = os.platform();
  const platformPaths = BROWSER_PATHS[platform];
  if (!platformPaths) return null;

  const rawPath = platformPaths[browser];
  if (!rawPath) {
    // Firefox 特殊处理
    if (browser === 'firefox') {
      return findFirefoxProfile();
    }
    return null;
  }

  const expanded = expandPath(rawPath);
  return fs.existsSync(expanded) ? expanded : null;
}

// ====== Chromium Cookie 解密 (T020) ======

function getChromiumKey(browser: string): Buffer | null {
  const platform = os.platform();

  if (platform === 'darwin') {
    const keychainMap: Record<string, string> = {
      chrome: 'Chrome Safe Storage',
      'google-chrome': 'Chrome Safe Storage',
      brave: 'Brave Safe Storage',
      edge: 'Microsoft Edge Safe Storage',
      opera: 'Opera Safe Storage',
      vivaldi: 'Vivaldi Safe Storage',
      chromium: 'Chromium Safe Storage',
    };
    const keychainName = keychainMap[browser] || 'Chrome Safe Storage';
    try {
      const result = execSync(
        `security find-generic-password -wa '${keychainName}' 2>/dev/null`,
        { encoding: 'utf-8' }
      ).trim();
      if (result && result.length > 0) {
        return Buffer.from(result, 'utf-8');
      }
    } catch {
      try {
        const result = execSync(
          `security find-generic-password -wa 'Chrome' 2>/dev/null`,
          { encoding: 'utf-8' }
        ).trim();
        if (result && result.length > 0) {
          return Buffer.from(result, 'utf-8');
        }
      } catch {
        // 无法获取钥匙链
      }
    }
    return null;
  }

  if (platform === 'linux') {
    // 方法 1: 尝试 secret-tool 查找 Chromium Safe Storage 密钥
    // Chrome 使用 schema: chrome_libsecret_os_crypt_password_v2, application=Code
    try {
      const result = execSync(
        'secret-tool lookup application Code 2>/dev/null',
        { encoding: 'utf-8' }
      ).trim();
      if (result && result.length >= 16) {
        const key = Buffer.from(result, 'base64');
        if (key.length >= 16) {
          return key;
        }
      }
    } catch {
      // secret-tool 不可用
    }

    // 方法 2: 尝试旧版 keyring 名称
    try {
      const result = execSync(
        'secret-tool lookup application chrome 2>/dev/null',
        { encoding: 'utf-8' }
      ).trim();
      if (result && result.length >= 16) {
        const key = Buffer.from(result, 'base64');
        if (key.length >= 16) {
          return key;
        }
      }
    } catch {
      // 旧版 keyring 不可用
    }

    // 方法 3: 尝试 kwallet (KDE)
    try {
      const result = execSync(
        'kwallet-query -r chrome kdewallet 2>/dev/null',
        { encoding: 'utf-8' }
      ).trim();
      if (result && result.length >= 32) {
        return Buffer.from(result, 'hex');
      }
    } catch {
      // kwallet 不可用
    }

    // 方法 4: 回退到 PBKDF2 (兼容无密钥环环境)
    return crypto.pbkdf2Sync('peanuts', 'saltysalt', 1, 16, 'sha1');
  }

  if (platform === 'win32') {
    return null; // Windows DPAPI 由系统处理
  }

  return null;
}

export function decryptChromiumCookies(profilePath: string): Cookie[] {
  const cookies: Cookie[] = [];
  const browser = path.basename(path.dirname(profilePath)).toLowerCase();
  const key = getChromiumKey(browser);

  try {
    const db = new Database(profilePath, { readonly: true });

    const rows = db.prepare(
      `SELECT host_key, name, value, encrypted_value, is_secure, is_httponly, expires_utc
       FROM cookies WHERE host_key LIKE '%zhipin.com%'`
    ).all() as Array<Record<string, unknown>>;

    for (const row of rows) {
      const hostKey = String(row.host_key || '');
      const name = String(row.name || '');
      const encryptedValue = row.encrypted_value as Buffer | null;

      let value = String(row.value || '');

      // 尝试解密 encrypted_value
      if (encryptedValue && encryptedValue.length > 0) {
        try {
          const decrypted = decryptChromiumValue(encryptedValue, key);
          if (decrypted) {
            value = decrypted;
          }
        } catch {
          // 解密失败，使用原始 value 或跳过
        }
      }

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

    db.close();
  } catch (err) {
    // 数据库无法打开（可能被浏览器锁定）
    if (err instanceof Error) {
      console.error(`读取浏览器 Cookie 失败: ${err.message}`);
    }
  }

  return cookies;
}

function decryptChromiumValue(encryptedValue: Buffer, key: Buffer | null): string | null {
  // v10 格式: "v10" + nonce(12) + ciphertext + tag(16)
  const prefix = encryptedValue.subarray(0, 3).toString('utf-8');

  if (prefix === 'v10' || prefix === 'v11') {
    if (!key) return null;

    const nonce = encryptedValue.subarray(3, 15);  // 12 bytes
    const ciphertextWithTag = encryptedValue.subarray(15);

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
      const decrypted = Buffer.concat([
        decipher.update(ciphertextWithTag),
        decipher.final(),
      ]);
      return decrypted.toString('utf-8');
    } catch {
      return null;
    }
  }

  // v20 格式 (Chrome 127+): App-Bound Encryption
  // 暂不支持，跳过
  if (prefix === 'v20') {
    return null;
  }

  // 未加密，直接返回
  return encryptedValue.toString('utf-8');
}

// ====== Firefox Cookie 解密 (T021) ======

export function decryptFirefoxCookies(_profilePath: string): Cookie[] {
  // v1 暂不支持 Firefox Cookie 解密
  // 需要解析 key4.db (NSS cert9/key4 格式)
  // 提示用户使用 Chrome
  console.error('Firefox Cookie 解密暂未支持，请使用 Chrome、Edge 或其他 Chromium 系浏览器');
  return [];
}

// ====== 统一 Cookie 提取 ======

export function autoExtractCookies(cookieSource?: string): Cookie[] {
  const browser = cookieSource || '';

  // 白名单校验
  if (cookieSource) {
    if (!SUPPORTED_BROWSERS.includes(cookieSource as SupportedBrowser)) {
      console.error(
        `不支持的浏览器: ${cookieSource}\n` +
        `仅支持: ${SUPPORTED_BROWSERS.join('/')}`
      );
      return [];
    }

    const dbPath = findCookieDb(cookieSource);
    if (!dbPath) {
      console.error(`未找到 ${cookieSource} 的 Cookie 数据，请确认浏览器已安装且登录过 zhipin.com`);
      return [];
    }

    if (cookieSource === 'firefox') {
      return decryptFirefoxCookies(dbPath);
    }
    return decryptChromiumCookies(dbPath);
  }

  // 自动探测所有支持的浏览器
  for (const browser of SUPPORTED_BROWSERS) {
    if (browser === 'firefox') continue; // v1 跳过 Firefox

    const dbPath = findCookieDb(browser);
    if (dbPath) {
      const cookies = decryptChromiumCookies(dbPath);

      // 过滤 zhipin.com Cookie，验证必要字段
      const zhipinCookies = cookies.filter(c =>
        c.domain.includes('zhipin.com') && c.name && c.value
      );

      if (zhipinCookies.length > 0) {
        // 验证 __zp_stoken__ 是否存在
        const hasStoken = zhipinCookies.some(c => c.name === '__zp_stoken__');
        if (hasStoken) {
          return zhipinCookies;
        }
        // 即使没有 stoken，只要有足够多的 Cookie 也返回
        return zhipinCookies;
      }
    }
  }

  return [];
}

// ====== 凭证持久化 (T024) ======

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCookie(value: unknown): value is Cookie {
  if (!isRecord(value)) return false;
  return typeof value.name === 'string' &&
    typeof value.value === 'string' &&
    typeof value.domain === 'string' &&
    typeof value.path === 'string';
}

export function isCredential(value: unknown): value is Credential {
  if (!isRecord(value)) return false;
  const source = value.source;
  return Array.isArray(value.cookies) &&
    value.cookies.every(isCookie) &&
    (source === 'browser' || source === 'qrcode' || source === 'web') &&
    typeof value.createdAt === 'string' &&
    typeof value.expiresAt === 'string';
}

function buildAccountSummary(profile: Record<string, unknown>, source: Credential['source']): AccountSummary {
  const displayNameValue = profile.name || profile.nickName || profile.account || profile.mobile || null;
  const accountTypeValue = profile.identity || profile.userType || profile.role || profile.type || null;
  return {
    displayName: displayNameValue == null ? null : String(displayNameValue),
    accountType: accountTypeValue == null ? null : String(accountTypeValue),
    source,
    verifiedAt: new Date().toISOString(),
  };
}

export async function verifyCandidateCredential(
  candidate: CandidateCredential,
  clientFactory: (cookies: Cookie[]) => Pick<ApiClient, 'get'> = cookies => new ApiClient(cookies),
): Promise<AuthorizationVerificationResult> {
  const nextActions = candidate.source === 'qrcode'
    ? ['boss login --qrcode', 'boss login --web', 'boss login']
    : candidate.source === 'web'
      ? ['boss login --web', 'boss login --qrcode', 'boss login']
      : ['boss login', 'boss login --qrcode', 'boss login --web'];

  if (!candidate.cookies.length) {
    return {
      status: 'rejected',
      stage: 'authorization_verification',
      accountSummary: null,
      message: '授权验证失败：未获取到可用的候选凭证',
      nextActions,
    };
  }

  try {
    const client = clientFactory(candidate.cookies);
    const profile = await client.get<Record<string, unknown>>(RESUME_BASEINFO_URL);
    const profileData = (profile.zpData && isRecord(profile.zpData)) ? profile.zpData : profile;
    return {
      status: 'verified',
      stage: 'authorization_verification',
      accountSummary: buildAccountSummary(profileData, candidate.source),
      message: '授权验证通过',
      nextActions: [],
    };
  } catch (err) {
    if (err instanceof NotAuthenticatedError) {
      return {
        status: 'rejected',
        stage: 'authorization_verification',
        accountSummary: null,
        message: '授权验证失败：候选凭证无法访问当前用户信息',
        nextActions,
      };
    }

    return {
      status: 'unknown',
      stage: 'authorization_verification',
      accountSummary: null,
      message: err instanceof Error
        ? `授权验证未完成：${err.message}`
        : '授权验证未完成：服务响应异常',
      nextActions,
    };
  }
}

export function saveCredential(cookies: Cookie[], source: string): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const now = new Date();
  const credential: Credential = {
    version: 1,
    cookies,
    source: source as Credential['source'],
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + COOKIE_TTL_MS).toISOString(),
  };

  const encrypted = encrypt(credential as unknown as Record<string, unknown>);
  fs.writeFileSync(getCredentialPath(), JSON.stringify(encrypted), 'utf-8');
}

export function saveVerifiedCredential(
  candidate: CandidateCredential,
  verification: AuthorizationVerificationResult,
): Credential {
  if (verification.status !== 'verified' || !verification.accountSummary) {
    throw new Error('拒绝保存未通过授权验证的凭证');
  }

  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const now = new Date();
  const credential: Credential = {
    version: 2,
    cookies: candidate.cookies,
    source: candidate.source,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + COOKIE_TTL_MS).toISOString(),
    accountSummary: verification.accountSummary,
    verifiedAt: verification.accountSummary.verifiedAt,
  };

  const encrypted = encrypt(credential as unknown as Record<string, unknown>);
  fs.writeFileSync(getCredentialPath(), JSON.stringify(encrypted), 'utf-8');
  return credential;
}

export function loadCredential(): Credential | null {
  try {
    const filePath = getCredentialPath();
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const encrypted: EncryptedData = JSON.parse(raw);

    // 验证加密数据结构
    if (!encrypted.iv || !encrypted.authTag || !encrypted.ciphertext) {
      throw new Error('凭证文件格式无效');
    }

    const decrypted = decrypt(encrypted);

    // 验证 Credential 数据结构
    if (!isCredential(decrypted)) {
      throw new Error('凭证数据结构不完整');
    }

    // 兼容旧版无 version 字段的凭证
    if (!decrypted.version) {
      decrypted.version = 1;
    }

    return decrypted;
  } catch (err) {
    // 格式损坏或解密失败 → 删除损坏文件
    const filePath = getCredentialPath();
    try {
      fs.unlinkSync(filePath);
    } catch {
      // 文件可能不存在
    }

    if (err instanceof DecryptError) {
      if (err.code === 'KEY_MISMATCH') {
        console.error('本地凭证已失效（可能由于系统环境变更），请重新登录: boss login');
      } else {
        console.error(`凭证文件已损坏（${err.message}），已清除。请重新登录: boss login`);
      }
    } else {
      console.error('凭证文件已损坏，已清除。请重新登录: boss login');
    }
    return null;
  }
}

export function refreshIfNeeded(cred: Credential): Credential | null {
  const now = new Date();
  const expiresAt = new Date(cred.expiresAt);

  if (now < expiresAt) {
    return cred; // 未过期
  }

  const source = cred.source;

  // 根据来源选择续期方式
  if (source === 'browser') {
    // 浏览器提取的凭证 → 重试浏览器自动提取
    const cookies = autoExtractCookies();
    if (cookies.length > 0) {
      saveCredential(cookies, source);
      return loadCredential();
    }
  } else if (source === 'qrcode') {
    // 二维码登录的凭证 → 提示重新扫码，不能自动续期
    console.error('凭证已过期，请使用 boss login --qrcode 重新扫码登录');
    return null;
  } else if (source === 'web') {
    // 浏览器页面登录的凭证 → 提示重新浏览器登录
    console.error('凭证已过期，请使用 boss login --web 重新登录');
    return null;
  }

  // 尝试浏览器自动提取作为回退
  const cookies = autoExtractCookies();
  if (cookies.length > 0) {
    saveCredential(cookies, 'browser');
    return loadCredential();
  }

  console.error('凭证已过期且无法自动刷新，请重新登录: boss login');
  return null;
}
