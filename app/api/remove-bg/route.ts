import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // 文件大小限制 10MB
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

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: removeBgForm,
    })

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
        'Content-Disposition': 'attachment; filename="no-background.png"',
      },
    })
  } catch {
    return NextResponse.json({ error: '网络错误，请检查网络连接后重试' }, { status: 500 })
  }
}
