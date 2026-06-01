import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';

// 算法
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

// 从机器指纹派生加密密钥
// 使用 hostname + username + machine-id 的 SHA-256
function deriveKey(): Buffer {
  const fingerprint = `${os.hostname()}-${os.userInfo().username}`;

  let machineId = '';
  try {
    // Linux
    if (fs.existsSync('/etc/machine-id')) {
      machineId = fs.readFileSync('/etc/machine-id', 'utf-8').trim();
    }
    // macOS
    else if (fs.existsSync('/var/db/dhcpd_leases')) {
      machineId = os.hostname();
    }
    // 通用回退
    else {
      machineId = os.hostname() + '-' + os.platform();
    }
  } catch {
    machineId = os.hostname();
  }

  const seed = `${fingerprint}-${machineId}`;
  return crypto.createHash('sha256').update(seed).digest();
}

let ENCRYPTION_KEY = deriveKey();

export interface EncryptedData {
  iv: string;        // Base64
  authTag: string;   // Base64
  ciphertext: string; // Base64
}

export class DecryptError extends Error {
  constructor(message: string, public readonly code: 'BAD_FORMAT' | 'DECRYPT_FAILED' | 'KEY_MISMATCH') {
    super(message);
    this.name = 'DecryptError';
  }
}

// 加密 JSON 数据
export function encrypt(plaintext: Record<string, unknown>): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const json = JSON.stringify(plaintext);
  const encrypted = Buffer.concat([
    cipher.update(json, 'utf-8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  };
}

// 解密数据
export function decrypt(encrypted: EncryptedData): Record<string, unknown> {
  if (!encrypted.iv || !encrypted.authTag || !encrypted.ciphertext) {
    throw new DecryptError('凭证文件格式无效', 'BAD_FORMAT');
  }

  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf-8'));
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new DecryptError('凭证数据已损坏', 'DECRYPT_FAILED');
    }
    throw new DecryptError('凭证解密失败，密钥不匹配（可能由于系统环境变更）', 'KEY_MISMATCH');
  }
}

// 重新设置加密密钥（用于单元测试）
export function _setKeyForTesting(key: Buffer): void {
  (ENCRYPTION_KEY as Buffer) = key;
}
