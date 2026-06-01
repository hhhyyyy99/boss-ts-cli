# Tasks: BOSS直聘 TypeScript CLI

**输入**: 设计文档来自 `/specs/001-boss-ts-cli/`

**前置**: plan.md（技术栈）、spec.md（用户故事）、research.md（技术决策）、data-model.md（数据模型）、contracts/cli-commands.md（CLI 合约）

**面向**: Agent 团队并行执行，每个任务独立可测试，精确到文件路径

## 格式说明: `[ID] [P?] [Story] 描述`

- **[P]**: 可并行执行（不同文件，无未完成的前置依赖）
- **[Story]**: 所属用户故事（US1-US7），Setup 和 Foundational 阶段无此标签
- 描述中包含精确的文件路径

---

## Phase 1: Setup（项目初始化）

**目标**: 初始化 TypeScript 项目，安装依赖，配置构建和测试工具

- [x] T001 初始化 TypeScript 项目：创建 package.json（name: boss-ts-cli, bin: boss → dist/index.js），配置 tsconfig.json（target: ES2022, module: ESNext, strict: true）
- [x] T002 [P] 安装核心依赖：commander, chalk, cli-table3, ora, qrcode-terminal, better-sqlite3
- [x] T003 [P] 安装开发依赖：typescript, tsup, vitest, @types/node, @types/better-sqlite3
- [x] T004 [P] 配置 tsup 构建：入口 src/index.ts → dist/index.js，格式 ESM，生成 .d.ts
- [x] T005 [P] 配置 vitest 测试：vitest.config.ts，支持 ESM 和路径别名
- [x] T006 创建目录结构：src/, src/commands/, src/types/, tests/unit/, tests/integration/

---

## Phase 2: Foundational（基础层）

**目标**: 所有用户故事依赖的核心基础设施，必须全部完成后才能开始任何用户故事

**CRITICAL**: 此阶段阻塞所有后续阶段

- [x] T007 [P] 定义所有 TypeScript 类型和接口：Credential, Cookie, Job, Application, Interview, ChatMessage, Candidate, RecruiterJob, IndexCache, SchemaEnvelope, ApiResponse 等，在 src/types/index.ts
- [x] T008 [P] 定义常量：API 基础 URL、User-Agent/Headers 模板、城市编码映射、8 种筛选条件枚举值，在 src/constants.ts
- [x] T009 [P] 实现异常类层级：BossApiError（基类）、NotAuthenticatedError、RateLimitedError、InvalidParamsError、ApiError、UnknownError，在 src/exceptions.ts
- [x] T010 [P] 实现 Schema 封装：success(data) 和 error(code, message) 工厂函数，生成 {ok, schema_version, data, error?} 格式，在 src/schema.ts
- [x] T011 [P] 实现凭证加密模块：encrypt(data, key) 和 decrypt(encrypted, key) 使用 AES-256-GCM，key 派生自机器指纹（hostname+username+machineId 的 SHA-256），在 src/crypto.ts
- [x] T012 实现 HTTP API 客户端：封装 native fetch，支持自动注入 Cookie/User-Agent Header、request/response 日志（-v 模式）、超时处理（默认 30s），在 src/client.ts
- [x] T013 在 client.ts 中添加反检测机制：每次请求添加高斯抖动延迟（random.gauss(0.3, 0.15)s）、5% 概率 2-5s 随机长暂停、HTTP 429/5xx 指数退避重试（最多 3 次）、code=9 自动冷却（10s→20s→40s→60s）、响应 Set-Cookie 合并回 session
- [x] T014 在 client.ts 中添加 HTML 重定向检测：检测响应内容是否为 HTML 登录页，若是则抛 NotAuthenticatedError
- [x] T015 实现命令共享工具：handleCommand() 包装函数（统一 try-catch + schema 封装输出）、stderr Rich Console 初始化（chalk + cli-table3）、JSON 模式检测（--json 标志或 !process.stdout.isTTY），在 src/commands/common.ts
- [x] T016 实现搜索结果序号缓存：readCache() 读取 ~/.cache/boss-cli/index.json，writeCache() 写入 keyword+filters+jobList 映射，在 src/index-cache.ts
- [x] T017 创建 CLI 入口：初始化 commander program，注册全局选项（--json, -v/--verbose, --version），导入所有命令模块，在 src/index.ts
- [x] T018 验证基础层集成：创建测试脚本 tests/integration/smoke.test.ts，验证 client 可以发送 HTTP 请求、schema 封装正确、加密/解密往返正确

**Checkpoint**: 基础层就绪 — 用户故事可以开始并行实现

---

## Phase 3: User Story 1 — 用户身份认证 (P1)

**目标**: 用户可以通过浏览器 Cookie 提取或二维码扫码完成认证，支持登录/登出/状态检查

**独立测试**: 执行 `boss login` → Cookie 加密存储 → `boss status` 显示已认证 → `boss logout` 清除凭证 → `boss status` 显示未认证

- [x] T019 [P] [US1] 实现浏览器 Cookie 定位：根据 OS 和浏览器名查找 Cookie SQLite 数据库路径（支持 Chromium 系 + Firefox），在 src/auth.ts 中新增 findCookieDb(browser) 函数
- [x] T020 [P] [US1] 实现 Chromium 系 Cookie 解密：读取 Cookies 数据库，从 OS 密钥链获取 AES 密钥（macOS security CLI / Linux libsecret / Windows DPAPI），解密 encrypted_value 字段，在 src/auth.ts 中新增 decryptChromiumCookies(profilePath) 函数
- [x] T021 [P] [US1] 实现 Firefox Cookie 解密：读取 cookies.sqlite，解析 key4.db 获取密钥，解密 Cookie，在 src/auth.ts 中新增 decryptFirefoxCookies(profilePath) 函数
- [x] T022 [US1] 实现统一 Cookie 提取入口：autoExtractCookies([cookieSource]) 自动探测可用浏览器、校验 cookieSource 白名单（chrome/firefox/edge/brave/chromium/opera/vivaldi）、调用对应解密函数、过滤 zhipin.com 域名 Cookie、验证必要字段（__zp_stoken__ 等），不支持的浏览器名给出友好提示"仅支持 Chrome/Firefox/Edge/Brave/Chromium/Opera/Vivaldi"，在 src/auth.ts
- [x] T023 [P] [US1] 实现二维码登录：调用 BOSS 直聘 QR 生成 API 获取 QR ID，使用 qrcode-terminal 在终端渲染 Unicode 二维码，轮询扫码状态（最多 120s），获取回跳 Cookie，在 src/auth.ts 中新增 qrcodeLogin() 函数
- [x] T024 [US1] 实现凭证持久化：加密保存 Cookie 到 ~/.config/boss-cli/credential.json（含 source/createdAt/expiresAt 元数据），7 天 TTL 自动检测 + 浏览器刷新，读取时校验文件格式完整性，若损坏或解密失败则删除旧文件并提示用户重新登录，在 src/auth.ts 中新增 saveCredential() / loadCredential() / refreshIfNeeded() 函数
- [x] T025 [US1] 实现认证命令：login（--cookie-source / --qrcode），logout（删除凭证文件），status（验证真实搜索 API 可用性 + 报告 search_authenticated 和 recommend_authenticated），在 src/commands/auth.ts
- [x] T026 [US1] 实现 me 命令：调用个人信息 API，展示姓名/年龄/学历/工作经验，支持 --json 输出，在 src/commands/auth.ts 中（与 login/logout/status 合并为一个文件）

**Checkpoint**: 用户故事 1 独立可测 — 登录/登出/状态检查/个人信息 全部可用

---

## Phase 4: User Story 2 — 职位搜索与浏览 (P1)

**目标**: 用户可按关键词搜索职位，支持 8 种筛选条件，翻页浏览，查看详情，快速序号导航

**独立测试**: `boss search "golang" --city 杭州 --salary 20-30K` → 返回职位列表 → `boss show 3` → 展示第 3 个职位详情 → `boss detail <securityId>` → 展示完整职位信息

- [x] T027 [P] [US2] 实现搜索 API 参数构建：将 8 种命令行筛选条件（city/salary/exp/degree/industry/scale/stage/job-type）转换为 API 请求参数，支持分页（page），在 src/commands/search.ts 中新增 buildSearchParams() 函数
- [x] T028 [US2] 实现 search 命令：调用搜索 API，Rich 表格渲染结果（职位名/公司/薪资/城市/经验/学历），同时写入 IndexCache 供 show 命令使用，支持 --json 输出，在 src/commands/search.ts
- [x] T029 [US2] 实现 show 命令：从 IndexCache 读序号→securityId 映射，调用 detail API，完整展示职位详情，在 src/commands/search.ts
- [x] T030 [US2] 实现 detail 命令：直接通过 securityId 调用职位详情 API，展示职位描述/公司信息/技能要求等完整字段，支持 --json 输出，在 src/commands/search.ts
- [x] T031 [US2] 实现 cities 命令：从 constants.ts 城市编码映射读取，表格输出所有支持的城市名称和编码，在 src/commands/search.ts
- [x] T032 [US2] 添加搜索相关错误处理：关键词无结果 → 友好提示"未找到匹配职位，请调整搜索条件"；页码超范围 → "已到达最后一页"，在 src/commands/search.ts

**Checkpoint**: 用户故事 2 独立可测 — 搜索/筛选/翻页/详情/序号导航/城市列表 全部可用

---

## Phase 5: User Story 3 — 职位推荐与导出 (P2)

**目标**: 用户可查看个性化推荐职位，浏览历史记录，导出搜索结果

**独立测试**: `boss recommend` → 推荐列表 → `boss history` → 浏览历史 → `boss export "Python" -n 50 -o jobs.csv` → 生成 CSV 文件

- [x] T033 [P] [US3] 实现 recommend 命令：调用推荐 API，支持 -p 翻页，Rich 表格渲染，支持 --json 输出，在 src/commands/search.ts
- [x] T034 [P] [US3] 实现 history 命令：调用浏览历史 API，展示最近浏览的职位列表，支持 --json 输出，在 src/commands/search.ts
- [x] T035 [US3] 实现 export 命令：循环调用搜索 API 获取指定数量（-n）的职位数据，支持 CSV（默认）和 JSON（--format json）两种输出格式，支持 -o 指定输出文件路径，在 src/commands/search.ts
- [x] T036 [US3] 实现 CSV 导出工具：将 Job 数组转为 CSV 文本（含中文字段名表头），处理字段中逗号和换行的转义，写入文件，在 src/commands/search.ts 中新增 toCsv() 函数
- [x] T037 [US3] 处理导出边界情况：导出数量为 0 → 生成仅含表头的文件 + 警告；API 中途失败 → 已获取的数据保留并提示；数量超过搜索结果总数 → 导出全部并说明

**Checkpoint**: 用户故事 3 独立可测 — 推荐/历史/导出 全部可用

---

## Phase 6: User Story 4 — 个人中心管理 (P2)

**目标**: 用户可查看已投递列表、面试邀请、沟通记录

**独立测试**: `boss applied` → 投递列表 → `boss interviews` → 面试列表 → `boss chat` → 沟通列表（me 命令已在 Phase 3 T026 中通过 src/commands/auth.ts 实现，与 Python 版本一致）

- [x] T038 [P] [US4] 实现 applied 命令：调用已投递 API，展示职位/公司/状态/时间，支持 -p 翻页和 --json 输出，在 src/commands/personal.ts
- [x] T039 [P] [US4] 实现 interviews 命令：调用面试邀请 API，展示公司/职位/时间/地点/状态，支持 --json 输出，在 src/commands/personal.ts
- [x] T040 [P] [US4] 实现 chat 命令：调用沟通列表 API，展示招聘者姓名/职位/公司/最后消息/时间，支持 --json 输出，在 src/commands/personal.ts

**Checkpoint**: 用户故事 4 独立可测 — 投递/面试/沟通 全部可用

---

## Phase 7: User Story 5 — 打招呼与批量操作 (P2)

**目标**: 用户可向招聘方打招呼，支持批量操作和干跑预览

**独立测试**: `boss greet <securityId>` → 成功 → `boss batch-greet "golang" --city 杭州 -n 5 --dry-run` → 预览列表 → `boss batch-greet "golang" --city 杭州 -n 5` → 逐个打招呼

- [x] T041 [US5] 实现 greet 命令：调用打招呼 API（传入 securityId），返回成功/失败状态，支持 --json 输出，每个请求后有 1.5s 固定延迟，在 src/commands/social.ts
- [x] T042 [US5] 实现 batch-greet 命令：先调用搜索 API 获取目标列表（支持所有搜索筛选参数），预览展示，用户确认（-y 跳过），逐个调用 greet API，实时显示进度（ora spinner），在 src/commands/social.ts
- [x] T043 [US5] 实现 --dry-run 模式：仅运行搜索+预览，不实际发送打招呼，输出将发送的目标列表和总数
- [x] T044 [US5] 实现批量操作容错：中途某个操作失败时记录错误但继续执行，最终汇总显示成功 N/总数 M，失败详情列表

**Checkpoint**: 用户故事 5 独立可测 — 单个打招呼/批量/干跑/容错 全部可用

---

## Phase 8: User Story 6 — 招聘方模式 (P3)

**目标**: 招聘方可搜索候选人、查看简历、管理职位、与候选人沟通、导出数据

**独立测试**: `boss recruiter search "golang" --city 深圳` → 候选人列表 → `boss recruiter resume <id>` → 简历 → `boss recruiter jobs` → 职位列表 → `boss recruiter inbox` → 消息列表

- [x] T045 [P] [US6] 实现 recruiter search 命令：调用招聘方搜索 API，Rich 表格渲染候选人列表（姓名/学历/经验/期望薪资/技能），支持 city/exp/degree 筛选和 -p 翻页，在 src/commands/recruiter.ts
- [x] T046 [P] [US6] 实现 recruiter recommend 命令：调用推荐 API，支持 --job 按岗位过滤和 -p 翻页，在 src/commands/recruiter.ts
- [x] T047 [P] [US6] 实现 recruiter jobs 命令：调用岗位列表 API，展示职位/城市/薪资/状态/候选人数，在 src/commands/recruiter.ts
- [x] T048 [US6] 实现 recruiter resume 命令：调用简历 API，在终端中格式化展示候选人完整简历（基本信息/期望/技能/工作经历/教育经历），在 src/commands/recruiter.ts
- [x] T049 [P] [US6] 实现 recruiter resume-download 命令：下载简历数据并保存为 Markdown 文件，在 src/commands/recruiter.ts
- [x] T050 [US6] 实现 recruiter inbox + reply + chat 命令：收件箱（支持 --job 过滤和 -p 翻页）、回复消息、查看聊天历史，在 src/commands/recruiter.ts
- [x] T051 [P] [US6] 实现 recruiter greet + batch-view 命令：向候选人打招呼、批量查看（触发"已查看"通知），在 src/commands/recruiter.ts
- [x] T052 [US6] 实现沟通页操作命令：request-resume（求简历）、exchange-phone（换电话）、exchange-wechat（换微信）、invite-interview（约面试，需 --job）、mark-unsuitable（不合适，需 --job），均在 src/commands/recruiter.ts
- [x] T053 [P] [US6] 实现职位管理命令：job-close（关闭职位）、job-reopen（重新开启），均需 --yes 确认，在 src/commands/recruiter.ts
- [x] T054 [P] [US6] 实现 recruiter labels 命令：查看候选人标签列表，在 src/commands/recruiter.ts
- [x] T055 [US6] 实现 recruiter export 命令：导出候选人数据为 CSV/JSON，支持 -o 指定路径和 --format 指定格式，复用 export 的 CSV 工具函数，在 src/commands/recruiter.ts

**Checkpoint**: 用户故事 6 独立可测 — 招聘方全部功能可用

---

## Phase 9: Polish & 跨领域优化

**目标**: 整体打磨、文档、验证

- [x] T056 [P] 实现 --version 全局标志：显示 package.json version，在 src/index.ts
- [x] T057 [P] 实现 -v/--verbose 全局标志：启用请求 URL/状态码/耗时日志输出（使用 client.ts 中已有的日志能力），在 src/commands/common.ts
- [x] T058 编写 README.md：安装说明、快速开始、命令速查表、认证说明、JSON 输出格式、故障排查
- [x] T059 验证 quickstart.md 中的所有命令流程可正常执行
- [x] T060 [P] 配置 npm publish：package.json 设置 files/engines/keywords/repository，确认 bin 入口正确，添加 .npmignore
- [x] T061 端到端集成测试：完整登录→搜索→详情→打招呼→导出流程，在 tests/integration/e2e.test.ts（需要真实 Cookie）
- [x] T062 代码质量检查：TypeScript strict 模式编译无错误，所有命令的 --help 输出正确

---

## 依赖关系 & 执行顺序

### 阶段依赖

```
Setup (Phase 1) → Foundational (Phase 2) → User Stories (Phase 3-8) → Polish (Phase 9)
```

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 — **阻塞所有用户故事**
- **User Stories (Phase 3-8)**: 全部依赖 Foundational 完成
  - US1（认证）、US2（搜索）、US4（个人中心）、US5（打招呼）可并行启动
  - US3（推荐/导出）依赖 US2（共用 search.ts）
  - US6（招聘方）可与 US1-5 并行（独立文件）
- **Polish (Phase 9)**: 依赖所有需要的用户故事完成

### 用户故事依赖

| 用户故事 | 优先级 | 依赖 | 文件 |
|----------|--------|------|------|
| US1 - 认证 | P1 | Foundational | src/auth.ts, src/commands/auth.ts |
| US2 - 搜索 | P1 | Foundational | src/commands/search.ts, src/index-cache.ts |
| US3 - 推荐/导出 | P2 | US2（共用 search.ts） | src/commands/search.ts |
| US4 - 个人中心 | P2 | Foundational | src/commands/personal.ts |
| US5 - 打招呼 | P2 | Foundational | src/commands/social.ts |
| US6 - 招聘方 | P3 | Foundational | src/commands/recruiter.ts |
| US7 - JSON 输出 | P3 | 已并入 Foundational（schema.ts + common.ts） | — |

### Phase 2 内部依赖

```
T007 (types) ──┐
T008 (constants)├── 并行 ──→ T012 (client) ──→ T013 (反检测) ──→ T014 (HTML 检测)
T009 (exceptions)┤
T010 (schema) ──┤
T011 (crypto) ──┘

T010 (schema) ──→ T015 (common) ──→ T017 (index.ts)
T016 (index-cache) ──→ 并行（独立）
```

### 并行机会

- **Phase 1**: T002, T003, T004, T005 全部可并行
- **Phase 2**: T007, T008, T009, T010, T011, T016 全部可并行；T012→T013→T014 串行；T015→T017 串行
- **Phase 3 (US1)**: T019, T020, T021, T023 可并行
- **Phase 4 (US2)**: T027 独立，随后 T028-T032 可部分并行
- **Phase 5 (US3)**: T033, T034, T036 可并行
- **Phase 6 (US4)**: T038, T039, T040 全部可并行
- **Phase 8 (US6)**: T045, T046, T047, T049, T051, T053, T054 可并行
- **跨故事并行**: US1, US2, US4, US5, US6 可同时开始（Phase 2 完成后）

---

## 并行示例

### 示例 1: Phase 2 基础层并行启动

```bash
# 同时启动所有独立的基础层任务：
Agent A: "T007 定义所有 TypeScript 类型和接口在 src/types/index.ts"
Agent B: "T008 定义常量在 src/constants.ts"
Agent C: "T009 实现异常类在 src/exceptions.ts"
Agent D: "T010 实现 Schema 封装在 src/schema.ts"
Agent E: "T011 实现凭证加密模块在 src/crypto.ts"
Agent F: "T016 实现搜索结果序号缓存在 src/index-cache.ts"

# 上述完成后，并行启动：
Agent A: "T012 实现 HTTP API 客户端在 src/client.ts"
Agent B: "T015 实现命令共享工具在 src/commands/common.ts（依赖 T010）"
```

### 示例 2: Foundational 完成后多故事并行

```bash
# Phase 2 完成后，4 个 Agent 同时启动不同故事：
Agent A: "Phase 3 US1: 实现认证模块 src/auth.ts + src/commands/auth.ts"
Agent B: "Phase 4 US2: 实现搜索模块 src/commands/search.ts"
Agent C: "Phase 6 US4: 实现个人中心 src/commands/personal.ts"
Agent D: "Phase 8 US6: 实现招聘方 src/commands/recruiter.ts"
```

---

## 实施策略

### MVP 先行（最小可用产品）

1. 完成 Phase 1: Setup → 项目可构建
2. 完成 Phase 2: Foundational → 基础层就绪（T007-T018）
3. 完成 Phase 3: US1 认证 → 用户可登录
4. 完成 Phase 4: US2 搜索 → 用户可搜索和浏览职位
5. **停止验证**: 认证 + 搜索 = 最小可用 CLI
6. 可发布 v0.1.0

### 增量交付

1. Setup + Foundational → 基础就绪
2. + US1 认证 → 可登录（v0.1.0-alpha）
3. + US2 搜索 → 可搜索浏览（v0.2.0-beta, MVP!）
4. + US3 推荐/导出 → 推荐和数据分析（v0.3.0）
5. + US4 个人中心 → 求职进度管理（v0.4.0）
6. + US5 打招呼 → 主动沟通（v0.5.0）
7. + US6 招聘方 → 双端闭环（v1.0.0）
8. + Phase 9 Polish → 正式发布

### Agent 团队并行策略

3 人团队示例：
- **全员**: Phase 1 Setup + Phase 2 Foundational 前期并行（T007-T011 + T016）
- **全员**: Phase 2 Foundational 后期串行（T012→T013→T014, T015→T017）
- **Checkpoint: Foundational 完成**
- **Agent A**: US1 认证 + US5 打招呼（顺序执行）
- **Agent B**: US2 搜索 → US3 推荐/导出（顺序执行，共用文件）
- **Agent C**: US4 个人中心 → US6 招聘方（顺序执行）
