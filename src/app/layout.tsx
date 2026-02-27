import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'GUESSO - 価値観推理ゲーム',
  description: '飲み会で盛り上がる！みんなの価値観を当てよう',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'GUESSO - 価値観推理ゲーム',
    description: '飲み会で盛り上がる！みんなの価値観を当てよう',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0d0b1e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="min-h-dvh bg-gradient-to-br from-gray-950 via-purple-950/50 to-gray-950">
          {children}
        </div>
      </body>
    </html>
  )
}
