# Feature Specification: BOSS直聘 TypeScript CLI

**Feature Branch**: `001-boss-ts-cli`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "基于https://github.com/jackwener/boss-cli.git 这个使用python实现的，我做成一个ts版本的"

## Clarifications

### Session 2026-06-01

- Q: v1 应该包含哪些招聘方功能？ → A: v1 包含全部招聘方功能，与 Python 版本完全对等（选项 C）
- Q: 本地凭证存储是否需要加密？ → A: 加密存储，使用系统密钥链或本地加密（选项 B）
- Q: v1 浏览器 Cookie 提取支持范围？ → A: v1 支持 Chromium 系浏览器（Chrome、Edge、Brave、Chromium、Opera、Vivaldi）+ Firefox，Safari 和 LibreWolf 推迟到后续版本（选项 B）
- Q: 与 Python 版本的 CLI 兼容性严格程度？ → A: 命令和参数严格兼容，允许改进错误提示、默认值和输出格式（选项 B）
- Q: YAML 输出支持策略？ → A: 仅支持 JSON 结构化输出，去掉 YAML 以简化依赖（选项 A）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 用户身份认证 (Priority: P1)

求职者或招聘方通过命令行完成身份认证，无需手动复制粘贴 Cookie。系统自动从本地浏览器提取已登录的 BOSS 直聘会话凭证，或生成终端二维码供用户扫码登录。

**Why this priority**: 认证是所有功能的前置条件，未认证时任何操作都无法完成。

**Independent Test**: 执行登录命令后，通过状态检查命令验证认证状态，确认可以访问需要登录的 API。

**Acceptance Scenarios**:

1. **Given** 用户在 Chrome 浏览器中已登录 zhipin.com，**When** 执行 `boss login`，**Then** 系统自动从 Chrome 提取 Cookie 并保存，状态检查显示已认证
2. **Given** 用户未在任何浏览器登录，**When** 执行 `boss login`，**Then** 系统自动回退到二维码登录，终端显示二维码，用户用 BOSS 直聘 APP 扫码后完成认证
3. **Given** 用户指定浏览器 `boss login --cookie-source firefox`，**When** Firefox 中有有效会话，**Then** 系统仅从 Firefox 提取 Cookie
4. **Given** 用户已认证，**When** 执行 `boss logout`，**Then** 已保存的凭证被清除，状态检查显示未认证
5. **Given** 用户已认证但 Cookie 过期（超过 7 天），**When** 执行任意需要认证的命令，**Then** 系统自动尝试从浏览器刷新 Cookie，失败时提示用户重新登录

---

### User Story 2 - 职位搜索与浏览 (Priority: P1)

求职者通过命令行按关键词搜索职位，支持城市、薪资、经验、学历、行业、公司规模、融资阶段、职位类型等筛选条件，并支持翻页查看。

**Why this priority**: 职位搜索是求职者的核心需求，也是 CLI 工具最主要的使用场景。

**Independent Test**: 搜索关键词后返回匹配的职位列表，验证各筛选条件能正确过滤结果，翻页能返回不同结果。

**Acceptance Scenarios**:

1. **Given** 用户已认证，**When** 执行 `boss search "golang"`，**Then** 返回包含关键词 "golang" 的职位列表，每条显示职位名称、公司、薪资、城市等基本信息
2. **Given** 用户已认证，**When** 执行 `boss search "Python" --city 杭州 --salary 20-30K`，**Then** 仅返回杭州地区、薪资范围 20-30K 的 Python 相关职位
3. **Given** 用户已认证，**When** 执行 `boss search "Java" --exp 3-5年 --degree 本科`，**Then** 仅返回要求 3-5 年经验、本科学历的 Java 职位
4. **Given** 用户已认证，**When** 执行 `boss search "后端" -p 2`，**Then** 返回搜索结果的第 2 页
5. **Given** 用户已认证，**When** 执行 `boss show 3`，**Then** 展示最近一次搜索结果中第 3 个职位的详细信息
6. **Given** 用户已认证，**When** 执行 `boss detail <securityId>`，**Then** 展示指定职位的完整详情（职位描述、公司信息、技能要求等）

---

### User Story 3 - 职位推荐与导出 (Priority: P2)

用户查看基于个人求职期望的个性化职位推荐，并可将搜索结果导出为 CSV 或 JSON 文件以便离线分析。

**Why this priority**: 推荐为用户发现更多机会，导出支持数据分析和记录保存。

**Independent Test**: 执行推荐命令返回个性化职位列表；执行导出命令生成包含搜索结果数据的文件。

**Acceptance Scenarios**:

1. **Given** 用户已认证且填写了求职期望，**When** 执行 `boss recommend`，**Then** 返回个性化推荐的职位列表
2. **Given** 用户已认证，**When** 执行 `boss export "Python" -n 50 -o jobs.csv`，**Then** 生成包含前 50 条 Python 职位数据的 CSV 文件
3. **Given** 用户已认证，**When** 执行 `boss export "golang" --format json -o jobs.json`，**Then** 生成 JSON 格式的导出文件

---

### User Story 4 - 个人中心管理 (Priority: P2)

求职者查看个人资料、已投递职位列表、面试邀请、沟通记录和浏览历史。

**Why this priority**: 这些是求职流程中的关键信息节点，帮助用户跟踪求职进度。

**Independent Test**: 分别执行各命令验证返回正确的个人信息和状态数据。

**Acceptance Scenarios**:

1. **Given** 用户已认证，**When** 执行 `boss me`，**Then** 展示个人信息（姓名、年龄、学历、工作经验等）（注：me 命令实现在认证模块中，与 Python 版本一致）
2. **Given** 用户已认证，**When** 执行 `boss applied`，**Then** 列出已投递的职位及投递状态
3. **Given** 用户已认证，**When** 执行 `boss interviews`，**Then** 列出收到的面试邀请
4. **Given** 用户已认证，**When** 执行 `boss chat`，**Then** 列出沟通过的招聘者列表
5. **Given** 用户已认证，**When** 执行 `boss history`，**Then** 列出最近浏览过的职位

---

### User Story 5 - 打招呼与批量操作 (Priority: P2)

求职者向招聘方发送打招呼消息，支持单个打招呼和基于搜索结果的批量打招呼，内置防检测延迟机制。

**Why this priority**: 主动沟通是求职转化的关键步骤，批量操作提升效率。

**Independent Test**: 单个打招呼返回成功/失败状态；批量预览显示目标列表而不实际发送。

**Acceptance Scenarios**:

1. **Given** 用户已认证，**When** 执行 `boss greet <securityId>`，**Then** 向指定职位对应的招聘方发送打招呼，返回结果状态
2. **Given** 用户已认证，**When** 执行 `boss batch-greet "golang" --city 杭州 -n 5`，**Then** 向杭州地区前 5 个 golang 职位批量打招呼，每次间隔至少 1.5 秒
3. **Given** 用户已认证，**When** 执行 `boss batch-greet "golang" --city 杭州 -n 5 --dry-run`，**Then** 仅预览将要打招呼的职位列表，不实际发送

---

### User Story 6 - 招聘方模式 (Priority: P3)

招聘方（雇主/HR）通过命令行管理招聘流程：搜索候选人、查看简历、管理职位、与候选人沟通。

**Why this priority**: 招聘方用户基数较小但价值极高，实现闭环的招聘管理体验。

**Independent Test**: 以招聘方身份登录后，执行搜索候选人、查看简历、职位管理等命令均返回正确数据。

**Acceptance Scenarios**:

1. **Given** 招聘方已认证，**When** 执行 `boss recruiter search "golang" --city 深圳`，**Then** 返回匹配的候选人列表
2. **Given** 招聘方已认证，**When** 执行 `boss recruiter resume <encryptGeekId>`，**Then** 在终端中展示候选人完整简历
3. **Given** 招聘方已认证，**When** 执行 `boss recruiter jobs`，**Then** 列出当前发布的招聘职位
4. **Given** 招聘方已认证，**When** 执行 `boss recruiter inbox`，**Then** 显示候选人消息列表
5. **Given** 招聘方已认证，**When** 执行 `boss recruiter greet <encryptGeekId>`，**Then** 向候选人发起沟通
6. **Given** 招聘方已认证，**When** 执行 `boss recruiter export -o candidates.csv`，**Then** 导出候选人数据为 CSV

---

### User Story 7 - 结构化 JSON 输出与 Agent 友好 (Priority: P3)

所有命令支持 `--json` 标志输出结构化 JSON 数据，采用统一的数据封装格式，Rich 格式输出发送到 stderr，使 CLI 同时适合人类阅读和程序/AI Agent 消费。

**Why this priority**: 差异化特性，让 CLI 能够作为 AI Agent 的工具使用，提升工具的可编程性。

**Independent Test**: 任意命令加 `--json` 输出合法 JSON 且包含 ok/schema_version/data 封装；管道中无 TTY 时自动输出 JSON。

**Acceptance Scenarios**:

1. **Given** 用户已认证，**When** 执行 `boss search "golang" --json`，**Then** stdout 输出格式为 `{"ok":true,"schema_version":"1","data":{...}}` 的 JSON
2. **Given** stdout 不是 TTY（如管道），**When** 执行 `boss search "golang" | jq .data`，**Then** 自动输出 JSON 格式的结构化数据，保持 schema 封装格式
3. **Given** API 调用失败，**When** 执行 `boss search "golang" --json`，**Then** 输出 `{"ok":false,"data":null,"error":{"code":"...","message":"..."}}`

---

### Edge Cases

- 当用户未登录时执行需要认证的命令，系统应给出清晰的认证引导提示
- 当浏览器 Cookie 提取失败（浏览器未安装或加密无法解密）时，自动回退到二维码登录
- 当 API 返回频率限制时，系统自动进入冷却期并指数退避重试
- 当网络超时或 HTTP 5xx 错误时，自动重试（最多 3 次）
- 当搜索关键词无结果时，返回空列表并提示用户调整搜索条件
- 当指定页码超出实际结果范围时，返回空列表
- 当导出数据量为 0 时，生成仅包含表头的文件并给出警告
- 批量打招呼时，若中途某个操作失败，继续执行剩余操作并汇总结果
- 当凭证文件损坏或格式不正确时，提示用户重新登录
- 当招聘方尝试操作不存在的职位或候选人时，返回明确的错误信息

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须支持从 Chromium 系浏览器（Chrome、Edge、Brave、Chromium、Opera、Vivaldi）及 Firefox 自动提取 BOSS 直聘会话 Cookie，Safari 和 LibreWolf 推迟到后续版本
- **FR-002**: 系统必须支持终端二维码登录，用户扫描后完成认证
- **FR-003**: 系统必须将认证凭证加密后持久化到本地文件，并支持 7 天 TTL 自动刷新
- **FR-004**: 系统必须支持按关键词搜索职位，并支持城市、薪资、经验、学历、行业、公司规模、融资阶段、职位类型共 8 种筛选条件
- **FR-005**: 系统必须支持搜索结果翻页浏览
- **FR-006**: 系统必须支持查看职位详情，包括通过搜索结果序号快速导航和通过 securityId 直接查询
- **FR-007**: 系统必须支持查看个性化职位推荐
- **FR-008**: 系统必须支持查看个人资料、已投递列表、面试邀请、沟通记录和浏览历史
- **FR-009**: 系统必须支持向招聘方发送打招呼消息，包括单条和批量操作
- **FR-010**: 批量打招呼必须在每次请求之间内置防检测延迟（至少 1.5 秒）
- **FR-011**: 系统必须支持将搜索结果导出为 CSV 和 JSON 文件
- **FR-012**: 系统必须支持招聘方模式，包括搜索候选人、查看简历、管理职位、查看候选人消息、导出候选人数据
- **FR-013**: 招聘方模式必须支持回复候选人消息、请求简历、交换电话/微信、邀请面试、标记不合适等沟通操作
- **FR-014**: 招聘方模式必须支持下载候选人简历为 Markdown 文件
- **FR-015**: 招聘方模式必须支持关闭和重新开启职位
- **FR-016**: 系统必须在 stdout 输出 JSON 结构化数据，在 stderr 输出人类可读的 Rich 格式
- **FR-017**: 结构化输出必须采用统一的封装格式：`{ok, schema_version, data, error?}`
- **FR-018**: 系统必须在非 TTY 环境下自动输出 JSON 格式（Agent 友好）
- **FR-019**: 系统必须支持 `--json` 标志显式选择 JSON 输出格式
- **FR-020**: 系统必须实现请求频率控制和反检测机制（高斯抖动延迟、随机长暂停、指数退避重试、User-Agent 伪装）
- **FR-021**: 系统必须在遇到频率限制时自动进入冷却期并延长请求间隔
- **FR-022**: 系统必须支持查看登录状态，并校验实际 API 可用性
- **FR-023**: 系统必须支持列出所有支持的城市
- **FR-024**: 系统必须支持 `--version` 显示版本号和 `-v` 详细日志模式
- **FR-025**: 系统必须支持 `--dry-run` 预览批量操作而不实际执行
- **FR-026**: 系统必须提供内置的搜索结果序号缓存，支持 `show <index>` 快速导航

### Key Entities

- **Credential（凭证）**: 用户的认证信息，包含从浏览器提取的加密存储 Cookie 数据、有效期 TTL、来源浏览器标识。凭证在本地以加密形式存储，解密密钥绑定到当前设备。
- **Job（职位）**: BOSS 直聘上的招聘职位，包含职位名称、公司信息、薪资范围、城市、经验要求、学历要求、职位描述、securityId 等
- **Application（投递记录）**: 用户的职位投递记录，包含投递职位、投递时间、状态
- **Interview（面试邀请）**: 面试邀请记录，包含面试公司、职位、时间、地点
- **Chat/Message（沟通消息）**: 用户与招聘方的沟通记录，包含对方信息、最后消息内容
- **Candidate（候选人）**: 招聘方视角的人才信息，包含个人信息、技能、工作经验、简历数据
- **RecruiterJob（招聘职位）**: 招聘方发布的职位，包含职位信息、状态（在招/关闭）、候选人数量

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户从执行登录到认证完成的平均时间不超过 30 秒（浏览器提取）或 60 秒（二维码扫码）
- **SC-002**: 单次职位搜索在正常网络条件下 5 秒内返回结果
- **SC-003**: 批量打招呼 10 个职位时，所有操作在 30 秒内完成（含内置延迟）
- **SC-004**: 导出 100 条职位数据在 10 秒内完成
- **SC-005**: 所有命令的输出格式（人类可读和结构化）与原始 Python 版本行为一致
- **SC-006**: 100% 的命令名、子命令结构、参数名和标志与 Python 版本兼容（现有脚本和 AI Agent 工作流无需修改），错误提示和输出排版允许合理改进
- **SC-007**: 系统在遇到 API 频率限制时能在 2 分钟内自动恢复并继续请求
- **SC-008**: 安装过程仅需单一命令，无需额外系统依赖（Python 运行时等）
- **SC-009**: CLI 能在 Node.js 18+ 环境下运行，通过 npm 全局安装

## Assumptions

- 目标用户为中国大陆求职者和招聘方，CLI 界面使用中文
- v1 支持 Chromium 系浏览器（Chrome、Edge、Brave、Chromium、Opera、Vivaldi）及 Firefox 的 Cookie 提取，用户需在其中一款浏览器中登录 zhipin.com 后使用
- 用户的 Node.js 版本 >= 18，支持 TypeScript 原生特性
- 网络环境能够访问 BOSS 直聘 API（zhipin.com）
- 浏览器 Cookie 提取依赖操作系统密钥链/加密存储，部分 Linux 发行版可能需要额外配置
- TypeScript 版本使用 Node.js 运行时（非 Deno/Bun），优先兼容 Node.js LTS
- 原始 Python 版本的命令行接口（参数名、标志、子命令结构）作为兼容性基准，保持一致
- 浏览器 Cookie 提取在 TypeScript 中通过调用系统级工具或使用现有库实现
- 二维码终端渲染使用 Unicode 字符，要求终端支持 UTF-8
- 凭证文件默认存储在 XDG 兼容路径（Linux: `~/.config/boss-cli/`）
- v1 版本实现求职者侧和招聘方侧全部功能，与 Python 版本功能对等
- 不实现实时聊天消息发送（需要 MQTT/Protobuf，原始 Python 版本也有限制）
- 不实现简历编辑功能
- 不实现公司搜索页面解析
