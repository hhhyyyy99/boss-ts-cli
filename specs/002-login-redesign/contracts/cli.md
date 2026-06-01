# CLI Contracts: 登录功能重新设计

## Command: `boss login`

```text
boss login [options]

登录 BOSS直聘，获取并持久化认证凭证。

Options:
  --qrcode          使用二维码扫码登录
  --web             打开浏览器页面登录
  --browser <name>  指定从哪个浏览器提取 Cookie (chrome/edge/brave/firefox)
  --cookie-path <p> 指定 Cookie 数据库文件路径
  --profile <name>  指定浏览器用户配置文件名称 (如 "Default", "Profile 1")

默认行为:
  boss login (无参数) → 自动检测已登录的浏览器并提取 Cookie
  (Chrome 优先，但选择更新鲜的会话)

Exit Codes:
  0  登录成功
  1  登录失败（未找到有效 Cookie / 二维码超时 / 浏览器登录失败）

Output (JSON 信封):
  {
    "success": true,
    "data": {
      "message": "登录成功",
      "user": "<用户身份类型>",
      "source": "browser|qrcode|web",
      "expiresAt": "<过期时间 ISO 8601>"
    }
  }

  {
    "success": false,
    "error": {
      "code": "NO_VALID_SESSION",
      "message": "未检测到有效登录会话，请使用 --qrcode 或 --web 登录"
    }
  }
```

## Command: `boss logout`

```text
boss logout

清除本地保存的登录凭证。

Exit Codes:
  0  登出成功（即使本就没有凭证）

Output:
  {
    "success": true,
    "data": {
      "message": "已登出，本地凭证已清除"
    }
  }
```

## Command: `boss status` (existing, no change)

```text
boss status

显示当前登录状态。

Output:
  {
    "success": true,
    "data": {
      "authenticated": true,
      "source": "browser",
      "expiresAt": "<ISO 8601>",
      "remaining": "<剩余天数>"
    }
  }

  {
    "success": true,
    "data": {
      "authenticated": false
    }
  }
```
