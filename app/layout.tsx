import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '图片背景移除工具 - 一键去除图片背景',
  description: '免费在线图片背景移除工具，支持 JPG/PNG，上传即处理，不存储图片，保护隐私。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
