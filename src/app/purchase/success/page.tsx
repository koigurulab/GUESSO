'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setPurchased } from '@/lib/purchase'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomCode = searchParams.get('room_code')

  useEffect(() => {
    // 購入済みをlocalStorageに保存
    setPurchased()

    // 2秒後にルームに戻る
    const timer = setTimeout(() => {
      if (roomCode) {
        router.replace(`/room/${roomCode}`)
      } else {
        router.replace('/')
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [roomCode, router])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4" style={{ animation: 'bounce 1s infinite' }}>🎉</div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">購入完了！</h1>
      <p className="text-gray-600">👥 人ランキングテーマが解放されました</p>
      <p className="text-gray-400 text-sm mt-6">ゲームに戻ります...</p>
    </div>
  )
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
