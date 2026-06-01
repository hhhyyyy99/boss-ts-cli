/**
 * Chromium 浏览器加密密钥提取
 * 支持 macOS Keychain / Linux secret-tool+kwallet+PBKDF2 / Windows DPAPI
 */
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const PLATFORM = process.platform as 'darwin' | 'linux' | 'win32';

/** macOS Keychain 中每个浏览器的 Safe Storage 名称 */
const MAC_KEYCHAIN_NAMES: Record<string, string> = {
  chrome: 'Chrome Safe Storage',
  edge: 'Microsoft Edge Safe Storage',
  brave: 'Brave Safe Storage',
  chromium: 'Chromium Safe Storage',
};

/**
 * 获取 Chromium 浏览器用于 Cookie 加密的 AES 密钥
 * @param browser - 浏览器名称 (chrome/edge/brave)
 */
export function getChromiumKey(browser: string): Buffer | null {
  if (PLATFORM === 'darwin') {
    return getChromiumKeyMac(browser);
  }
  if (PLATFORM === 'linux') {
    return getChromiumKeyLinux();
  }
  if (PLATFORM === 'win32') {
    return getChromiumKeyWindows();
  }
  return null;
}

function getChromiumKeyMac(browser: string): Buffer | null {
  const keychainName = MAC_KEYCHAIN_NAMES[browser.toLowerCase()];
  if (!keychainName) return null;

  try {
    const result = execSync(
      `security find-generic-password -wa '${keychainName}' 2>/dev/null`,
      { encoding: 'utf-8', timeout: 5000 },
    ).trim();
    if (result && result.length > 0) {
      return Buffer.from(result, 'utf-8');
    }
  } catch {
    // 一级名称失败，尝试 "Chrome" 作为兼容性后备
  }

  // 兼容性后备：某些旧版 Chrome 使用 "Chrome" 作为钥匙串项名
  try {
    const result = execSync(
      `security find-generic-password -wa 'Chrome' 2>/dev/null`,
      { encoding: 'utf-8', timeout: 5000 },
    ).trim();
    if (result && result.length > 0) {
      return Buffer.from(result, 'utf-8');
    }
  } catch {
    // 无法获取钥匙链
  }

  return null;
}

function deriveLinuxKey(password: string): Buffer {
  return crypto.pbkdf2Sync(password, 'saltysalt', 1, 16, 'sha1');
}

function getChromiumKeyLinux(): Buffer | null {
  const lookups = [
    'secret-tool lookup xdg:schema chrome_libsecret_os_crypt_password_v2 application chrome 2>/dev/null',
    'secret-tool lookup xdg:schema chrome_libsecret_os_crypt_password_v2 application chromium 2>/dev/null',
    'secret-tool lookup xdg:schema chrome_libsecret_os_crypt_password_v2 application google-chrome 2>/dev/null',
    'secret-tool lookup application chrome 2>/dev/null',
    'secret-tool lookup application chromium 2>/dev/null',
    'secret-tool lookup application google-chrome 2>/dev/null',
    'secret-tool lookup application "Google Chrome" 2>/dev/null',
    'secret-tool lookup application Code 2>/dev/null',
  ];

  // 方法 1: secret-tool (GNOME Keyring / libsecret)
  for (const command of lookups) {
    try {
      const password = execSync(command, { encoding: 'utf-8', timeout: 5000 }).trim();
      if (password) {
        return deriveLinuxKey(password);
      }
    } catch {
      // 尝试下一个 keyring 查询
    }
  }

  // 方法 2: kwallet (KDE)
  try {
    const result = execSync(
      'kwallet-query -r chrome kdewallet 2>/dev/null',
      { encoding: 'utf-8', timeout: 5000 },
    ).trim();
    if (result && result.length >= 32) {
      return deriveLinuxKey(result);
    }
  } catch {
    // kwallet 不可用
  }

  // 方法 3: PBKDF2 回退（兼容无密钥环环境）
  // 这是 Chromium 开源代码中已知的硬编码盐值和密码
  return deriveLinuxKey('peanuts');
}

function getChromiumKeyWindows(): Buffer | null {
  // Windows DPAPI 解密密钥
  // 从 Chrome Local State 文件读取 encrypted_key，通过 DPAPI 解密
  // 由于 Node.js 没有内置 DPAPI 支持，此处返回 null 表示需要调用系统工具
  // 实际解密将在 chromium.ts 中通过读取 Local State + 调用 PowerShell 完成
  return null;
}
