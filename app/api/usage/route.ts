/**
 * GET /api/usage
 * 返回当前用户的配额状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/session'
import { getUserQuota } from '@/lib/credits'

export async function GET(request: NextRequest) {
  const userId = await getUserFromRequest(request)

  if (!userId) {
    return NextResponse.json({ loggedIn: false })
  }

  const quota = await getUserQuota(userId)

  return NextResponse.json({
    loggedIn: true,
    userId,
    ...quota,
  })
}
