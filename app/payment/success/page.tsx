'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    const orderId = searchParams.get('token') // PayPal 回调带的 token 参数即 orderId

    if (!orderId) {
      setStatus('error')
      setMessage('未找到订单信息')
      return
    }

    // 捕获支付（userId 由服务端从 session cookie 读取）
    fetch('/api/paypal-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    })
      .then((r) => r.json())
      .then((data: { success?: boolean; credits?: number; error?: string }) => {
        if (data.success) {
          setCredits(data.credits ?? 0)
          setStatus('success')
          setMessage(`支付成功！已充值 ${data.credits} 次点数`)
        } else {
          setStatus('error')
          setMessage(data.error ?? '支付确认失败')
        }
      })
      .catch((e: Error) => {
        setStatus('error')
        setMessage(`网络异常: ${e.message}`)
      })
  }, [searchParams])

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-6" />
            <p className="text-gray-600 text-lg">正在确认支付...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">支付成功！</h1>
            <p className="text-gray-500 mb-4">{message}</p>
            <div className="bg-violet-50 rounded-xl p-4 mb-6">
              <p className="text-violet-700 font-semibold text-lg">+{credits} 次点数</p>
              <p className="text-violet-400 text-sm">点数永久有效</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors"
            >
              开始使用 →
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">😞</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">支付确认失败</h1>
            <p className="text-red-500 mb-6">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                返回首页
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors"
              >
                重试
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-violet-200 border-t-white rounded-full animate-spin" />
      </main>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
