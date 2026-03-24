# 图片背景移除工具

基于 Cloudflare Workers + Remove.bg API 的在线图片背景移除服务。

## 功能特点

- ✅ 纯内存处理，不存储任何图片
- ✅ 支持拖拽上传
- ✅ 实时预览对比
- ✅ 一键下载处理结果
- ✅ 完全免费部署（Cloudflare Workers 免费额度）

## 部署步骤

### 1. 获取 Remove.bg API Key

1. 访问 https://www.remove.bg/api
2. 注册账号并获取 API Key
3. 免费账号每月 50 次调用额度

### 2. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 3. 登录 Cloudflare

```bash
wrangler login
```

### 4. 配置环境变量

```bash
wrangler secret put REMOVE_BG_API_KEY
# 输入你的 Remove.bg API Key
```

### 5. 部署到 Cloudflare

```bash
wrangler deploy
```

部署成功后会得到一个 `*.workers.dev` 域名。

## 本地测试

```bash
# 设置本地环境变量
export REMOVE_BG_API_KEY="your_api_key_here"

# 启动本地开发服务器
wrangler dev
```

访问 http://localhost:8787

## 自定义域名（可选）

在 Cloudflare Dashboard 中可以绑定自己的域名。

## 文件说明

- `worker.js` - Cloudflare Worker 主文件（包含前端 HTML）
- `wrangler.toml` - Wrangler 配置文件
- `index.html` - 独立前端文件（可选，用于本地测试）

## 成本说明

- Cloudflare Workers: 免费额度 100,000 请求/天
- Remove.bg API: 免费 50 次/月，付费套餐 $0.20/张起

## 技术栈

- Cloudflare Workers (边缘计算)
- Remove.bg API (AI 背景移除)
- 原生 JavaScript (无框架依赖)
