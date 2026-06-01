# Feature Specification: 登录功能重新设计

**Feature Branch**: `002-login-redesign`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "当前cli工具关于login的方式有三种，第一个直接login，我认为是直接触发登陆页面让用户登陆，第二个是qrcode，第三个是从用户的真实chorme浏览器提取cookie，当前这三种实现都有问题，需要重新设计"

## Clarifications

### Session 2026-06-01

- Q: `--browser` 参数命名冲突（同时表示"指定浏览器提取 Cookie"和"打开浏览器页面登录"），三种登录方式的命令行参数应如何设计？ → A: `boss login`（默认自动检测 Cookie）+ `boss login --qrcode`（二维码）+ `boss login --web`（打开浏览器登录页面）+ `boss login --browser <name>`（指定从哪个浏览器提取 Cookie），三种方式保持平等，不降级任何一种。
- Q: 多浏览器同时登录时的优先级策略？ → A: B - Chrome 优先，但如果其他浏览器中有更新鲜的会话（Cookie 创建时间更晚），自动选择最新会话。
- Q: 浏览器 Cookie 数据库被操作系统锁定时的处理？ → A: B - 尝试复制数据库文件到临时位置读取，如仍失败则提示用户关闭浏览器后重试。
- Q: Cookie 提取失败时是否自动回退到其他登录方式？ → A: 不自动回退，给出明确提示并列出备选方案（`--qrcode` / `--web`），由用户手动选择。
- Q: 凭证文件无法解密（密钥绑定失效）时的处理？ → A: B - 自动清理无效凭证文件，提示"本地凭证已失效（可能由于系统环境变更），请重新登录"，引导到登录流程。

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 浏览器 Cookie 自动提取登录 (Priority: P1)

作为一名 CLI 工具用户，我希望工具能够自动从我已经登录 BOSS直聘 的浏览器中提取有效的登录凭证，这样我无需额外操作即可完成身份认证。

**Why this priority**: 这是最便捷的登录方式。用户在日常工作中已经在浏览器中登录了 BOSS直聘，直接复用现有会话可以做到"零操作"登录。这也是用户首次使用 CLI 工具时的首选路径。

**Independent Test**: 可以通过在已登录 BOSS直聘 的浏览器环境中运行 `boss login` 来独立测试，成功后将显示"登录成功"并可使用需要认证的命令。

**Acceptance Scenarios**:

1. **Given** 用户已在 Chrome 浏览器中登录 BOSS直聘，**When** 运行 `boss login`，**Then** 工具自动从 Chrome 提取有效 Cookie 并完成登录，显示登录成功信息及当前用户身份。
2. **Given** 用户已在 Edge 或 Brave 浏览器中登录 BOSS直聘，**When** 运行 `boss login`，**Then** 工具自动检测并提取对应浏览器的 Cookie，完成登录。
3. **Given** 用户浏览器中未登录 BOSS直聘 或 Cookie 已过期，**When** 运行 `boss login`，**Then** 工具给出明确提示"未检测到有效登录会话"，并列出备选方案（`--qrcode` 扫码登录、`--web` 浏览器页面登录），由用户手动选择。
4. **Given** 用户指定浏览器名称（如 `boss login --browser firefox`），**When** 运行命令，**Then** 工具从指定浏览器中提取 Cookie 而非自动检测。
5. **Given** 用户浏览器 Cookie 文件存储在非默认位置，**When** 运行 `boss login --cookie-path <path>`，**Then** 工具从指定路径加载 Cookie 数据库。

---

### User Story 2 - 二维码扫码登录 (Priority: P2)

作为一名 CLI 工具用户，当我无法使用浏览器 Cookie 提取时（如远程服务器、无 GUI 环境、浏览器未登录），我希望通过终端显示二维码并使用 BOSS直聘 App 扫码来完成登录。

**Why this priority**: 二维码登录是 Cookie 提取不可用时的主要备选方案，覆盖了服务器环境、容器环境等无浏览器场景。

**Independent Test**: 可以通过运行 `boss login --qrcode` 来独立测试，终端将显示二维码，使用 BOSS直聘 App 扫码确认后即可登录。

**Acceptance Scenarios**:

1. **Given** 用户在终端中运行 `boss login --qrcode`，**When** 命令执行，**Then** 终端生成并显示清晰的二维码，用户可在 2 分钟内使用 BOSS直聘 App 扫码。
2. **Given** 二维码已生成，**When** 用户使用 App 扫描成功，**Then** 终端显示"扫描成功，请在 App 中确认登录"，随后完成登录。
3. **Given** 二维码已生成但超过 2 分钟未被扫描，**When** 超时，**Then** 工具显示"二维码已过期，请重新生成"并退出，给出明确的超时提示。
4. **Given** 用户在无图形环境的终端中运行二维码登录，**When** 二维码无法以图片形式显示，**Then** 工具在终端中以 ASCII/字符画形式渲染二维码，或提供可手动打开的 URL 链接作为备选。
5. **Given** 网络连接不稳定导致二维码轮询中断，**When** 网络恢复，**Then** 工具在超时前继续重试轮询，不会直接崩溃退出。

---

### User Story 3 - 浏览器页面登录 (Priority: P3)

作为一名 CLI 工具用户，当我既无法使用 Cookie 提取也无法使用二维码时（如未安装 App），我希望通过命令行触发系统浏览器打开 BOSS直聘 登录页面，在浏览器中完成登录后自动获取凭证。

**Why this priority**: 这是兜底方案，确保用户在任何情况下都有可用的登录路径。

**Independent Test**: 可以通过运行 `boss login --web` 来独立测试，系统浏览器将打开 BOSS直聘 登录页，用户完成登录后凭证自动返回 CLI。

**Acceptance Scenarios**:

1. **Given** 用户运行 `boss login --web`，**When** 命令执行，**Then** 系统默认浏览器打开 BOSS直聘 登录页面，并给出"请在浏览器中完成登录"的提示。
2. **Given** 用户在浏览器中完成登录，**When** 登录完成，**Then** 工具自动捕获登录结果并保存凭证，无需用户手动操作。
3. **Given** 系统无法打开浏览器（如无图形环境的服务器），**When** 运行 `boss login --web`，**Then** 工具给出明确错误提示"无法打开浏览器，请使用 --qrcode 方式登录"。

---

### User Story 4 - 登录状态持久化与自动恢复 (Priority: P1)

作为一名 CLI 工具用户，我希望登录一次后凭证能安全保存在本地，后续使用时自动恢复，不需要每次执行命令都重新登录。

**Why this priority**: 这是 CLI 工具可用性的基本要求。频繁要求用户重新登录将严重影响工作效率。

**Independent Test**: 可以通过登录后退出终端再重新打开、或重启系统后再运行需要认证的命令来测试。

**Acceptance Scenarios**:

1. **Given** 用户已成功登录，**When** 关闭终端后重新打开并运行需要认证的命令，**Then** 工具自动加载本地保存的凭证，无需用户重新登录。
2. **Given** 本地凭证已过期（超过 7 天），**When** 用户运行需要认证的命令，**Then** 工具提示"登录已过期"并自动引导用户重新登录（优先尝试浏览器 Cookie 自动提取）。
3. **Given** 用户运行 `boss logout`，**When** 命令执行，**Then** 本地凭证被安全清除，后续命令需要重新登录。
4. **Given** 本地凭证文件损坏或无法解密，**When** 工具尝试加载，**Then** 给出明确提示"本地凭证无效"并引导用户重新登录，不静默失败。

---

### Edge Cases

- 浏览器 Cookie 数据库被操作系统锁定（浏览器正在运行）时，如何处理？ → 先复制数据库到临时位置读取；如复制也失败，提示用户关闭浏览器后重试。
- 系统同时安装了多个 Chromium 内核浏览器且都已登录时，如何选择优先级？ → 默认 Chrome 优先；如其他浏览器中有更新鲜的 Cookie 会话，选择最新会话。
- 用户切换了操作系统用户或主机名后，之前加密保存的凭证如何提示和处理？ → 自动清理无效凭证，提示"凭证已失效（可能由于系统环境变更），请重新登录"。
- Cookie 提取部分成功（获取到部分 Cookie 但缺少关键认证 Cookie）时，如何处理？
- 二维码轮询过程中用户按 Ctrl+C 取消，资源是否正确清理？
- BOSS直聘 后端返回非预期响应格式时，工具如何降级处理？
- 用户在同一台机器上有多个 Chrome 配置文件（Profile），应检测哪个？

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 支持从主流 Chromium 内核浏览器（Chrome、Edge、Brave）自动提取 BOSS直聘 的登录 Cookie。
- **FR-002**: 系统 MUST 支持从 Firefox 浏览器提取 BOSS直聘 的登录 Cookie。
- **FR-003**: 系统 MUST 在 Windows、macOS、Linux 三个平台上均能正确解密浏览器 Cookie 的加密内容。
- **FR-004**: 系统 MUST 支持 Chrome 127+ 版本的 App-Bound Encryption（v20 格式）的 Cookie 解密。
- **FR-005**: 系统 MUST 在指定 `--browser` 参数时从特定浏览器提取 Cookie，未指定时自动检测已登录的浏览器；自动检测时 Chrome 优先，但选择更新鲜的 Cookie 会话。
- **FR-006**: 系统 MUST 支持通过 `--cookie-path` 参数指定自定义 Cookie 数据库路径。
- **FR-007**: 系统 MUST 支持通过二维码扫码方式完成登录，终端显示可扫描的二维码。
- **FR-008**: 系统 MUST 在二维码登录中提供超时机制，超过 2 分钟未扫描自动终止并提供明确提示。
- **FR-009**: 系统 MUST 在二维码轮询过程中支持用户通过 Ctrl+C 安全取消，并清理所有临时资源。
- **FR-010**: 系统 MUST 支持通过 `--web` 参数打开系统浏览器到 BOSS直聘 登录页面，并自动捕获登录结果。
- **FR-011**: 系统 MUST 将登录凭证加密保存到本地磁盘，加密密钥至少绑定到当前机器和用户；凭证文件无法解密时自动清理无效文件，提示用户重新登录。
- **FR-012**: 系统 MUST 在后续命令执行时自动加载并验证本地凭证的有效性。
- **FR-013**: 系统 MUST 在凭证过期时（默认 7 天）自动引导用户重新登录，优先尝试从浏览器自动提取。
- **FR-014**: 系统 MUST 在凭证过期续期时，如果原始登录方式是二维码，则恢复到二维码重新登录流程，而非静默失败。
- **FR-015**: 系统 MUST 在执行 `logout` 命令时彻底清除本地保存的凭证文件（而非保存空凭证）。
- **FR-016**: 系统 MUST 在登录成功时显示当前登录用户的基本信息（如用户身份类型），让用户确认登录结果。
- **FR-017**: 系统 MUST 在登录失败或凭证无效时提供明确、可操作的中文错误提示。
- **FR-018**: 系统 MUST 支持多 Chrome 用户配置文件（Profile）的检测，至少提示用户可指定路径。
- **FR-019**: 系统 MUST 在浏览器 Cookie 数据库被锁定时，先尝试复制数据库到临时位置读取；如复制失败则提示用户关闭浏览器后重试，而非静默失败或直接放弃。

### Key Entities

- **登录凭证 (Credential)**：包含从 BOSS直聘 获取的 Cookie 集合、登录来源标识（浏览器提取/二维码/浏览器登录）、创建时间、过期时间、加密后的持久化数据。
- **Cookie**：单个 HTTP Cookie，包含名称、值、所属域、过期时间、安全标志等属性，用于向 BOSS直聘 API 证明身份。
- **登录会话 (Login Session)**：二维码登录过程中的临时状态，包含会话 ID、随机密钥、二维码内容、扫描状态、确认状态、过期时间。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户在已登录 BOSS直聘 的浏览器环境中，运行 `boss login` 后能在 3 秒内完成自动登录。
- **SC-002**: 二维码登录流程中，终端生成二维码到可扫码状态的时间不超过 2 秒。
- **SC-003**: 90% 的浏览器 Cookie 自动提取场景能在首次尝试时成功（无需用户手动干预）。
- **SC-004**: 登录凭证在 7 天有效期内，用户执行命令时无需任何重新登录操作。
- **SC-005**: Chrome 127+（App-Bound Encryption）用户在 Windows 平台上能够成功提取 Cookie。
- **SC-006**: 登录失败时，用户能从错误信息中直接了解失败原因和下一步操作，无需查阅文档。
- **SC-007**: 三种登录方式中至少有一种在用户当前环境下可用——即在无 GUI 服务器、无浏览器、仅 CLI 的环境下也能通过二维码完成登录。

## Assumptions

- 用户拥有 BOSS直聘 账号，且可在网页端或 App 端正常登录。
- BOSS直聘 的 Cookie 有效期至少为 7 天，超过此期限需要重新认证。
- Cookie 提取仅针对用户自己本机的浏览器，不涉及远程提取或跨设备同步。
- 浏览器登录页面方式（`--web`）依赖于本地回调机制，假设用户系统允许本地端口绑定。
- QR 码登录依赖 BOSS直聘 App 的扫码功能，假设 App 端扫码接口保持稳定。
- Firefox 的 Cookie 加密机制与 Chromium 不同，可能需要独立的解密逻辑或依赖外部库。
- 用户对凭证本地加密的安全性要求为"防止明文泄露"，不需要达到硬件安全模块级别。

## Dependencies

- **外部依赖**: BOSS直聘 API（二维码生成、轮询、登录确认接口）的可用性和稳定性。
- **外部依赖**: 各浏览器的 Cookie 加密格式可能随浏览器版本升级而变化，需要持续适配。
- **外部依赖**: macOS Keychain / Linux D-Bus secret service / Windows DPAPI 等系统密钥服务的可用性。
- **内部依赖**: 凭证加密模块的功能正确性。
