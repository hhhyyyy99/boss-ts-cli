import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as fs from 'fs';
import * as readline from 'readline';
import { ApiClient } from '../client.js';
import { handleCommand, isJsonMode, printInfo, printError } from './common.js';
import { BASE_URL } from '../constants.js';

// ============================================================
// 招聘方 API 端点常量
// ============================================================

const RECRUITER_SEARCH_API = `${BASE_URL}/wapi/zpboss/geek/search.json`;
const RECRUITER_RECOMMEND_API = `${BASE_URL}/wapi/zpboss/recommend/geek.json`;
const RECRUITER_INBOX_API = `${BASE_URL}/wapi/zpboss/chat/inbox.json`;
const RECRUITER_RESUME_API = `${BASE_URL}/wapi/zpboss/geek/resume.json`;
const RECRUITER_JOB_LIST_API = `${BASE_URL}/wapi/zpboss/job/list.json`;
const RECRUITER_CHAT_START_API = `${BASE_URL}/wapi/zpboss/chat/start.json`;
const RECRUITER_CHAT_HISTORY_API = `${BASE_URL}/wapi/zpboss/chat/history.json`;
const RECRUITER_CHAT_REPLY_API = `${BASE_URL}/wapi/zpboss/chat/reply.json`;
const RECRUITER_REQUEST_RESUME_API = `${BASE_URL}/wapi/zpboss/chat/requestResume.json`;
const RECRUITER_EXCHANGE_PHONE_API = `${BASE_URL}/wapi/zpboss/chat/exchangePhone.json`;
const RECRUITER_EXCHANGE_WECHAT_API = `${BASE_URL}/wapi/zpboss/chat/exchangeWechat.json`;
const RECRUITER_INVITE_INTERVIEW_API = `${BASE_URL}/wapi/zpboss/interview/create.json`;
const RECRUITER_MARK_UNSUITABLE_API = `${BASE_URL}/wapi/zpboss/chat/unsuitable.json`;
const RECRUITER_JOB_CLOSE_API = `${BASE_URL}/wapi/zpboss/job/close.json`;
const RECRUITER_JOB_REOPEN_API = `${BASE_URL}/wapi/zpboss/job/reopen.json`;
const RECRUITER_LABELS_API = `${BASE_URL}/wapi/zpboss/geek/labels.json`;

// ============================================================
// 工具函数
// ============================================================

/**
 * 交互式确认（仅在非 JSON 模式下使用）
 */
function confirmPrompt(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    rl.question(`${message} [y/N] `, (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * 需要确认的操作：JSON 模式下必须传 --yes，否则提示
 */
async function requireConfirm(yesFlag: boolean | undefined, promptMsg: string): Promise<boolean> {
  if (yesFlag) return true;
  if (isJsonMode()) {
    printError(`需要 --yes 确认: ${promptMsg}`);
    process.exit(1);
  }
  return confirmPrompt(promptMsg);
}

/**
 * 安全解析页码
 */
function parsePage(raw: string | undefined, fallback = 1): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 1 ? fallback : n;
}

/**
 * 安全解析计数
 */
function parseCount(raw: string | undefined, fallback = 10): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 1 ? fallback : n;
}

/**
 * 渲染候选人表格到 stderr
 */
function renderCandidateTable(candidates: Record<string, unknown>[]): void {
  const table = new Table({
    head: [
      chalk.cyan('名称'),
      chalk.cyan('学历'),
      chalk.cyan('经验'),
      chalk.cyan('期望城市'),
      chalk.cyan('期望薪资'),
      chalk.cyan('技能'),
    ],
    colWidths: [16, 10, 12, 14, 14, 30],
    wordWrap: true,
  });

  for (const c of candidates) {
    const skills = Array.isArray(c.skills) ? (c.skills as string[]).join(', ') : '';
    table.push([
      (c.geekName as string) || '-',
      (c.degreeName as string) || '-',
      (c.experienceName as string) || '-',
      (c.expectCity as string) || '-',
      (c.expectSalary as string) || '-',
      skills || '-',
    ]);
  }

  process.stderr.write(table.toString() + '\n');
}

/**
 * 渲染收件箱消息表格到 stderr
 */
function renderInboxTable(messages: Record<string, unknown>[]): void {
  const table = new Table({
    head: [
      chalk.cyan('候选人'),
      chalk.cyan('公司'),
      chalk.cyan('最近消息'),
      chalk.cyan('更新时间'),
    ],
    colWidths: [16, 18, 36, 20],
    wordWrap: true,
  });

  for (const m of messages) {
    const lastMsg = (m.lastMessage as string) || (m.content as string) || '-';
    const updated = (m.updatedAt as string) || (m.lastTime as string) || '-';
    table.push([
      (m.geekName as string) || (m.name as string) || '-',
      (m.companyName as string) || '-',
      lastMsg.length > 40 ? lastMsg.slice(0, 37) + '...' : lastMsg,
      updated,
    ]);
  }

  process.stderr.write(table.toString() + '\n');
}

/**
 * 渲染职位表格到 stderr
 */
function renderJobsTable(jobs: Record<string, unknown>[]): void {
  const table = new Table({
    head: [
      chalk.cyan('职位名称'),
      chalk.cyan('城市'),
      chalk.cyan('薪资'),
      chalk.cyan('状态'),
      chalk.cyan('候选人数'),
    ],
    colWidths: [24, 12, 14, 10, 12],
    wordWrap: true,
  });

  for (const j of jobs) {
    const status = j.status === 'active' || j.status === 1
      ? chalk.green('招聘中')
      : chalk.gray('已关闭');
    table.push([
      (j.jobName as string) || '-',
      (j.cityName as string) || '-',
      (j.salaryDesc as string) || '-',
      status,
      String(j.candidateCount ?? '-'),
    ]);
  }

  process.stderr.write(table.toString() + '\n');
}

/**
 * 渲染聊天历史到 stderr
 */
function renderChatHistory(messages: Record<string, unknown>[]): void {
  for (const msg of messages) {
    const sender = msg.sender === 1 || msg.role === 'boss'
      ? chalk.blue('【我】')
      : chalk.green('【候选人】');
    const time = (msg.createdAt as string) || (msg.time as string) || '';
    process.stderr.write(`${sender} ${chalk.gray(time)}\n`);
    process.stderr.write(`${(msg.content as string) || (msg.text as string) || ''}\n\n`);
  }
}

/**
 * 渲染简历到 stderr
 */
function renderResume(resume: Record<string, unknown>): void {
  const lines: string[] = [];

  // 基本信息
  lines.push(chalk.bold.underline('=== 简历 ==='));
  lines.push('');
  lines.push(`${chalk.bold('姓名：')}${resume.geekName || resume.name || '-'}`);
  lines.push(`${chalk.bold('性别：')}${resume.gender || resume.geekGender || '-'}`);
  lines.push(`${chalk.bold('年龄：')}${resume.age || resume.geekAge || '-'}`);
  lines.push(`${chalk.bold('学历：')}${resume.degreeName || resume.degree || '-'}`);
  lines.push(`${chalk.bold('工作经验：')}${resume.experienceName || resume.workYears || '-'}`);
  lines.push(`${chalk.bold('手机号：')}${resume.phone || resume.mobile || '-'}`);
  lines.push(`${chalk.bold('邮箱：')}${resume.email || '-'}`);

  // 期望工作
  if (resume.expectCity || resume.expectSalary || resume.expectPosition) {
    lines.push('');
    lines.push(chalk.bold.underline('期望工作'));
    lines.push(`${chalk.bold('期望城市：')}${resume.expectCity || '-'}`);
    lines.push(`${chalk.bold('期望薪资：')}${resume.expectSalary || '-'}`);
    lines.push(`${chalk.bold('期望职位：')}${resume.expectPosition || '-'}`);
  }

  // 技能
  const skills = resume.skills;
  if (Array.isArray(skills) && skills.length > 0) {
    lines.push('');
    lines.push(chalk.bold.underline('技能'));
    lines.push(skills.join('、'));
  }

  // 工作经历
  const workExp = resume.workExperiences || resume.workExperienceList;
  if (Array.isArray(workExp) && workExp.length > 0) {
    lines.push('');
    lines.push(chalk.bold.underline('工作经历'));
    for (const exp of workExp as Record<string, unknown>[]) {
      lines.push('');
      lines.push(`${chalk.bold('公司：')}${exp.companyName || exp.company || '-'}`);
      lines.push(`${chalk.bold('职位：')}${exp.positionName || exp.position || '-'}`);
      lines.push(`${chalk.bold('时间：')}${exp.startDate || exp.start || '-'} ~ ${exp.endDate || exp.end || '至今'}`);
      if (exp.description || exp.desc) {
        const desc = (exp.description || exp.desc) as string;
        lines.push(`${chalk.bold('描述：')}${desc.length > 100 ? desc.slice(0, 97) + '...' : desc}`);
      }
    }
  }

  // 教育经历
  const eduExp = resume.educationExperiences || resume.educationList;
  if (Array.isArray(eduExp) && eduExp.length > 0) {
    lines.push('');
    lines.push(chalk.bold.underline('教育经历'));
    for (const edu of eduExp as Record<string, unknown>[]) {
      lines.push('');
      lines.push(`${chalk.bold('学校：')}${edu.schoolName || edu.school || '-'}`);
      lines.push(`${chalk.bold('专业：')}${edu.majorName || edu.major || '-'}`);
      lines.push(`${chalk.bold('学历：')}${edu.degreeName || edu.degree || '-'}`);
      lines.push(`${chalk.bold('时间：')}${edu.startDate || edu.start || '-'} ~ ${edu.endDate || edu.end || '毕业'}`);
    }
  }

  // 项目经历
  const projExp = resume.projectExperiences || resume.projectList;
  if (Array.isArray(projExp) && projExp.length > 0) {
    lines.push('');
    lines.push(chalk.bold.underline('项目经历'));
    for (const proj of projExp as Record<string, unknown>[]) {
      lines.push('');
      lines.push(`${chalk.bold('项目：')}${proj.projectName || proj.name || '-'}`);
      lines.push(`${chalk.bold('角色：')}${proj.role || '-'}`);
      lines.push(`${chalk.bold('时间：')}${proj.startDate || proj.start || '-'} ~ ${proj.endDate || proj.end || '-'}`);
      if (proj.description || proj.desc) {
        const desc = (proj.description || proj.desc) as string;
        lines.push(`${chalk.bold('描述：')}${desc.length > 150 ? desc.slice(0, 147) + '...' : desc}`);
      }
    }
  }

  // 自我描述
  if (resume.selfDesc || resume.personalDesc) {
    lines.push('');
    lines.push(chalk.bold.underline('自我描述'));
    lines.push((resume.selfDesc || resume.personalDesc) as string);
  }

  process.stderr.write(lines.join('\n') + '\n');
}

/**
 * 从 API 响应中提取数据列表
 */
function extractList(data: Record<string, unknown>, key: string): Record<string, unknown>[] {
  if (data[key] && Array.isArray(data[key])) {
    return data[key] as Record<string, unknown>[];
  }
  if (data.zpData && (data.zpData as Record<string, unknown>)[key]) {
    const nested = (data.zpData as Record<string, unknown>)[key];
    if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  }
  return [];
}

/**
 * 从 API 响应中提取总数
 */
function extractTotal(data: Record<string, unknown>): number {
  return (data.totalCount as number) || (data.total as number) || 0;
}

/**
 * 从 API 响应中提取是否有更多页
 */
function extractHasMore(data: Record<string, unknown>): boolean {
  return (data.hasMore as boolean) ?? false;
}

// ============================================================
// 注册招聘方命令
// ============================================================

export function registerRecruiterCommands(program: Command, client: ApiClient): void {
  const recruiter = program
    .command('recruiter')
    .alias('hr')
    .description('BOSS直聘招聘方功能（搜索候选人、管理职位、沟通等）');

  // ----------------------------------------------------------
  // 1. search — 搜索候选人
  // ----------------------------------------------------------
  recruiter
    .command('search <keyword>')
    .description('搜索候选人')
    .option('-c, --city <city>', '城市')
    .option('-e, --exp <exp>', '经验要求（如 1-3年, 3-5年）')
    .option('-d, --degree <degree>', '学历要求（大专、本科、硕士、博士）')
    .option('-p, --page <n>', '页码', '1')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (keyword: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const page = parsePage(options.page as string);
        const body: Record<string, unknown> = {
          query: keyword,
          page,
          pageSize: 15,
        };
        if (options.city) body.city = options.city;
        if (options.exp) body.experience = options.exp;
        if (options.degree) body.degree = options.degree;

        const data = await client.post<Record<string, unknown>>(RECRUITER_SEARCH_API, body);

        if (!isJsonMode()) {
          const list = extractList(data, 'geekList');
          if (list.length === 0) {
            printInfo(chalk.yellow('未找到匹配的候选人'));
          } else {
            const total = extractTotal(data);
            printInfo(chalk.gray(`第 ${page} 页，共 ${total} 条结果`));
            renderCandidateTable(list);
            if (extractHasMore(data)) {
              printInfo(chalk.gray(`使用 -p ${page + 1} 查看下一页`));
            }
          }
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 2. recommend — 推荐候选人
  // ----------------------------------------------------------
  recruiter
    .command('recommend')
    .description('推荐候选人')
    .option('--job <encryptJobId>', '按职位过滤')
    .option('-p, --page <n>', '页码', '1')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const page = parsePage(options.page as string);
        const params: Record<string, string | number | undefined> = {
          page,
          pageSize: 15,
        };
        if (options.job) params.encryptJobId = options.job;

        const data = await client.get<Record<string, unknown>>(
          RECRUITER_RECOMMEND_API,
          params
        );

        if (!isJsonMode()) {
          const list = extractList(data, 'geekList');
          if (list.length === 0) {
            printInfo(chalk.yellow('暂无推荐候选人'));
          } else {
            printInfo(chalk.gray(`第 ${page} 页推荐`));
            renderCandidateTable(list);
            if (extractHasMore(data)) {
              printInfo(chalk.gray(`使用 -p ${page + 1} 查看下一页`));
            }
          }
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 3. greet — 向候选人打招呼
  // ----------------------------------------------------------
  recruiter
    .command('greet <encryptGeekId>')
    .description('向候选人打招呼')
    .option('--message <msg>', '自定义打招呼消息')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (encryptGeekId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const body: Record<string, unknown> = {
          encryptGeekId,
        };
        if (options.message) body.greeting = options.message;

        const data = await client.post<Record<string, unknown>>(
          RECRUITER_CHAT_START_API,
          body
        );

        if (!isJsonMode()) {
          printInfo(chalk.green(`已向候选人 ${encryptGeekId} 打招呼`));
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 4. batch-view — 批量查看候选人
  // ----------------------------------------------------------
  recruiter
    .command('batch-view <keyword>')
    .description('批量查看候选人')
    .option('-c, --city <city>', '城市')
    .option('-n, --count <n>', '查看数量', '10')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (keyword: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const count = parseCount(options.count as string);
        const body: Record<string, unknown> = {
          query: keyword,
          page: 1,
          pageSize: Math.min(count, 50),
        };
        if (options.city) body.city = options.city;

        const data = await client.post<Record<string, unknown>>(RECRUITER_SEARCH_API, body);

        if (!isJsonMode()) {
          const list = extractList(data, 'geekList');
          if (list.length === 0) {
            printInfo(chalk.yellow('未找到匹配的候选人'));
          } else {
            printInfo(chalk.gray(`已查看 ${list.length} 位候选人`));
            renderCandidateTable(list);
          }
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 5. inbox — 查看候选人消息
  // ----------------------------------------------------------
  recruiter
    .command('inbox')
    .description('查看候选人消息')
    .option('--job <encryptJobId>', '按职位过滤')
    .option('-p, --page <n>', '页码', '1')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const page = parsePage(options.page as string);
        const params: Record<string, string | number | undefined> = {
          page,
          pageSize: 15,
        };
        if (options.job) params.encryptJobId = options.job;

        const data = await client.get<Record<string, unknown>>(
          RECRUITER_INBOX_API,
          params
        );

        if (!isJsonMode()) {
          const list = extractList(data, 'messageList');
          if (list.length === 0) {
            printInfo(chalk.yellow('收件箱为空'));
          } else {
            printInfo(chalk.gray(`第 ${page} 页，收件箱消息`));
            renderInboxTable(list);
          }
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 6. reply — 回复候选人消息
  // ----------------------------------------------------------
  recruiter
    .command('reply <friendId> <message>')
    .description('回复候选人消息')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (friendId: string, message: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const data = await client.post<Record<string, unknown>>(
          RECRUITER_CHAT_REPLY_API,
          { friendId, message }
        );

        if (!isJsonMode()) {
          printInfo(chalk.green(`消息已发送给 ${friendId}`));
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 7. chat — 查看聊天历史
  // ----------------------------------------------------------
  recruiter
    .command('chat <friendId>')
    .description('查看与候选人的聊天历史')
    .option('-p, --page <n>', '页码', '1')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (friendId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const page = parsePage(options.page as string);
        const data = await client.get<Record<string, unknown>>(
          RECRUITER_CHAT_HISTORY_API,
          { friendId, page, pageSize: 20 }
        );

        if (!isJsonMode()) {
          const messages = extractList(data, 'messageList');
          if (messages.length === 0) {
            printInfo(chalk.yellow('暂无聊天记录'));
          } else {
            renderChatHistory(messages);
          }
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 8. request-resume — 求简历
  // ----------------------------------------------------------
  recruiter
    .command('request-resume <friendId>')
    .description('向候选人求简历')
    .option('-y, --yes', '跳过确认')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (friendId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const confirmed = await requireConfirm(
          options.yes as boolean | undefined,
          `确认向 ${friendId} 请求简历？`
        );
        if (!confirmed) {
          printInfo('已取消');
          return { cancelled: true };
        }

        const data = await client.post<Record<string, unknown>>(
          RECRUITER_REQUEST_RESUME_API,
          { friendId }
        );

        if (!isJsonMode()) {
          printInfo(chalk.green(`已向 ${friendId} 请求简历`));
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 9. exchange-phone — 换电话
  // ----------------------------------------------------------
  recruiter
    .command('exchange-phone <friendId>')
    .description('向候选人请求交换电话')
    .option('-y, --yes', '跳过确认')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (friendId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const confirmed = await requireConfirm(
          options.yes as boolean | undefined,
          `确认向 ${friendId} 请求交换电话？`
        );
        if (!confirmed) {
          printInfo('已取消');
          return { cancelled: true };
        }

        const data = await client.post<Record<string, unknown>>(
          RECRUITER_EXCHANGE_PHONE_API,
          { friendId }
        );

        if (!isJsonMode()) {
          printInfo(chalk.green(`已向 ${friendId} 请求交换电话`));
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 10. exchange-wechat — 换微信
  // ----------------------------------------------------------
  recruiter
    .command('exchange-wechat <friendId>')
    .description('向候选人请求交换微信')
    .option('-y, --yes', '跳过确认')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (friendId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const confirmed = await requireConfirm(
          options.yes as boolean | undefined,
          `确认向 ${friendId} 请求交换微信？`
        );
        if (!confirmed) {
          printInfo('已取消');
          return { cancelled: true };
        }

        const data = await client.post<Record<string, unknown>>(
          RECRUITER_EXCHANGE_WECHAT_API,
          { friendId }
        );

        if (!isJsonMode()) {
          printInfo(chalk.green(`已向 ${friendId} 请求交换微信`));
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 11. invite-interview — 约面试
  // ----------------------------------------------------------
  recruiter
    .command('invite-interview <geekId>')
    .description('邀请候选人面试')
    .requiredOption('--job <encryptJobId>', '关联的职位 ID（必填）')
    .option('-y, --yes', '跳过确认')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (geekId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const confirmed = await requireConfirm(
          options.yes as boolean | undefined,
          `确认邀请候选人 ${geekId} 面试（职位: ${options.job}）？`
        );
        if (!confirmed) {
          printInfo('已取消');
          return { cancelled: true };
        }

        const data = await client.post<Record<string, unknown>>(
          RECRUITER_INVITE_INTERVIEW_API,
          { encryptGeekId: geekId, encryptJobId: options.job }
        );

        if (!isJsonMode()) {
          printInfo(chalk.green(`已向候选人 ${geekId} 发送面试邀请`));
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 12. mark-unsuitable — 不合适
  // ----------------------------------------------------------
  recruiter
    .command('mark-unsuitable <geekId>')
    .description('标记候选人为不合适')
    .requiredOption('--job <encryptJobId>', '关联的职位 ID（必填）')
    .option('-y, --yes', '跳过确认')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (geekId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const confirmed = await requireConfirm(
          options.yes as boolean | undefined,
          `确认将候选人 ${geekId} 标记为不合适？`
        );
        if (!confirmed) {
          printInfo('已取消');
          return { cancelled: true };
        }

        const data = await client.post<Record<string, unknown>>(
          RECRUITER_MARK_UNSUITABLE_API,
          { encryptGeekId: geekId, encryptJobId: options.job }
        );

        if (!isJsonMode()) {
          printInfo(chalk.yellow(`已将候选人 ${geekId} 标记为不合适`));
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 13. resume — 展示候选人简历
  // ----------------------------------------------------------
  recruiter
    .command('resume <encryptGeekId>')
    .description('在终端中展示候选人完整简历')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (encryptGeekId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const data = await client.get<Record<string, unknown>>(
          RECRUITER_RESUME_API,
          { encryptGeekId }
        );

        if (!isJsonMode()) {
          const resume = (data.zpData || data) as Record<string, unknown>;
          renderResume(resume);
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 14. resume-download — 下载简历
  // ----------------------------------------------------------
  recruiter
    .command('resume-download <encryptGeekId>')
    .description('下载候选人简历为 Markdown 文件')
    .requiredOption('--job <encryptJobId>', '关联的职位 ID（必填）')
    .option('-o, --output <path>', '输出文件路径')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (encryptGeekId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const data = await client.get<Record<string, unknown>>(
          RECRUITER_RESUME_API,
          { encryptGeekId, encryptJobId: options.job }
        );

        const resume = (data.zpData || data) as Record<string, unknown>;

        // 生成 Markdown
        const md = buildResumeMarkdown(resume, encryptGeekId);
        const outputPath = (options.output as string) || `resume_${encryptGeekId}.md`;

        fs.writeFileSync(outputPath, md, 'utf-8');

        if (!isJsonMode()) {
          printInfo(chalk.green(`简历已保存到 ${outputPath}`));
        }

        return { outputPath, encryptGeekId };
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 15. jobs — 列出发布职位
  // ----------------------------------------------------------
  recruiter
    .command('jobs')
    .description('列出已发布的职位')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const data = await client.get<Record<string, unknown>>(RECRUITER_JOB_LIST_API);

        if (!isJsonMode()) {
          const jobs = extractList(data, 'jobList');
          if (jobs.length === 0) {
            printInfo(chalk.yellow('暂无发布的职位'));
          } else {
            renderJobsTable(jobs);
          }
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 16. job-close — 关闭职位
  // ----------------------------------------------------------
  recruiter
    .command('job-close <encryptJobId>')
    .description('关闭职位')
    .option('-y, --yes', '跳过确认')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (encryptJobId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const confirmed = await requireConfirm(
          options.yes as boolean | undefined,
          `确认关闭职位 ${encryptJobId}？`
        );
        if (!confirmed) {
          printInfo('已取消');
          return { cancelled: true };
        }

        const data = await client.post<Record<string, unknown>>(
          RECRUITER_JOB_CLOSE_API,
          { encryptJobId }
        );

        if (!isJsonMode()) {
          printInfo(chalk.yellow(`职位 ${encryptJobId} 已关闭`));
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 17. job-reopen — 重新开启职位
  // ----------------------------------------------------------
  recruiter
    .command('job-reopen <encryptJobId>')
    .description('重新开启职位')
    .option('-y, --yes', '跳过确认')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (encryptJobId: string, options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const confirmed = await requireConfirm(
          options.yes as boolean | undefined,
          `确认重新开启职位 ${encryptJobId}？`
        );
        if (!confirmed) {
          printInfo('已取消');
          return { cancelled: true };
        }

        const data = await client.post<Record<string, unknown>>(
          RECRUITER_JOB_REOPEN_API,
          { encryptJobId }
        );

        if (!isJsonMode()) {
          printInfo(chalk.green(`职位 ${encryptJobId} 已重新开启`));
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 18. labels — 查看候选人标签
  // ----------------------------------------------------------
  recruiter
    .command('labels')
    .description('查看候选人标签列表')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const data = await client.get<Record<string, unknown>>(RECRUITER_LABELS_API);

        if (!isJsonMode()) {
          const labels = extractList(data, 'labelList');
          if (labels.length === 0) {
            printInfo(chalk.yellow('暂无候选人标签'));
          } else {
            printInfo(chalk.bold('候选人标签：'));
            for (const label of labels) {
              const name = (label.labelName || label.name || label) as string;
              const count = label.count !== undefined ? chalk.gray(` (${label.count})`) : '';
              process.stderr.write(`  ${chalk.cyan('•')} ${name}${count}\n`);
            }
          }
        }

        return data;
      }, { json: options.json as boolean | undefined });
    });

  // ----------------------------------------------------------
  // 19. export — 导出候选人数据
  // ----------------------------------------------------------
  recruiter
    .command('export')
    .description('导出候选人数据')
    .option('-o, --output <path>', '输出文件路径', 'candidates_export')
    .option('-f, --format <format>', '导出格式（csv/json）', 'csv')
    .option('-j, --json', 'JSON 格式输出')
    .action(async (options: Record<string, string | undefined>) => {
      await handleCommand(async () => {
        const format = (options.format as string)?.toLowerCase() === 'json' ? 'json' : 'csv';

        // 导出来源：尝试从推荐接口获取候选人数据
        let data: Record<string, unknown>;
        try {
          data = await client.get<Record<string, unknown>>(
            RECRUITER_RECOMMEND_API,
            { page: 1, pageSize: 200 }
          );
        } catch {
          // 如果推荐接口失败，尝试搜索
          data = await client.post<Record<string, unknown>>(
            RECRUITER_SEARCH_API,
            { query: '', page: 1, pageSize: 200 }
          );
        }

        const list = extractList(data, 'geekList');
        const basePath = options.output as string;
        const outputPath = format === 'json'
          ? (basePath.endsWith('.json') ? basePath : `${basePath}.json`)
          : (basePath.endsWith('.csv') ? basePath : `${basePath}.csv`);

        if (format === 'json') {
          fs.writeFileSync(outputPath, JSON.stringify(list, null, 2), 'utf-8');
        } else {
          const csv = buildCsv(list);
          fs.writeFileSync(outputPath, csv, 'utf-8');
        }

        if (!isJsonMode()) {
          printInfo(chalk.green(`已导出 ${list.length} 条候选人数据到 ${outputPath}`));
        }

        return { count: list.length, outputPath, format };
      }, { json: options.json as boolean | undefined });
    });
}

// ============================================================
// Markdown / CSV 生成
// ============================================================

/**
 * 构建简历 Markdown 文本
 */
function buildResumeMarkdown(resume: Record<string, unknown>, geekId: string): string {
  const lines: string[] = [];

  lines.push(`# 简历`);
  lines.push('');
  lines.push(`- **姓名：** ${resume.geekName || resume.name || '-'}`);
  lines.push(`- **性别：** ${resume.gender || resume.geekGender || '-'}`);
  lines.push(`- **年龄：** ${resume.age || resume.geekAge || '-'}`);
  lines.push(`- **学历：** ${resume.degreeName || resume.degree || '-'}`);
  lines.push(`- **工作经验：** ${resume.experienceName || resume.workYears || '-'}`);
  lines.push(`- **手机号：** ${resume.phone || resume.mobile || '-'}`);
  lines.push(`- **邮箱：** ${resume.email || '-'}`);
  lines.push(`- **候选人ID：** ${geekId}`);

  if (resume.expectCity || resume.expectSalary || resume.expectPosition) {
    lines.push('');
    lines.push('## 期望工作');
    lines.push(`- **期望城市：** ${resume.expectCity || '-'}`);
    lines.push(`- **期望薪资：** ${resume.expectSalary || '-'}`);
    lines.push(`- **期望职位：** ${resume.expectPosition || '-'}`);
  }

  const skills = resume.skills;
  if (Array.isArray(skills) && skills.length > 0) {
    lines.push('');
    lines.push('## 技能');
    lines.push(skills.join('、'));
  }

  const workExp = resume.workExperiences || resume.workExperienceList;
  if (Array.isArray(workExp) && workExp.length > 0) {
    lines.push('');
    lines.push('## 工作经历');
    for (const exp of workExp as Record<string, unknown>[]) {
      lines.push('');
      lines.push(`### ${exp.companyName || exp.company || '-'}`);
      lines.push(`- **职位：** ${exp.positionName || exp.position || '-'}`);
      lines.push(`- **时间：** ${exp.startDate || exp.start || '-'} ~ ${exp.endDate || exp.end || '至今'}`);
      if (exp.description || exp.desc) {
        lines.push(`- **描述：** ${exp.description || exp.desc}`);
      }
    }
  }

  const eduExp = resume.educationExperiences || resume.educationList;
  if (Array.isArray(eduExp) && eduExp.length > 0) {
    lines.push('');
    lines.push('## 教育经历');
    for (const edu of eduExp as Record<string, unknown>[]) {
      lines.push('');
      lines.push(`### ${edu.schoolName || edu.school || '-'}`);
      lines.push(`- **专业：** ${edu.majorName || edu.major || '-'}`);
      lines.push(`- **学历：** ${edu.degreeName || edu.degree || '-'}`);
      lines.push(`- **时间：** ${edu.startDate || edu.start || '-'} ~ ${edu.endDate || edu.end || '毕业'}`);
    }
  }

  const projExp = resume.projectExperiences || resume.projectList;
  if (Array.isArray(projExp) && projExp.length > 0) {
    lines.push('');
    lines.push('## 项目经历');
    for (const proj of projExp as Record<string, unknown>[]) {
      lines.push('');
      lines.push(`### ${proj.projectName || proj.name || '-'}`);
      lines.push(`- **角色：** ${proj.role || '-'}`);
      lines.push(`- **时间：** ${proj.startDate || proj.start || '-'} ~ ${proj.endDate || proj.end || '-'}`);
      if (proj.description || proj.desc) {
        lines.push(`- **描述：** ${proj.description || proj.desc}`);
      }
    }
  }

  if (resume.selfDesc || resume.personalDesc) {
    lines.push('');
    lines.push('## 自我描述');
    lines.push((resume.selfDesc || resume.personalDesc) as string);
  }

  return lines.join('\n') + '\n';
}

/**
 * 构建 CSV 文本
 */
function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  const headers = ['geekName', 'degreeName', 'experienceName', 'expectCity', 'expectSalary', 'skills', 'encryptGeekId'];
  const headerRow = headers.join(',');

  const dataRows = rows.map((row) => {
    return headers.map((h) => {
      const val = row[h];
      if (val === undefined || val === null) return '';
      const str = Array.isArray(val) ? (val as string[]).join(';') : String(val);
      // CSV escape: wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n') + '\n';
}
