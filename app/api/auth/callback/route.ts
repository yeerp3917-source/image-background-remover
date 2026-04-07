/**
 * GET /api/auth/callback
 * Google OAuth 回调：用 code 换 token，写 session cookie，跳回首页
 */

import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/session'

interface GoogleTokenResponse {
  access_token: string
  id_token: string
  error?: string
}

interface GoogleUserInfo {
  sub:     string
  name:    string
  email:   string
  picture: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin

  // 用户取消授权
  if (error) {
    return NextResponse.redirect(`${appUrl}/?auth=cancelled`)
  }

  // 缺少必要参数
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/?auth=error&reason=missing_params`)
  }

  // 验证 state（防 CSRF）
  const savedState = request.cookies.get('oauth_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${appUrl}/?auth=error&reason=state_mismatch`)
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/?auth=error&reason=server_config`)
  }

  try {
    // 1. 用 code 换 access_token + id_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  `${appUrl}/api/auth/callback`,
        grant_type:    'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json() as GoogleTokenResponse
    if (!tokenRes.ok || tokenData.error) {
      console.error('[auth/callback] token exchange failed:', tokenData)
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=token_exchange`)
    }

    // 2. 用 access_token 获取用户信息
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!userRes.ok) {
      return NextResponse.redirect(`${appUrl}/?auth=error&reason=userinfo`)
    }

    const user = await userRes.json() as GoogleUserInfo

    // 3. 写 session cookie，跳回首页
    const response = NextResponse.redirect(`${appUrl}/?auth=success`)

    await setSessionCookie(response, {
      sub:     user.sub,
      name:    user.name,
      email:   user.email,
      picture: user.picture,
    })

    // 清除 oauth_state cookie
    response.cookies.set('oauth_state', '', { maxAge: 0, path: '/' })

    return response
  } catch (err: unknown) {
    console.error('[auth/callback] unexpected error:', err)
    return NextResponse.redirect(`${appUrl}/?auth=error&reason=unexpected`)
  }
}
