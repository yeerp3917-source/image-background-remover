/**
 * GET /api/auth/google
 * 重定向到 Google OAuth 授权页
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const clientId   = process.env.GOOGLE_CLIENT_ID
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin

  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID 未配置' }, { status: 500 })
  }

  // 生成随机 state（防 CSRF）
  const state = crypto.randomUUID()

  // 把 state 存到 cookie（httpOnly，1 分钟有效）
  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  `${appUrl}/api/auth/callback`,
      response_type: 'code',
      scope:         'openid email profile',
      state,
      access_type:   'online',
      prompt:        'select_account',
    }).toString()
  )

  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   300, // 5 分钟
  })

  return response
}
