/**
 * 简单的会话工具
 * 生产环境用 JWT cookie；本地 dev 用内存 Map
 *
 * 注意：此为极简实现，不含 OAuth。
 * 若需接入 Google OAuth，替换 getUserFromRequest 即可。
 */

import { NextRequest } from 'next/server'

// Demo: 从 cookie 中读取 userId（部署时替换为真实 JWT 验证）
export function getUserFromRequest(request: NextRequest): string | null {
  // 读取 session cookie
  const sessionCookie = request.cookies.get('session')?.value
  if (sessionCookie) {
    try {
      // 简单 base64 解码（生产环境应换为 JWT 验证）
      const decoded = Buffer.from(sessionCookie, 'base64').toString('utf-8')
      const session = JSON.parse(decoded) as { userId?: string }
      return session.userId ?? null
    } catch {
      return null
    }
  }

  // 开发环境：从 header 读取（方便测试）
  const devUserId = request.headers.get('x-dev-user-id')
  if (devUserId && process.env.NODE_ENV === 'development') {
    return devUserId
  }

  return null
}
