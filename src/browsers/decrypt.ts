/**
 * 浏览器 Cookie 解密工具
 * 支持 Chromium v10 / v11 / v20 加密格式
 * 自动检测密钥长度选择 AES-128-GCM 或 AES-256-GCM
 */
import crypto from 'node:crypto';

/**
 * 解密 Chromium 加密的 Cookie 值
 * @returns 解密后的 UTF-8 字符串，失败返回 null
 */
export function decryptChromiumValue(
  encryptedValue: Buffer,
  key: Buffer | null,
  platform: NodeJS.Platform = process.platform,
  hostKey?: string,
): string | null {
  if (encryptedValue.length < 3) return null;
  if (!key || key.length < 16) return null;

  const prefix = encryptedValue.subarray(0, 3).toString('utf-8');

  // v10 / v11 格式: prefix(3) + nonce(12) + ciphertext + tag(16)
  if (prefix === 'v10' || prefix === 'v11') {
    return tryDecryptGCM(encryptedValue, key, hostKey) ||
      tryDecryptLinuxCBC(encryptedValue, key, hostKey);
  }

  // v20 格式 (Chrome 127+ App-Bound Encryption) — 仅 Windows
  if (prefix === 'v20') {
    if (platform !== 'win32') return null;
    return tryDecryptGCM(encryptedValue, key, hostKey);
  }

  return null;
}

function tryDecryptGCM(encryptedValue: Buffer, key: Buffer, hostKey?: string): string | null {
  if (encryptedValue.length < 31) return null; // 3 + 12 + 16(min)

  const nonce = encryptedValue.subarray(3, 15);
  const ciphertext = encryptedValue.subarray(15, encryptedValue.length - 16);
  const authTag = encryptedValue.subarray(encryptedValue.length - 16);

  // 根据密钥长度选择算法
  const algorithms: Array<{ algo: string; keyLen: number }> = [];
  if (key.length >= 32) algorithms.push({ algo: 'aes-256-gcm', keyLen: 32 });
  if (key.length >= 16) algorithms.push({ algo: 'aes-128-gcm', keyLen: 16 });

  for (const { algo, keyLen } of algorithms) {
    try {
      const aesKey = key.subarray(0, keyLen);
      const decipher = crypto.createDecipheriv(algo, aesKey, nonce) as any;
      if (typeof decipher.setAuthTag === 'function') {
        decipher.setAuthTag(authTag);
      }
      const d1 = decipher.update(ciphertext);
      const d2 = decipher.final();
      return decodeChromiumPlaintext(Buffer.concat([d1, d2]), hostKey);
    } catch {
      // 尝试下一个算法
    }
  }

  return null;
}

function tryDecryptLinuxCBC(encryptedValue: Buffer, key: Buffer, hostKey?: string): string | null {
  if (encryptedValue.length < 19) return null;

  try {
    const iv = Buffer.alloc(16, 0x20);
    const ciphertext = encryptedValue.subarray(3);
    const decipher = crypto.createDecipheriv('aes-128-cbc', key.subarray(0, 16), iv);
    const d1 = decipher.update(ciphertext);
    const d2 = decipher.final();
    return decodeChromiumPlaintext(Buffer.concat([d1, d2]), hostKey);
  } catch {
    return null;
  }
}

function decodeChromiumPlaintext(value: Buffer, hostKey?: string): string {
  if (hostKey && value.length > 32) {
    const domainHash = crypto.createHash('sha256').update(hostKey).digest();
    if (value.subarray(0, 32).equals(domainHash)) {
      return value.subarray(32).toString('utf-8');
    }
  }

  return value.toString('utf-8');
}
