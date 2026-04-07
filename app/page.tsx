'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type State = 'idle' | 'loading' | 'done' | 'error'

interface UserInfo {
  loggedIn: boolean
  userId?: string
  name?: string
  email?: string
  picture?: string
}

interface QuotaInfo {
  loggedIn: boolean
  credits?: number
  freeLeft?: number
  dailyLimit?: number
  canProcess?: boolean
}

const PLANS = [
  { id: 'starter', label: '入门包', credits: 10,  price: '$2.99',  unit: '$0.30/次' },
  { id: 'pro',     label: '标准包', credits: 50,  price: '$12.99', unit: '$0.26/次', best: true },
  { id: 'max',     label: '超值包', credits: 100, price: '$25.00', unit: '$0.25/次' },
]

function HomeContent() {
  const searchParams = useSearchParams()

  const [state, setState] = useState<State>('idle')
  const [originalUrl, setOriginalUrl] = useState('')
  const [resultUrl, setResultUrl]     = useState('')
  const [resultBlob, setResultBlob]   = useState<Blob | null>(null)
  const [errorMsg, setErrorMsg]       = useState('')
  const [isDragging, setIsDragging]   = useState(false)

  const [user, setUser]   = useState<UserInfo>({ loggedIn: false })
  const [quota, setQuota] = useState<QuotaInfo>({ loggedIn: false })
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  const [showPurchase, setShowPurchase] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [purchasing, setPurchasing]     = useState(false)

  const originalUrlRef = useRef('')
  const resultUrlRef   = useRef('')

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // 加载用户信息 + 配额
  const loadUser = useCallback(async () => {
    try {
      const [meRes, usageRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/usage'),
      ])
      const me    = await meRes.json()    as UserInfo
      const usage = await usageRes.json() as QuotaInfo
      setUser(me)
      setQuota(usage)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  // 处理 OAuth 回调参数
  useEffect(() => {
    const auth = searchParams.get('auth')
    if (auth === 'success') {
      showToast('登录成功！', 'success')
      loadUser()
      window.history.replaceState({}, '', '/')
    } else if (auth === 'cancelled') {
      showToast('已取消登录', 'info')
      window.history.replaceState({}, '', '/')
    } else if (auth === 'error') {
      showToast('登录失败，请重试', 'error')
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams, showToast, loadUser])

  const revokeUrls = () => {
    if (originalUrlRef.current) { URL.revokeObjectURL(originalUrlRef.current); originalUrlRef.current = '' }
    if (resultUrlRef.current)   { URL.revokeObjectURL(resultUrlRef.current);   resultUrlRef.current   = '' }
  }

  const processImage = useCallback(async (file: File) => {
    if (!user.loggedIn) { showToast('请先登录后使用', 'error'); return }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!/^image\/(jpeg|png)$/.test(file.type) && !['jpg', 'jpeg', 'png'].includes(ext)) {
      setErrorMsg('仅支持 JPG、PNG 格式'); setState('error'); return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('文件大小不能超过 10MB'); setState('error'); return
    }

    revokeUrls()
    setOriginalUrl('')
    setState('loading')
    setErrorMsg('')

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/remove-bg', { method: 'POST', body: formData })
      const contentType = res.headers.get('content-type') ?? ''

      if (res.status === 401) {
        setErrorMsg('请先登录后使用'); setState('error'); return
      }
      if (res.status === 429) {
        const data = await res.json() as { error?: string }
        setErrorMsg(data.error ?? '次数已用完'); setState('error')
        setShowPurchase(true); return
      }
      if (!res.ok || !contentType.includes('image')) {
        let errMsg = '处理失败'
        try { const d = await res.json() as { error?: string }; errMsg = d.error || errMsg } catch { errMsg = `处理失败 (HTTP ${res.status})` }
        throw new Error(errMsg)
      }

      const blob = await res.blob()
      if (blob.size === 0) throw new Error('返回图片为空，请重试')

      const origUrl   = URL.createObjectURL(file)
      const resultObj = URL.createObjectURL(blob)
      originalUrlRef.current = origUrl
      resultUrlRef.current   = resultObj

      setOriginalUrl(origUrl)
      setResultBlob(blob)
      setResultUrl(resultObj)
      setState('done')
      showToast('处理成功！', 'success')
      loadUser()
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '未知错误')
      setState('error')
    }
  }, [user.loggedIn, showToast, loadUser])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processImage(file)
  }

  const handleDownload = () => {
    if (!resultBlob) return
    const a = document.createElement('a')
    const url = URL.createObjectURL(resultBlob)
    a.href = url; a.download = 'no-background.png'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleReset = () => {
    revokeUrls(); setState('idle')
    setOriginalUrl(''); setResultUrl(''); setResultBlob(null); setErrorMsg('')
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser({ loggedIn: false })
    setQuota({ loggedIn: false })
    showToast('已退出登录', 'info')
  }

  // ── 购买流程 ─────────────────────────────────────────────
  const handlePurchase = async () => {
    if (!selectedPlan || purchasing) return
    if (!user.loggedIn) { showToast('请先登录后购买', 'error'); return }
    setPurchasing(true)
    try {
      const res  = await fetch('/api/paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan }),
      })
      const data = await res.json() as { approveUrl?: string; error?: string }
      if (data.approveUrl) {
        window.location.href = data.approveUrl
      } else {
        showToast(data.error ?? '创建订单失败，请重试', 'error')
        setPurchasing(false)
      }
    } catch {
      showToast('网络异常，请重试', 'error')
      setPurchasing(false)
    }
  }

  // ── 配额徽章 ─────────────────────────────────────────────
  const renderQuotaBadge = () => {
    if (!quota.loggedIn) return null
    const freeLeft = quota.freeLeft ?? 0
    const credits  = quota.credits  ?? 0
    if (freeLeft > 0) return (
      <span className="text-xs bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
        今日免费剩余 {freeLeft} 次
      </span>
    )
    if (credits > 0) return (
      <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full cursor-pointer"
        onClick={() => setShowPurchase(true)}>
        点数 {credits} 次
      </span>
    )
    return (
      <span className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full cursor-pointer"
        onClick={() => setShowPurchase(true)}>
        次数已用完 · 点击购买
      </span>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-800 flex flex-col items-center justify-center p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">🎨 图片背景移除工具</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {renderQuotaBadge()}
          {user.loggedIn ? (
            <>
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {user.picture && <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-white/50" />}
                <span className="text-white/90 text-sm">{user.name}</span>
              </div>
              <button onClick={() => setShowPurchase(true)}
                className="text-sm bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-colors">
                💳 购买点数
              </button>
              <button onClick={handleLogout}
                className="text-sm bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1.5 rounded-full transition-colors">
                退出
              </button>
            </>
          ) : (
            <a href="/api/auth/google"
              className="flex items-center gap-2 bg-white text-gray-700 font-semibold text-sm px-4 py-2 rounded-full shadow hover:shadow-md transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 登录
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8">
        <div className="text-center mb-6">
          <p className="text-violet-500 text-lg">上传图片，一键去除背景</p>
          {!user.loggedIn && (
            <p className="text-sm text-gray-400 mt-1">请先登录后使用，每天免费 3 次</p>
          )}
        </div>

        {/* 上传区域 */}
        {(state === 'idle' || state === 'error') && (
          <>
            <label
              className={`flex flex-col items-center justify-center border-4 border-dashed rounded-xl p-16 cursor-pointer transition-all
                ${!user.loggedIn ? 'opacity-60 cursor-not-allowed border-gray-200 bg-gray-50' :
                  isDragging ? 'border-violet-500 bg-violet-50' : 'border-violet-300 bg-gray-50 hover:border-violet-500 hover:bg-violet-50'}`}
              onDragOver={(e) => { if (!user.loggedIn) return; e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { if (!user.loggedIn) return; handleDrop(e) }}
              onClick={(e) => { if (!user.loggedIn) { e.preventDefault(); showToast('请先登录后使用', 'error') } }}
            >
              <span className="text-6xl mb-4">{user.loggedIn ? '📸' : '🔒'}</span>
              <span className="text-xl font-semibold text-gray-700 mb-1">
                {user.loggedIn ? '点击或拖拽图片到这里' : '登录后使用'}
              </span>
              <span className="text-sm text-gray-400">支持 JPG、PNG 格式，最大 10MB</span>
              <input type="file" accept="image/jpeg,image/jpg,image/png" className="hidden"
                onChange={handleFileInput} disabled={!user.loggedIn} />
            </label>
            {state === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center">
                ⚠️ {errorMsg}
                {(errorMsg.includes('次数') || errorMsg.includes('用完')) && (
                  <button onClick={() => setShowPurchase(true)} className="ml-3 underline text-violet-600">立即购买</button>
                )}
              </div>
            )}
          </>
        )}

        {/* 加载中 */}
        {state === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-6" />
            <p className="text-gray-600 text-lg font-medium">正在处理图片，请稍候...</p>
            <p className="text-gray-400 text-sm mt-2">通常需要 3-10 秒</p>
          </div>
        )}

        {/* 结果对比 */}
        {state === 'done' && (
          <>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">原图</p>
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={originalUrl} alt="原图" className="w-full object-contain max-h-64" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">去除背景后</p>
                <div className="rounded-xl overflow-hidden border border-gray-200"
                  style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 20px 20px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resultUrl} alt="处理结果" className="w-full object-contain max-h-64" />
                </div>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <button onClick={handleDownload}
                className="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors">
                ⬇️ 下载图片
              </button>
              <button onClick={handleReset}
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
                重新上传
              </button>
            </div>
          </>
        )}
      </div>

      {/* 底部说明 */}
      <div className="mt-6 text-violet-200 text-sm text-center space-y-1">
        <p>✅ 图片仅在内存中处理，不会被存储</p>
        <p>🔒 安全加密传输，保护您的隐私</p>
      </div>

      {/* ── 购买弹窗 ─────────────────────────────────────────── */}
      {showPurchase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPurchase(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-2xl font-bold text-gray-800">💳 购买点数</h2>
              <button onClick={() => setShowPurchase(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
            </div>
            <p className="text-gray-400 text-sm mb-6">点数永久有效，每次处理消耗 1 点</p>

            {!user.loggedIn ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">请先登录后购买</p>
                <a href="/api/auth/google"
                  className="inline-flex items-center gap-2 bg-violet-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors">
                  使用 Google 登录
                </a>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {PLANS.map((plan) => (
                    <div key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative border-2 rounded-xl p-4 text-center cursor-pointer transition-all
                        ${selectedPlan === plan.id ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-300'}`}>
                      {plan.best && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                          最划算
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mb-1">{plan.label}</p>
                      <p className="text-2xl font-bold text-gray-800">{plan.credits}<span className="text-xs font-normal text-gray-400"> 次</span></p>
                      <p className="text-violet-600 font-semibold mt-1">{plan.price}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{plan.unit}</p>
                    </div>
                  ))}
                </div>
                <button
                  disabled={!selectedPlan || purchasing}
                  onClick={handlePurchase}
                  className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors">
                  {purchasing ? '正在跳转 PayPal...' : selectedPlan ? `立即购买 · ${PLANS.find(p => p.id === selectedPlan)?.price}` : '请选择套餐'}
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">支付由 PayPal 安全处理 · 点数永不过期</p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-violet-200 border-t-white rounded-full animate-spin" />
      </main>
    }>
      <HomeContent />
    </Suspense>
  )
}
