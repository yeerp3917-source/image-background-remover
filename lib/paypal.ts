/**
 * PayPal API 工具函数
 * 支持 Sandbox（沙盒测试）和 Production（生产）两种环境
 */

const PAYPAL_BASE_URL =
  process.env.PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

/** 获取 PayPal Access Token（Server-side only） */
export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured')
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal auth failed: ${err}`)
  }

  const data = await res.json() as { access_token: string }
  return data.access_token
}

/** 套餐定义 */
export const PLANS = {
  starter: { credits: 10,  price: '2.99',  label: '入门包' },
  pro:     { credits: 50,  price: '12.99', label: '标准包' },
  max:     { credits: 100, price: '25.00', label: '超值包' },
} as const

export type PlanId = keyof typeof PLANS

/** 创建 PayPal Order */
export async function createPayPalOrder(planId: PlanId): Promise<{ id: string; approveUrl: string }> {
  const plan = PLANS[planId]
  if (!plan) throw new Error(`Unknown plan: ${planId}`)

  const token = await getPayPalAccessToken()

  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: planId,
          description: `图片背景移除工具 - ${plan.label}（${plan.credits}次）`,
          amount: {
            currency_code: 'USD',
            value: plan.price,
          },
        },
      ],
      application_context: {
        brand_name: '图片背景移除工具',
        locale: 'zh-CN',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Create order failed: ${err}`)
  }

  const order = await res.json() as {
    id: string
    links: Array<{ rel: string; href: string }>
  }

  const approveLink = order.links.find((l) => l.rel === 'approve')
  if (!approveLink) throw new Error('No approve URL in PayPal response')

  return { id: order.id, approveUrl: approveLink.href }
}

/** 捕获（完成）PayPal 订单 */
export async function capturePayPalOrder(orderId: string): Promise<{
  planId: PlanId
  credits: number
  amount: string
}> {
  const token = await getPayPalAccessToken()

  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Capture order failed: ${err}`)
  }

  const capture = await res.json() as {
    status: string
    purchase_units: Array<{
      reference_id: string
      payments: {
        captures: Array<{ amount: { value: string } }>
      }
    }>
  }

  if (capture.status !== 'COMPLETED') {
    throw new Error(`Order not completed: ${capture.status}`)
  }

  const unit = capture.purchase_units[0]
  const planId = unit.reference_id as PlanId
  const plan = PLANS[planId]
  const amount = unit.payments.captures[0]?.amount.value ?? '0'

  return { planId, credits: plan.credits, amount }
}
