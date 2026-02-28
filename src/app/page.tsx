'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home')
  const [hostName, setHostName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hostName.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_name: hostName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      // ホストのplayer_idをlocalStorageに保存
      localStorage.setItem(
        `guesso_${data.room_code}`,
        JSON.stringify({ playerId: data.player_id, playerName: hostName.trim() })
      )
      router.push(`/room/${data.room_code}`)
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code || !joinName.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: code, name: joinName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      localStorage.setItem(
        `guesso_${data.room_code}`,
        JSON.stringify({ playerId: data.player_id, playerName: joinName.trim() })
      )
      router.push(`/room/${data.room_code}`)
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <div className="mb-10 text-center animate-fade-in">
        <div className="text-6xl mb-3">🎯</div>
        <h1 className="text-5xl font-black gradient-text tracking-tight">GUESSO</h1>
        <p className="text-white/50 mt-2 text-sm">価値観推理ゲーム</p>
      </div>

      {/* Home mode */}
      {mode === 'home' && (
        <div className="w-full max-w-sm space-y-3 animate-slide-up">
          <button
            onClick={() => setMode('create')}
            className="btn-primary w-full text-xl py-4 flex items-center justify-center gap-2"
          >
            <span>🏠</span> ルームを作る
          </button>
          <button
            onClick={() => setMode('join')}
            className="btn-secondary w-full text-xl py-4 flex items-center justify-center gap-2"
          >
            <span>🚪</span> ルームに参加
          </button>
          <p className="text-center text-white/30 text-xs mt-4">
            友達の飲み会で盛り上がろう🍻
          </p>
          <p className="text-center mt-2">
            <Link href="/privacy" className="text-white/20 text-xs hover:text-white/40">
              プライバシーポリシー
            </Link>
          </p>
        </div>
      )}

      {/* Create mode */}
      {mode === 'create' && (
        <div className="w-full max-w-sm animate-slide-up">
          <button onClick={() => { setMode('home'); setError('') }} className="text-white/40 text-sm mb-4 flex items-center gap-1">
            ← もどる
          </button>
          <div className="glass rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-1">ルームを作成</h2>
            <p className="text-white/40 text-sm mb-5">あなたがホストになります</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                className="input-field"
                placeholder="あなたの名前"
                value={hostName}
                onChange={e => setHostName(e.target.value)}
                maxLength={12}
                autoFocus
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !hostName.trim()}
                className="btn-primary w-full text-lg"
              >
                {loading ? '作成中...' : '🎉 作成する'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join mode */}
      {mode === 'join' && (
        <div className="w-full max-w-sm animate-slide-up">
          <button onClick={() => { setMode('home'); setError('') }} className="text-white/40 text-sm mb-4 flex items-center gap-1">
            ← もどる
          </button>
          <div className="glass rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-1">ルームに参加</h2>
            <p className="text-white/40 text-sm mb-5">ホストからコードを教えてもらおう</p>
            <form onSubmit={handleJoin} className="space-y-4">
              <input
                className="input-field tracking-widest text-center text-2xl uppercase"
                placeholder="XXXXXX"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
              />
              <input
                className="input-field"
                placeholder="あなたの名前"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
                maxLength={12}
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !joinCode.trim() || !joinName.trim()}
                className="btn-primary w-full text-lg"
              >
                {loading ? '参加中...' : '🚀 参加する'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
