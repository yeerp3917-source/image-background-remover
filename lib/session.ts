/**
 * 会话工具 —— 基于签名 JWT cookie
 * 兼容 Cloudflare Workers / Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server'
import { signJWT, verifyJWT, type SessionPayload } from './jwt'

const COOKIE_NAME = 'session'
const JWT_SECRET  = process.env.JWT_SECRET ?? 'dev-secret-please-change-in-production'

/** 从请求中读取并验证 session；返回 payload 或 null */
export async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyJWT(token, JWT_SECRET)
}

/** 从请求中获取 userId（快捷方式） */
export async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const session = await getSession(request)
  return session?.sub ?? null
}

/** 将 session 写入 cookie（Set-Cookie header） */
export async function setSessionCookie(
  response: NextResponse,
  payload: Omit<SessionPayload, 'iat' | 'exp'>
): Promise<void> {
  const token = await signJWT(payload, JWT_SECRET)
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 60 * 24 * 30, // 30 天
  })
}

/** 清除 session cookie */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   0,
  })
}
