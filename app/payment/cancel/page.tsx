'use client'

import { useRouter } from 'next/navigation'

export default function PaymentCancelPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">已取消支付</h1>
        <p className="text-gray-500 mb-6">您已取消本次购买，点数未发生变化。</p>
        <button
          onClick={() => router.push('/')}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors"
        >
          返回首页
        </button>
      </div>
    </main>
  )
}
