export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过 10MB' }, { status: 400 })
    }

    const apiKey = process.env.REMOVE_BG_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key 未配置' }, { status: 500 })
    }

    const removeBgForm = new FormData()
    removeBgForm.append('image_file', imageFile)
    removeBgForm.append('size', 'auto')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 55000)

    let response: Response
    try {
      response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
        },
        body: removeBgForm,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 402) {
        return NextResponse.json({ error: 'API 额度已用尽，请稍后再试' }, { status: 402 })
      }
      return NextResponse.json({ error: `处理失败: ${errorText}` }, { status: response.status })
    }

    const resultBuffer = await response.arrayBuffer()

    return new NextResponse(resultBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': resultBuffer.byteLength.toString(),
        'Content-Disposition': 'attachment; filename="no-background.png"',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort') || msg.includes('AbortError')) {
      return NextResponse.json({ error: '请求超时，请稍后重试' }, { status: 504 })
    }
    return NextResponse.json({ error: `处理错误: ${msg}` }, { status: 500 })
  }
}
