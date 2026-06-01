import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { ApiClient } from '../client.js';
import {
  handleCommand,
  isJsonMode,
  printInfo,
  extractData,
} from './common.js';
import {
  APPLIED_API,
  INTERVIEWS_API,
  CHAT_LIST_API,
} from '../constants.js';
import type {
  Application,
  Interview,
  ChatMessage,
  ApiResponse,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// applied
// ---------------------------------------------------------------------------
function registerAppliedCommand(program: Command, client: ApiClient): void {
  program
    .command('applied')
    .description('查看已投递职位列表')
    .option('-p, --page <page>', '页码', '1')
    .option('--json', 'JSON 格式输出')
    .action(async (options: { page: string; json?: boolean }) => {
      await handleCommand(async () => {
        const response = await client.get(APPLIED_API, { page: parseInt(options.page, 10) }) as ApiResponse<Application[]>;
        const data = extractData<Application[]>(response, 'zpData');
        const list: Application[] = Array.isArray(data) ? data : [];

        if (!isJsonMode()) {
          if (list.length === 0) {
            printInfo(chalk.yellow('暂无投递记录'));
          } else {
            const table = new Table({
              head: [chalk.cyan('职位名称'), chalk.cyan('公司名称'), chalk.cyan('状态'), chalk.cyan('投递时间')],
            });
            list.forEach(item => {
              table.push([item.jobName || '-', item.companyName || '-', item.status || '-', item.appliedAt || '-']);
            });
            printInfo(table.toString());
          }
        }

        return list;
      }, options);
    });
}

// ---------------------------------------------------------------------------
// interviews
// ---------------------------------------------------------------------------
function registerInterviewsCommand(program: Command, client: ApiClient): void {
  program
    .command('interviews')
    .description('查看面试邀请')
    .option('--json', 'JSON 格式输出')
    .action(async (options: { json?: boolean }) => {
      await handleCommand(async () => {
        const response = await client.get(INTERVIEWS_API) as ApiResponse<Interview[]>;
        const data = extractData<Interview[]>(response, 'zpData');
        const list: Interview[] = Array.isArray(data) ? data : [];

        if (!isJsonMode()) {
          if (list.length === 0) {
            printInfo(chalk.yellow('暂无面试邀请'));
          } else {
            const table = new Table({
              head: [chalk.cyan('公司名称'), chalk.cyan('职位名称'), chalk.cyan('面试时间'), chalk.cyan('地点'), chalk.cyan('状态')],
            });
            list.forEach(item => {
              table.push([item.companyName || '-', item.jobName || '-', item.interviewTime || '-', item.address || '-', item.status || '-']);
            });
            printInfo(table.toString());
          }
        }

        return list;
      }, options);
    });
}

// ---------------------------------------------------------------------------
// chat
// ---------------------------------------------------------------------------
function registerChatCommand(program: Command, client: ApiClient): void {
  program
    .command('chat')
    .description('查看沟通过的招聘者列表')
    .option('--json', 'JSON 格式输出')
    .action(async (options: { json?: boolean }) => {
      await handleCommand(async () => {
        const response = await client.get(CHAT_LIST_API) as ApiResponse<ChatMessage[]>;
        const data = extractData<ChatMessage[]>(response, 'zpData');
        const list: ChatMessage[] = Array.isArray(data) ? data : [];

        if (!isJsonMode()) {
          if (list.length === 0) {
            printInfo(chalk.yellow('暂无沟通记录'));
          } else {
            const table = new Table({
              head: [chalk.cyan('招聘者'), chalk.cyan('职位'), chalk.cyan('公司'), chalk.cyan('最后消息'), chalk.cyan('时间')],
            });
            list.forEach(item => {
              table.push([item.bossName || '-', item.bossTitle || '-', item.companyName || '-', (item.lastMessage || '-').substring(0, 30), item.updatedAt || '-']);
            });
            printInfo(table.toString());
          }
        }

        return list;
      }, options);
    });
}

// ---------------------------------------------------------------------------
// register
// ---------------------------------------------------------------------------
export function registerPersonalCommands(program: Command, client: ApiClient): void {
  registerAppliedCommand(program, client);
  registerInterviewsCommand(program, client);
  registerChatCommand(program, client);
}
