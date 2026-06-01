import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { ApiClient } from '../client.js';
import {
  handleCommand,
  isJsonMode,
  printInfo,
} from './common.js';
import {
  APPLIED_API,
  INTERVIEWS_API,
  CHAT_LIST_API,
} from '../constants.js';
import type {} from '../types/index.js';

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
        const response = await client.get(APPLIED_API, { page: parseInt(options.page, 10) }) as Record<string, unknown>;
        // API 返回 { cardList: [...], totalCount: N }
        const list = (response.cardList || response.jobList || []) as Array<Record<string, unknown>>;
        const totalCount = response.totalCount as number || list.length;

        if (!isJsonMode()) {
          if (list.length === 0) {
            printInfo(chalk.yellow('暂无投递记录'));
          } else {
            const table = new Table({
              head: [chalk.cyan('#'), chalk.cyan('职位名称'), chalk.cyan('公司名称'), chalk.cyan('薪资'), chalk.cyan('状态'), chalk.cyan('投递时间')],
            });
            list.forEach((item, i) => {
              table.push([
                String(i + 1),
                (item.jobName as string) || '-',
                (item.companyName as string) || '-',
                (item.salaryDesc as string) || '-',
                (item.status as string) || '-',
                (item.appliedAt as string) || '-',
              ]);
            });
            printInfo(table.toString());
            printInfo(chalk.gray(`共 ${totalCount} 条记录`));
          }
        }

        return { cardList: list, totalCount };
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
        const response = await client.get(INTERVIEWS_API) as Record<string, unknown>;
        // API 返回 { interviewList: [...] }
        const list = (response.interviewList || []) as Array<Record<string, unknown>>;

        if (!isJsonMode()) {
          if (list.length === 0) {
            printInfo(chalk.yellow('暂无面试邀请'));
          } else {
            const table = new Table({
              head: [chalk.cyan('公司名称'), chalk.cyan('职位名称'), chalk.cyan('面试时间'), chalk.cyan('地点'), chalk.cyan('状态')],
            });
            list.forEach(item => {
              table.push([String(item.companyName || '-'), String(item.jobName || '-'), String(item.interviewTime || '-'), String(item.address || '-'), String(item.status || '-')]);
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
        const response = await client.get(CHAT_LIST_API) as Record<string, unknown>;
        // API 返回 { result: [...], friendList: [...] }
        const list = (response.result || response.friendList || []) as Array<Record<string, unknown>>;

        if (!isJsonMode()) {
          if (list.length === 0) {
            printInfo(chalk.yellow('暂无沟通记录'));
          } else {
            const table = new Table({
              head: [chalk.cyan('#'), chalk.cyan('招聘者'), chalk.cyan('公司'), chalk.cyan('职位'), chalk.cyan('最近消息')],
            });
            list.forEach((item, i) => {
              const lastMsg = (item.lastMsg || item.lastText || '-') as string;
              table.push([
                String(i + 1),
                (item.name || item.bossName || '-') as string,
                (item.brandName || '-') as string,
                (item.jobName || '-') as string,
                lastMsg.length > 40 ? lastMsg.slice(0, 37) + '...' : lastMsg,
              ]);
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
