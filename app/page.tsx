'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'

type State = 'idle' | 'loading' | 'done' | 'error'

export default function Home() {
  const [state, setState] = useState<State>('idle')
  const [originalUrl, setOriginalUrl] = useState<string>('')
  const [resultUrl, setResultUrl] = useState<string>('')
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)

  const processImage = useCallback(async (file: File) => {
    if (!file.type.match(/image\/(jpeg|png)/)) {
      setErrorMsg('仅支持 JPG、PNG 格式')
      setState('error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('文件大小不能超过 10MB')
      setState('error')
      return
    }

    setOriginalUrl(URL.createObjectURL(file))
    setState('loading')
    setErrorMsg('')

    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/remove-bg', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '处理失败')
      }
      const blob = await res.blob()
      setResultBlob(blob)
      setResultUrl(URL.createObjectURL(blob))
      setState('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : '未知错误')
      setState('error')
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processImage(file)
  }

  const handleDownload = () => {
    if (!resultBlob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(resultBlob)
    a.download = 'no-background.png'
    a.click()
  }

  const handleReset = () => {
    setState('idle')
    setOriginalUrl('')
    setResultUrl('')
    setResultBlob(null)
    setErrorMsg('')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-800 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">🎨 图片背景移除工具</h1>
        <p className="text-violet-200 text-lg">上传图片，一键去除背景，免费使用</p>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8">

        {/* 上传区域 */}
        {(state === 'idle' || state === 'error') && (
          <>
            <label
              className={`flex flex-col items-center justify-center border-4 border-dashed rounded-xl p-16 cursor-pointer transition-all
                ${isDragging ? 'border-violet-500 bg-violet-50' : 'border-violet-300 bg-gray-50 hover:border-violet-500 hover:bg-violet-50'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <span className="text-6xl mb-4">📸</span>
              <span className="text-xl font-semibold text-gray-700 mb-1">点击或拖拽图片到这里</span>
              <span className="text-sm text-gray-400">支持 JPG、PNG 格式，最大 10MB</span>
              <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileInput} />
            </label>

            {state === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center">
                ⚠️ {errorMsg}
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
                  <Image src={originalUrl} alt="原图" width={400} height={400} className="w-full object-contain max-h-64" unoptimized />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">去除背景后</p>
                <div className="rounded-xl overflow-hidden border border-gray-200"
                  style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 20px 20px' }}>
                  <Image src={resultUrl} alt="处理结果" width={400} height={400} className="w-full object-contain max-h-64" unoptimized />
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleDownload}
                className="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors"
              >
                ⬇️ 下载图片
              </button>
              <button
                onClick={handleReset}
                className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
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
    </main>
  )
}
