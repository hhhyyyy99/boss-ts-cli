/**
 * 跨平台浏览器 Cookie 路径配置表
 * 支持 Chrome / Edge / Brave / Firefox，覆盖 Linux / macOS / Windows
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface BrowserPaths {
  defaultProfile: string;
  profileBaseDir: string;
  profileGlob: string;
  localStatePath: string;
}

const PLATFORM = os.platform() as 'linux' | 'darwin' | 'win32';

function expandEnv(p: string): string {
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  if (p.includes('%LOCALAPPDATA%'))
    return p.replace('%LOCALAPPDATA%', process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'));
  if (p.includes('%APPDATA%'))
    return p.replace('%APPDATA%', process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'));
  return p;
}

/** 浏览器 Cookie 路径配置 */
export const BROWSER_CONFIG: Record<string, Record<string, BrowserPaths>> = {
  linux: {
    chrome: {
      defaultProfile: '~/.config/google-chrome/Default/Cookies',
      profileBaseDir: '~/.config/google-chrome',
      profileGlob: 'Profile *',
      localStatePath: '~/.config/google-chrome/Local State',
    },
    edge: {
      defaultProfile: '~/.config/microsoft-edge/Default/Cookies',
      profileBaseDir: '~/.config/microsoft-edge',
      profileGlob: 'Profile *',
      localStatePath: '~/.config/microsoft-edge/Local State',
    },
    brave: {
      defaultProfile: '~/.config/BraveSoftware/Brave-Browser/Default/Cookies',
      profileBaseDir: '~/.config/BraveSoftware/Brave-Browser',
      profileGlob: 'Profile *',
      localStatePath: '~/.config/BraveSoftware/Brave-Browser/Local State',
    },
  },
  darwin: {
    chrome: {
      defaultProfile: '~/Library/Application Support/Google/Chrome/Default/Cookies',
      profileBaseDir: '~/Library/Application Support/Google/Chrome',
      profileGlob: 'Profile *',
      localStatePath: '~/Library/Application Support/Google/Chrome/Local State',
    },
    edge: {
      defaultProfile: '~/Library/Application Support/Microsoft Edge/Default/Cookies',
      profileBaseDir: '~/Library/Application Support/Microsoft Edge',
      profileGlob: 'Profile *',
      localStatePath: '~/Library/Application Support/Microsoft Edge/Local State',
    },
    brave: {
      defaultProfile: '~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies',
      profileBaseDir: '~/Library/Application Support/BraveSoftware/Brave-Browser',
      profileGlob: 'Profile *',
      localStatePath: '~/Library/Application Support/BraveSoftware/Brave-Browser/Local State',
    },
  },
  win32: {
    chrome: {
      defaultProfile: '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cookies',
      profileBaseDir: '%LOCALAPPDATA%\\Google\\Chrome\\User Data',
      profileGlob: 'Profile *',
      localStatePath: '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Local State',
    },
    edge: {
      defaultProfile: '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Cookies',
      profileBaseDir: '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data',
      profileGlob: 'Profile *',
      localStatePath: '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Local State',
    },
    brave: {
      defaultProfile: '%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cookies',
      profileBaseDir: '%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\User Data',
      profileGlob: 'Profile *',
      localStatePath: '%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\User Data\\Local State',
    },
  },
};

/** 返回当前平台的浏览器 Cookie DB 路径 */
export function getBrowserDbPath(browser: string, profile?: string): string | null {
  const platformConfigs = BROWSER_CONFIG[PLATFORM];
  if (!platformConfigs) return null;

  const config = platformConfigs[browser.toLowerCase()];
  if (!config) return null;

  if (profile) {
    const profDir = expandEnv(path.join(config.profileBaseDir, profile));
    const p = path.join(profDir, 'Cookies');
    return fs.existsSync(p) ? p : null;
  }

  const p = expandEnv(config.defaultProfile);
  return fs.existsSync(p) ? p : null;
}

/**
 * 扫描所有 Profile 目录，返回所有存在的 Cookie DB 路径
 * 先尝试 Default Profile → 无有效 Cookie 则扫描所有 Profile
 */
export function getAllBrowserProfiles(browser: string): string[] {
  const platformConfigs = BROWSER_CONFIG[PLATFORM];
  if (!platformConfigs) return [];

  const config = platformConfigs[browser.toLowerCase()];
  if (!config) return [];

  const profiles: string[] = [];
  const baseDir = expandEnv(config.profileBaseDir);
  if (!fs.existsSync(baseDir)) return profiles;

  // Default 优先
  const defaultDb = expandEnv(config.defaultProfile);
  if (fs.existsSync(defaultDb)) {
    profiles.push(defaultDb);
  }

  // 扫描其他 Profile 目录
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'Default') continue;
      if (entry.name.startsWith('Profile ') || entry.name === 'Guest Profile') {
        const dbPath = path.join(baseDir, entry.name, 'Cookies');
        if (fs.existsSync(dbPath) && !profiles.includes(dbPath)) {
          profiles.push(dbPath);
        }
      }
    }
  } catch {
    // 无法读取目录
  }

  return profiles;
}

/** Firefox profile 路径查找 */
export function getFirefoxProfile(): string | null {
  let firefoxDir = '';

  if (PLATFORM === 'linux') {
    firefoxDir = path.join(os.homedir(), '.mozilla', 'firefox');
  } else if (PLATFORM === 'darwin') {
    firefoxDir = path.join(os.homedir(), 'Library', 'Application Support', 'Firefox', 'Profiles');
  } else if (PLATFORM === 'win32') {
    firefoxDir = path.join(process.env.APPDATA || '', 'Mozilla', 'Firefox', 'Profiles');
  }

  try {
    if (!fs.existsSync(firefoxDir)) return null;

    const iniPath = path.join(firefoxDir, '..', 'profiles.ini');
    if (!fs.existsSync(iniPath)) {
      // 直接扫描 Profiles 目录
      const entries = fs.readdirSync(firefoxDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.includes('default')) {
          const dbPath = path.join(firefoxDir, entry.name, 'cookies.sqlite');
          if (fs.existsSync(dbPath)) return dbPath;
        }
      }
      return null;
    }

    // 解析 profiles.ini
    const ini = fs.readFileSync(iniPath, 'utf-8');
    const match = ini.match(/Path=([^\r\n]+)/);
    if (match) {
      const profileDir = match[1];
      // 绝对路径
      let resolved: string;
      if (path.isAbsolute(profileDir)) {
        resolved = path.join(profileDir, 'cookies.sqlite');
      } else {
        resolved = path.join(firefoxDir, profileDir, 'cookies.sqlite');
      }
      if (fs.existsSync(resolved)) return resolved;

      // 尝试在 firefoxDir 父目录下查找
      const alt = path.join(path.dirname(firefoxDir) || firefoxDir, profileDir, 'cookies.sqlite');
      if (fs.existsSync(alt)) return alt;
    }
  } catch {
    // Firefox 未安装或无法读取
  }
  return null;
}

/** 支持的浏览器列表（按优先级排序） */
export const SUPPORTED_BROWSERS = ['chrome', 'edge', 'brave', 'firefox'] as const;
export type SupportedBrowser = typeof SUPPORTED_BROWSERS[number];
