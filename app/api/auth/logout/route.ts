/**
 * POST /api/auth/logout
 * 清除 session cookie，跳回首页
 */

import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response)
  return response
}
