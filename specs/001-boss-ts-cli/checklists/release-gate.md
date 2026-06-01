# 发布门禁检查清单: BOSS直聘 TypeScript CLI

**目的**: v1.0 正式发布前的需求质量最终验证 — 检查规格文档中所有需求是否完整、清晰、一致、可测量
**创建**: 2026-06-01
**特性**: [spec.md](../spec.md)
**深度**: 严格（发布门禁级别）

---

## 1. 功能需求完整性 (Functional Requirement Completeness)

- [ ] CHK001 - 认证模块：浏览器 Cookie 提取失败时的回退策略是否覆盖了所有浏览器类型（含 Firefox v1 暂不支持的情况）？[Completeness, Spec §FR-001]
- [ ] CHK002 - 认证模块：二维码登录的超时时间（120s）是否作为可配置项定义，还是硬编码？[Completeness, Spec §FR-002]
- [ ] CHK003 - 认证模块：凭证 TTL（7天）的过期时间是否考虑了用户跨时区使用场景？[Completeness, Spec §FR-003]
- [ ] CHK004 - 搜索模块：8 种筛选条件之间的组合逻辑（AND/OR）是否有明确定义？[Completeness, Spec §FR-004]
- [ ] CHK005 - 搜索模块：筛选条件值（如城市名、薪资范围）的校验规则是否在需求中定义，还是依赖后端返回错误？[Completeness, Spec §FR-004]
- [ ] CHK006 - 推荐模块：`--job` 参数指定的岗位 ID 不存在时，需求是否定义了预期行为？[Gap, Spec §FR-007]
- [ ] CHK007 - 导出模块：CSV 导出时中文编码（UTF-8 BOM）是否在需求中明确？[Completeness, Spec §FR-011]
- [ ] CHK008 - 招聘方模块：简历下载为 Markdown 时，图片/附件等非文本内容的处理方式是否定义？[Gap, Spec §FR-014]
- [ ] CHK009 - 招聘方模块：`--yes` 标志跳过确认的破坏性操作（关闭职位、标记不合适），是否定义了"哪些操作算破坏性"的明确边界？[Completeness, Spec §FR-013/FR-015]
- [ ] CHK010 - 输出模块：`--json` 和 Rich 输出之间的切换逻辑在嵌套子命令（如 `boss recruiter search --json`）中是否一致定义？[Completeness, Spec §FR-016/FR-019]

## 2. 需求清晰度 (Requirement Clarity)

- [ ] CHK011 - "Rich 格式输出"是否被精确定义（具体包含哪些元素：颜色、表格、spinner、进度条）？[Clarity, Spec §FR-016]
- [ ] CHK012 - "反检测机制"中的"User-Agent 伪装"是否明确了具体伪装策略（固定 UA vs 轮换 UA）？[Clarity, Spec §FR-020]
- [ ] CHK013 - "随机长暂停"的 2-5s 范围和 5% 概率是否充分说明了设计意图（模拟人类阅读行为）？[Clarity, Spec §FR-020]
- [ ] CHK014 - "自动冷却期"的阶梯时间（10s→20s→40s→60s）——冷却阶梯的恢复条件（连续成功多少次才降级）是否明确？[Clarity, Spec §FR-021]
- [ ] CHK015 - "个性化推荐"的"个性化"是基于哪些用户画像数据（求职期望、浏览历史、投递记录），需求中是否澄清？[Ambiguity, Spec §FR-007]
- [ ] CHK016 - "打招呼"的默认消息内容是否在需求中定义，还是留空由用户通过其他方式指定？[Gap, Spec §FR-009]
- [ ] CHK017 - `show <index>` 中的"最近一次搜索结果"——如果用户重新搜索，旧缓存的保留策略是否定义？[Clarity, Spec §FR-026]

## 3. 需求一致性 (Requirement Consistency)

- [ ] CHK018 - FR-001 列出了 7 种 v1 支持浏览器 + 1 种延期（Firefox），但 spec 假设中写道"支持 Chromium 系 + Firefox"——这些声明是否自洽？[Consistency, Spec §FR-001 vs Assumptions]
- [ ] CHK019 - FR-001 明确 Safari 推迟到后续版本，但 User Story 1 验收场景中未提及 `--cookie-source safari` 被拒绝时的预期错误提示。[Consistency, Spec §FR-001 vs US1]
- [ ] CHK020 - SC-005 要求"与 Python 版本输出格式一致"，SC-006 允许"错误提示合理改进"——这两个标准在 JSON 输出行为差异上是否存在潜在冲突？[Conflict, Spec §SC-005 vs SC-006]
- [ ] CHK021 - FR-016 要求 stderr 输出 Rich 格式，但 User Story 7 验收场景 2 描述了管道场景（stdout → jq），此时 Rich 格式不输出——是否正确记录了 TTY 检测逻辑？[Consistency, Spec §FR-016 vs US7]
- [ ] CHK022 - Key Entities 中定义了 CandidateExport，但 FR-011（导出）仅提到"搜索结果导出"，FR-012 提到了"导出候选人数据"——两个导出实体是否应统一？[Consistency, Spec §FR-011 vs FR-012]

## 4. 验收标准可测量性 (Acceptance Criteria Measurability)

- [ ] CHK023 - SC-001 浏览器提取"30 秒内"——该指标是否包含了 Cookie 数据库被锁定时重试的时间？如果没有，是否需要补充说明？[Measurability, Spec §SC-001]
- [ ] CHK024 - SC-002 "5 秒内返回结果"——是否定义了"正常网络条件"的具体参数（带宽、延迟、丢包率）？[Measurability, Spec §SC-002]
- [ ] CHK025 - SC-003 批量打招呼"30 秒内完成 10 个"——是否包含了网络重试和 API 冷却的时间？[Measurability, Spec §SC-003]
- [ ] CHK026 - SC-006 "100% 命令行兼容"——是否定义了哪些差异不算"不兼容"（如错误消息措辞、默认值变化）？[Measurability, Spec §SC-006]
- [ ] CHK027 - SC-007 "2 分钟内自动恢复"——"恢复"的精确定义是什么（成功返回数据 vs 冷却期结束可发送新请求）？[Measurability, Spec §SC-007]
- [ ] CHK028 - 所有成功标准是否都配备了独立的验证方法（手动测试流程 or 自动化基准测试脚本），还是依赖主观判断？[Gap]

## 5. 场景覆盖 (Scenario Coverage)

- [ ] CHK029 - 主流程：用户首次使用（未安装任何浏览器）→ QR 码登录 → 搜索 → 打招呼 的完整路径是否有端到端需求覆盖？[Coverage, Primary Flow]
- [ ] CHK030 - 替代流程：用户已安装多个浏览器 → 指定 `--cookie-source edge` → 从 Edge 提取 → 状态验证 的需求是否完整？[Coverage, Alternate Flow]
- [ ] CHK031 - 异常流程：API 返回非 JSON 响应（如 HTML 反爬页面、502 错误页、Cloudflare 验证页）——需求中是否有分类处理策略？[Coverage, Exception Flow, Spec §Edge Cases]
- [ ] CHK032 - 恢复流程：凭证文件被手动删除后用户执行 `boss search` —— 是否需要重新认证的引导流程是否有明确定义？[Coverage, Recovery Flow]
- [ ] CHK033 - 并发场景：两个终端同时执行 `boss login` 是否可能导致凭证文件竞争写入？需求中是否考虑了这一点？[Coverage, Concurrency]
- [ ] CHK034 - 空状态：新注册用户（无投递、无面试、无沟通记录）执行 `applied`/`interviews`/`chat` —— "暂无数据"提示的文案和格式是否在需求中定义？[Coverage, Empty State]

## 6. 边界情况覆盖 (Edge Case Coverage)

- [ ] CHK035 - 搜索关键词包含特殊字符（如 `C++`、`C#`、`Node.js`）时，URL 编码和参数传递的需求是否明确？[Edge Case, Spec §FR-004]
- [ ] CHK036 - 导出文件路径 `-o` 参数传入已存在的文件时，是覆盖、追加还是报错——需求是否定义？[Edge Case, Spec §FR-011]
- [ ] CHK037 - 导出数量 `-n` 传入极大值（如 999999）时，是否有上限控制还是依赖 API 自然截断？[Edge Case, Spec §FR-011]
- [ ] CHK038 - 批量打招呼 `-n 0` 时的行为是否定义（直接报错 vs 等同于 dry-run）？[Edge Case, Spec §FR-009]
- [ ] CHK039 - `show <index>` 传入 0 或负数时的行为是否定义？[Edge Case, Spec §FR-006]
- [ ] CHK040 - 终端宽度不足以显示完整表格时，是否有换行/截断策略定义？[Edge Case, Spec §FR-016]

## 7. 非功能需求 (Non-Functional Requirements)

- [ ] CHK041 - 性能：搜索 5s 目标是否覆盖了包含 8 个筛选条件的最坏情况？是否需要区分简单搜索和复杂搜索的目标？[NFR, Spec §SC-002]
- [ ] CHK042 - 安全性：凭证加密密钥的存储位置（内存中 vs OS 密钥链）是否有安全需求定义，还是仅依赖于实现选择？[NFR, Security, Spec §FR-003]
- [ ] CHK043 - 安全性：`--json` 输出中是否明确排除了敏感字段（如 Cookie 值），是否有隐私需求？[NFR, Privacy, Spec §FR-017]
- [ ] CHK044 - 可靠性：自动重试 3 次 + 指数退避的策略是否考虑了请求幂等性（如重复打招呼的风险）？[NFR, Reliability, Spec §FR-020]
- [ ] CHK045 - 可观测性：`-v` 详细日志的内容格式和级别（INFO/WARN/ERROR）是否有需求定义？[NFR, Observability, Spec §FR-024]
- [ ] CHK046 - 兼容性：Node.js ">= 18" 的具体小版本要求（18.0 vs 18.19 LTS）是否有明确，因为 native fetch 在 18.0 是实验性的？[NFR, Compatibility]

## 8. 依赖与假设验证 (Dependencies & Assumptions)

- [ ] CHK047 - "用户已在支持的浏览器中登录 zhipin.com"——如果用户登录了但 Cookie 不完整（缺少 `__zp_stoken__`），需求是否区分了"已登录但 Cookie 无效"和"未登录"？[Assumption, Spec §Assumptions]
- [ ] CHK048 - "网络环境能够访问 zhipin.com"——如果用户在企业代理/VPN 环境下，是否有代理配置需求？[Assumption, Spec §Assumptions]
- [ ] CHK049 - "浏览器 Cookie 提取通过调用系统级工具实现"——是否明确了哪些系统级工具是必需的（macOS security CLI、Linux libsecret），以及缺失时的影响？[Dependency, Spec §Assumptions]
- [ ] CHK050 - "凭证文件存储在 XDG 兼容路径"——Windows 平台的等效路径（%APPDATA% vs %LOCALAPPDATA%）是否在需求中明确？[Dependency, Spec §Assumptions]
- [ ] CHK051 - "不实现实时聊天消息发送（需要 MQTT/Protobuf）"——用户执行 `boss chat` 时，对于只读聊天历史的限制是否在需求中清楚说明？[Assumption, Spec §Assumptions]

## 9. 可追溯性 (Traceability)

- [ ] CHK052 - 每个功能需求（FR-001 到 FR-026）是否都能映射到至少一个用户故事和验收场景？[Traceability]
- [ ] CHK053 - 每个成功标准（SC-001 到 SC-009）是否有明确的验证方法记录（手动检查清单项 vs 自动化测试）？[Traceability]
- [ ] CHK054 - 边界情况列表中的每一条是否都能追溯到对应的功能需求或用户故事？[Traceability, Spec §Edge Cases]
- [ ] CHK055 - 数据模型中的 7 个实体是否全部在功能需求中被引用，无孤立实体？[Traceability, Spec §Key Entities vs FR]

## 10. 文档与合约完整性 (Documentation & Contract Completeness)

- [ ] CHK056 - CLI 命令合约（contracts/cli-commands.md）是否覆盖了 tasks.md 中所有 36 个命令？[Contracts]
- [ ] CHK057 - CLI 合约中的错误码（not_authenticated/rate_limited/invalid_params/api_error/unknown_error）是否与实际代码中的异常类一一映射？[Contracts]
- [ ] CHK058 - quickstart.md 中的示例命令是否与 CLI 合约中的参数定义一致（无不存在的参数或拼写错误）？[Documentation]

---

## 备注

- 总计 58 条检查项，覆盖 10 个需求质量维度
- 标记 `[x]` 表示该项已通过审查
- 未通过项需在发布前修复对应规格文档，或在下方记录豁免理由
- 建议将此清单作为 v1.0 发布前的最终质量门禁

### 豁免记录

| 检查项 | 豁免理由 | 批准日期 |
|--------|----------|----------|
| (无) | — | — |
