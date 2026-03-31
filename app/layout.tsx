import type { Metadata } from 'next'
import './globals.css'
import PwaUpdater from '@/components/PwaUpdater'

export const metadata: Metadata = {
  title: '猛健樂 PRO',
  description: '個人紀錄工具',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="mx-auto min-h-screen w-full max-w-md px-4 py-4">
          <PwaUpdater className="mb-4" />
          {children}
        </div>
      </body>
    </html>
  )
}