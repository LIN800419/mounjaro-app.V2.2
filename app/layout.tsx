import type { Metadata } from 'next'
import './globals.css'
import PwaUpdater from '@/components/PwaUpdater'

export const metadata: Metadata = {
  title: '猛健樂 PRO',
  description: '個人紀錄工具',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
    shortcut: '/icons/icon-192.png',
  },
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