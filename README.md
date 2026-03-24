# Image Background Remover

基于 Next.js + Tailwind CSS + Remove.bg API 的在线图片背景移除工具。

## 功能特点

- ✅ 点击或拖拽上传图片（JPG/PNG，最大 10MB）
- ✅ 调用 Remove.bg API 自动去除背景
- ✅ 左右对比预览（原图 vs 处理后）
- ✅ 一键下载 PNG 格式
- ✅ 纯内存处理，不存储图片
- ✅ 响应式设计，支持移动端

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入你的 Remove.bg API Key：
```
REMOVE_BG_API_KEY=your_api_key_here
```

> 获取 API Key：https://www.remove.bg/api（免费 50 次/月）

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 部署

### Vercel（推荐）

```bash
npx vercel
```

在 Vercel 控制台添加环境变量 `REMOVE_BG_API_KEY`。

### Cloudflare Pages

```bash
npm run build
```

上传 `.next` 目录到 Cloudflare Pages，并配置环境变量。

## 技术栈

- **框架**：Next.js 15 (App Router)
- **样式**：Tailwind CSS
- **API**：Remove.bg
- **语言**：TypeScript
