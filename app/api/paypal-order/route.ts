/**
 * POST /api/paypal-order
 * 创建 PayPal 订单，返回 approveUrl 供前端跳转
 *
 * Body: { planId: 'starter' | 'pro' | 'max' }
 * Response: { orderId: string, approveUrl: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPayPalOrder, PLANS, PlanId } from '@/lib/paypal'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { planId?: string }
    const planId = body.planId as PlanId

    if (!planId || !(planId in PLANS)) {
      return NextResponse.json(
        { error: '无效的套餐 ID，可选：starter / pro / max' },
        { status: 400 }
      )
    }

    const { id: orderId, approveUrl } = await createPayPalOrder(planId)

    return NextResponse.json({ orderId, approveUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[paypal-order]', msg)
    return NextResponse.json({ error: `创建订单失败: ${msg}` }, { status: 500 })
  }
}
