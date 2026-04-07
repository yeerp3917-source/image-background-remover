/**
 * GET /api/auth/me
 * 返回当前登录用户信息
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const session = await getSession(request)

  if (!session) {
    return NextResponse.json({ loggedIn: false })
  }

  return NextResponse.json({
    loggedIn: true,
    userId:   session.sub,
    name:     session.name,
    email:    session.email,
    picture:  session.picture,
  })
}
