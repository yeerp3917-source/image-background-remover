/**
 * POST /api/paypal-capture
 * 捕获（完成）PayPal 订单，充值用户点数
 *
 * Body: { orderId: string }
 * 从 session cookie 获取 userId
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/session'
import { capturePayPalOrder } from '@/lib/paypal'
import { addCredits } from '@/lib/credits'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json() as { orderId?: string }
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: '缺少 orderId' }, { status: 400 })
    }

    // 向 PayPal 捕获订单（真正扣款）
    const { planId, credits, amount } = await capturePayPalOrder(orderId)

    // 充值点数到用户账户
    await addCredits(userId, credits)

    console.log(`[paypal-capture] userId=${userId} planId=${planId} credits=${credits} amount=$${amount}`)

    return NextResponse.json({ success: true, planId, credits, amount })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[paypal-capture]', msg)
    return NextResponse.json({ error: `支付确认失败: ${msg}` }, { status: 500 })
  }
}
