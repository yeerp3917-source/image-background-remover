/**
 * POST /api/paypal-capture
 * 捕获（完成）PayPal 订单，充值用户点数
 *
 * Body: { orderId: string, userId: string }
 * Response: { success: true, credits: number, planId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { capturePayPalOrder } from '@/lib/paypal'
import { addCredits } from '@/lib/credits'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { orderId?: string; userId?: string }
    const { orderId, userId } = body

    if (!orderId) {
      return NextResponse.json({ error: '缺少 orderId' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: '缺少 userId（请先登录）' }, { status: 401 })
    }

    // 向 PayPal 捕获订单（真正扣款）
    const { planId, credits, amount } = await capturePayPalOrder(orderId)

    // 充值点数到用户账户
    await addCredits(userId, credits)

    console.log(`[paypal-capture] userId=${userId} planId=${planId} credits=${credits} amount=$${amount}`)

    return NextResponse.json({
      success: true,
      planId,
      credits,
      amount,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[paypal-capture]', msg)
    return NextResponse.json({ error: `支付确认失败: ${msg}` }, { status: 500 })
  }
}
