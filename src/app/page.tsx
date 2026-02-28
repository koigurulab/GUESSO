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
    <div className="min-h-dvh text-gray-900" style={{ background: '#fafaf9' }}>

      {/* ══════════════════════════════
          Hero — ダークグラデーション
      ══════════════════════════════ */}
      <section
        className="relative overflow-hidden px-5 pt-14 pb-14 text-center"
        style={{ background: 'linear-gradient(160deg, #150d2e 0%, #2a1260 45%, #1a0d3d 100%)' }}
      >
        {/* 背景のぼかし装飾 */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full blur-[80px] opacity-30"
            style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 -right-16 w-[250px] h-[250px] rounded-full blur-[60px] opacity-20"
            style={{ background: 'radial-gradient(circle, #ec4899, transparent 70%)' }}
          />
        </div>

        {/* バッジ */}
        <div className="relative inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wide text-white/80 backdrop-blur-sm mb-7">
          🍻 飲み会向け・価値観推理ゲーム
        </div>

        {/* ロゴ + ふりがな */}
        <div className="relative mb-5">
          <h1
            className="text-7xl font-black tracking-tight leading-none"
            style={{
              background: 'linear-gradient(135deg, #d8b4fe 0%, #f472b6 55%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            GUESSO
          </h1>
          <p className="mt-1 text-xs tracking-[0.35em] text-white/40">ゲッソ</p>
        </div>

        {/* キャッチコピー */}
        <h2 className="relative text-[1.75rem] font-black leading-snug text-white mb-2">
          一人の
          <span
            style={{
              background: 'linear-gradient(135deg, #c084fc, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            価値観
          </span>
          を、<br />みんなで当て合おう
        </h2>

        {/* サブコピー */}
        <p className="relative text-base font-bold text-white/70 mb-2">
          あなたを1番理解してる友達は誰だ！？🔥
        </p>

        {/* LINE 導線チップ */}
        <div className="relative inline-flex items-center gap-1.5 rounded-full bg-white/8 border border-white/10 px-3 py-1 text-xs text-white/50 font-medium mb-9">
          <span>📱</span>
          <span>LINEグループにURLを投げるだけで全員参加できる</span>
        </div>

        {/* ── CTA Buttons ── */}
        {mode === 'home' && (
          <div className="relative flex flex-col gap-4 max-w-xs mx-auto">
            <button
              onClick={() => setMode('create')}
              className="w-full font-black text-xl py-5 rounded-2xl text-white transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
                boxShadow: '0 8px 32px rgba(168,85,247,0.45)',
              }}
            >
              🏠 ルームを作る
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full bg-white/10 backdrop-blur border border-white/25 text-white font-bold text-lg py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-white/20"
            >
              🚪 ルームに参加
            </button>
          </div>
        )}

        {/* ── Create form ── */}
        {mode === 'create' && (
          <div className="relative max-w-xs mx-auto text-left">
            <button
              onClick={() => { setMode('home'); setError('') }}
              className="text-white/50 font-medium text-sm mb-4 flex items-center gap-1 hover:text-white/80 transition-colors"
            >
              ← もどる
            </button>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
              <h2 className="text-xl font-black mb-1 text-white">ルームを作成</h2>
              <p className="text-white/55 text-sm font-medium mb-5">あなたがホストになります</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/30 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                  placeholder="あなたの名前（12文字以内）"
                  value={hostName}
                  onChange={e => setHostName(e.target.value)}
                  maxLength={12}
                  autoFocus
                />
                {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !hostName.trim()}
                  className="w-full text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-lg"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                >
                  {loading ? '作成中...' : '🎉 作成する'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Join form ── */}
        {mode === 'join' && (
          <div className="relative max-w-xs mx-auto text-left">
            <button
              onClick={() => { setMode('home'); setError('') }}
              className="text-white/50 font-medium text-sm mb-4 flex items-center gap-1 hover:text-white/80 transition-colors"
            >
              ← もどる
            </button>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
              <h2 className="text-xl font-black mb-1 text-white">ルームに参加</h2>
              <p className="text-white/55 text-sm font-medium mb-5">ホストからコードを教えてもらおう</p>
              <form onSubmit={handleJoin} className="space-y-4">
                <input
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-2xl tracking-widest uppercase text-white placeholder-white/25 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                />
                <input
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/30 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                  placeholder="あなたの名前（12文字以内）"
                  value={joinName}
                  onChange={e => setJoinName(e.target.value)}
                  maxLength={12}
                />
                {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !joinCode.trim() || !joinName.trim()}
                  className="w-full text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-lg"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                >
                  {loading ? '参加中...' : '🚀 参加する'}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* ── Below-fold (home only) ── */}
      {mode === 'home' && (
        <>
          {/* ══════════════════════════════
              3ステップ図解
          ══════════════════════════════ */}
          <section className="bg-white px-5 py-12">
            <p className="text-center text-[11px] font-black text-purple-500 uppercase tracking-widest mb-1">HOW IT WORKS</p>
            <h2 className="text-center text-2xl font-black text-gray-900 mb-1">3ステップで遊べる</h2>
            <p className="text-center text-gray-600 text-sm font-medium mb-8">アプリ不要。スマホだけで今すぐ OK</p>

            <div className="max-w-sm mx-auto flex items-start gap-2">
              {[
                { num: 1, emoji: '📝', title: 'ランキングを作る', desc: '出題者が7項目を正直に順位付け' },
                { num: 2, emoji: '👀', title: '4位だけ公開', desc: 'これがヒント！他はナゾのまま' },
                { num: 3, emoji: '🎯', title: 'みんなで当てる', desc: '全部当てたら神読み👑' },
              ].map(({ num, emoji, title, desc }, i) => (
                <div key={num} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full text-white text-xs font-black flex items-center justify-center mb-3 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                  >
                    {num}
                  </div>
                  <div
                    className="w-full rounded-2xl px-2 py-4 text-center"
                    style={{ background: 'linear-gradient(160deg, #f5f3ff, #fdf2f8)' }}
                  >
                    <div className="text-3xl mb-2">{emoji}</div>
                    <div className="text-xs font-black text-gray-900 leading-tight mb-1">{title}</div>
                    <div className="text-[11px] text-gray-600 font-medium leading-snug">{desc}</div>
                  </div>
                  {i < 2 && (
                    <div className="text-purple-300 font-bold text-lg mt-2 hidden" />
                  )}
                </div>
              ))}
            </div>

            {/* 矢印連結 */}
            <div className="max-w-sm mx-auto flex justify-between px-[calc(16.66%-10px)] mt-[-40px] mb-0 relative z-10 pointer-events-none">
              {['→', '→'].map((arrow, i) => (
                <div
                  key={i}
                  className="text-purple-300 font-black text-lg leading-none mt-[54px]"
                >
                  {arrow}
                </div>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════
              LINE 導線バナー
          ══════════════════════════════ */}
          <section className="px-5 py-0 bg-white">
            <div
              className="max-w-sm mx-auto rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{ background: 'linear-gradient(135deg, #e8f5e9, #f1f8e9)' }}
            >
              <div className="text-3xl shrink-0">💬</div>
              <div>
                <p className="font-black text-sm text-gray-900 leading-tight">LINEグループにURLを投げるだけ</p>
                <p className="text-xs text-gray-600 font-medium mt-0.5 leading-snug">
                  ルームを作ったらリンクをシェア。<br />
                  受け取った友達はタップするだけで参加できる。
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════
              ゲームプレビュー
          ══════════════════════════════ */}
          <section className="px-5 py-12 bg-white">
            <p className="text-center text-[11px] font-black text-purple-500 uppercase tracking-widest mb-1">PREVIEW</p>
            <h2 className="text-center text-2xl font-black text-gray-900 mb-6">こんな画面で遊ぶ</h2>
            <div className="max-w-sm mx-auto rounded-3xl overflow-hidden border border-purple-100 shadow-md">
              <div
                className="px-4 py-3 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
              >
                <span className="text-xl">💕</span>
                <span className="font-bold text-white text-sm">恋愛テーマ — 2位を予想中！</span>
              </div>
              <div className="bg-white px-4 py-3 space-y-2">
                {[
                  { rank: 1, emoji: '👀', label: '顔', state: 'correct' },
                  { rank: 2, emoji: '?', label: '予想してみよう…', state: 'active' },
                  { rank: 3, emoji: '?', label: '—', state: 'hidden' },
                  { rank: 4, emoji: '💝', label: '性格', state: 'hint' },
                  { rank: 5, emoji: '?', label: '—', state: 'hidden' },
                  { rank: 6, emoji: '?', label: '—', state: 'hidden' },
                ].map(({ rank, emoji, label, state }) => (
                  <div
                    key={rank}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                      state === 'correct' ? 'bg-emerald-50 border border-emerald-200' :
                      state === 'active'  ? 'bg-purple-50 border border-purple-200 ring-1 ring-purple-300' :
                      state === 'hint'    ? 'bg-amber-50 border border-amber-200' :
                      'bg-gray-50 border border-gray-200 opacity-55'
                    }`}
                  >
                    <span className="w-7 text-right text-xs font-bold text-gray-500">{rank}位</span>
                    <span className="text-base">{state === 'hidden' ? '❓' : emoji}</span>
                    <span className={`font-semibold ${
                      state === 'hidden'  ? 'text-gray-400' :
                      state === 'active'  ? 'text-purple-700' :
                      state === 'hint'    ? 'text-amber-800' :
                      'text-gray-800'
                    }`}>
                      {label}
                    </span>
                    {state === 'correct' && <span className="ml-auto text-emerald-600 text-xs font-bold">✓ 正解</span>}
                    {state === 'hint'    && <span className="ml-auto text-amber-600 text-xs font-bold">💡 ヒント</span>}
                    {state === 'active'  && <span className="ml-auto text-purple-600 text-xs font-bold">← 予想中</span>}
                  </div>
                ))}
              </div>
              <div className="bg-purple-50 px-4 py-3 text-center border-t border-purple-100">
                <p className="text-xs text-purple-700 font-semibold">4位だけヒントとして公開。他は順番に当てていこう！</p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════
              テーマ一覧
          ══════════════════════════════ */}
          <section className="px-5 py-10" style={{ background: '#f7f5ff' }}>
            <p className="text-center text-[11px] font-black text-purple-500 uppercase tracking-widest mb-1">THEMES</p>
            <h2 className="text-center text-2xl font-black text-gray-900 mb-6">テーマ</h2>
            <div className="flex gap-3 max-w-sm mx-auto">
              {[
                { emoji: '💕', label: '恋愛', items: '顔・性格・収入…' },
                { emoji: '🌈', label: '人生観', items: '自由・お金・健康…' },
                { emoji: '🍸', label: 'デート', items: '雰囲気・映え・リード…' },
              ].map(({ emoji, label, items }) => (
                <div
                  key={label}
                  className="flex-1 rounded-2xl px-2 py-4 text-center border border-purple-100 bg-white shadow-sm"
                >
                  <div className="text-3xl mb-2">{emoji}</div>
                  <div className="font-black text-gray-900 text-sm mb-1">{label}</div>
                  <div className="text-[11px] text-gray-600 font-medium leading-tight">{items}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════
              Bottom CTA
          ══════════════════════════════ */}
          <section
            className="px-5 py-14 text-center"
            style={{ background: 'linear-gradient(160deg, #150d2e 0%, #2a1260 100%)' }}
          >
            <p className="text-white/70 font-bold text-base mb-2">さあ、飲み会をもっと盛り上げよう！</p>
            <p className="text-white/45 text-xs font-medium mb-7">インストール不要・無料で今すぐ遊べる</p>
            <button
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMode('create') }}
              className="text-white font-black text-xl py-5 px-12 rounded-2xl transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
                boxShadow: '0 8px 32px rgba(168,85,247,0.45)',
              }}
            >
              🍻 今すぐはじめる
            </button>
          </section>

          {/* ── Footer ── */}
          <footer className="px-5 pb-8 pt-5 text-center border-t border-gray-200 bg-white">
            <Link href="/privacy" className="text-gray-500 text-xs hover:text-gray-700 transition-colors font-medium">
              プライバシーポリシー
            </Link>
          </footer>
        </>
      )}
    </div>
  )
}
