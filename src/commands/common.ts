import { SchemaEnvelope } from '../types/index.js';
import { success, error, ErrorCodes } from '../schema.js';
import { BossApiError } from '../exceptions.js';

// 全局状态
let globalJsonMode = false;
let globalVerbose = false;

export function setJsonMode(on: boolean): void {
  globalJsonMode = on;
}

export function isJsonMode(): boolean {
  return globalJsonMode || !process.stdout.isTTY;
}

export function setVerbose(on: boolean): void {
  globalVerbose = on;
}

export function isVerbose(): boolean {
  return globalVerbose;
}

// 通用命令处理包装函数
export async function handleCommand<T>(
  action: () => Promise<T>,
  options: { json?: boolean } = {}
): Promise<void> {
  if (options.json) {
    setJsonMode(true);
  }

  try {
    const data = await action();

    if (isJsonMode()) {
      const envelope = success(data);
      process.stdout.write(JSON.stringify(envelope) + '\n');
    }
  } catch (err) {
    if (isJsonMode()) {
      if (err instanceof BossApiError) {
        const envelope = error(err.code, err.message);
        process.stdout.write(JSON.stringify(envelope) + '\n');
      } else {
        const envelope = error(
          ErrorCodes.UNKNOWN_ERROR,
          err instanceof Error ? err.message : '未知错误'
        );
        process.stdout.write(JSON.stringify(envelope) + '\n');
      }
    } else {
      // 人类可读错误
      if (err instanceof BossApiError) {
        process.stderr.write(`\n错误: ${err.message}\n`);
      } else if (err instanceof Error) {
        process.stderr.write(`\n未知错误: ${err.message}\n`);
      }
    }
    process.exit(1);
  }
}

// 输出 JSON 到 stdout（用于 Rich 模式下需要输出 JSON 的子命令）
export function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

// 输出错误消息到 stderr
export function printError(message: string): void {
  process.stderr.write(`\n错误: ${message}\n`);
}

// 输出信息到 stderr
export function printInfo(message: string): void {
  if (!isJsonMode()) {
    process.stderr.write(`${message}\n`);
  }
}

// API 响应数据提取
export function extractData<T>(response: Record<string, unknown>, key?: string): T {
  if (key) {
    const nested = response[key];
    if (nested !== undefined) {
      return nested as T;
    }
  }
  return response as unknown as T;
}
