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
    <div className="min-h-dvh bg-white text-gray-900">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-purple-50 via-pink-50/50 to-white px-5 pt-14 pb-12 text-center">

        {/* ラベル */}
        <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full mb-5 tracking-wide">
          🍻 飲み会向け・価値観推理ゲーム
        </div>

        {/* ロゴ + ふりがな */}
        <div className="mb-3">
          <h1
            className="text-6xl font-black tracking-tight leading-none"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            GUESSO
          </h1>
          <p className="text-sm font-semibold text-purple-400 tracking-widest mt-1">ゲッソ</p>
        </div>

        {/* キャッチコピー（Hero主役） */}
        <h2 className="text-3xl font-black text-gray-900 leading-snug mb-2">
          一人の<span className="text-purple-600">価値観</span>を、<br />みんなで当て合おう
        </h2>
        <p className="text-xl mb-8">🍻</p>

        {/* ── CTA Buttons ── */}
        {mode === 'home' && (
          <div className="flex flex-col gap-4 max-w-xs mx-auto">
            {/* 主CTA */}
            <button
              onClick={() => setMode('create')}
              className="w-full text-white font-black text-xl py-5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-purple-300"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
            >
              🏠 ルームを作る
            </button>
            {/* 副CTA */}
            <button
              onClick={() => setMode('join')}
              className="w-full bg-white border-2 border-purple-300 text-purple-700 font-bold text-lg py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 hover:border-purple-500 hover:bg-purple-50"
            >
              🚪 ルームに参加
            </button>
          </div>
        )}

        {/* ── Create form ── */}
        {mode === 'create' && (
          <div className="max-w-xs mx-auto text-left">
            <button onClick={() => { setMode('home'); setError('') }} className="text-gray-500 font-medium text-sm mb-4 flex items-center gap-1 hover:text-gray-700 transition-colors">
              ← もどる
            </button>
            <div className="bg-white border border-gray-200 shadow-md rounded-3xl p-6">
              <h2 className="text-xl font-black mb-1 text-gray-900">ルームを作成</h2>
              <p className="text-gray-600 text-sm font-medium mb-5">あなたがホストになります</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all font-medium"
                  placeholder="あなたの名前（12文字以内）"
                  value={hostName}
                  onChange={e => setHostName(e.target.value)}
                  maxLength={12}
                  autoFocus
                />
                {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !hostName.trim()}
                  className="w-full text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-lg shadow-lg shadow-purple-200"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
                >
                  {loading ? '作成中...' : '🎉 作成する'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Join form ── */}
        {mode === 'join' && (
          <div className="max-w-xs mx-auto text-left">
            <button onClick={() => { setMode('home'); setError('') }} className="text-gray-500 font-medium text-sm mb-4 flex items-center gap-1 hover:text-gray-700 transition-colors">
              ← もどる
            </button>
            <div className="bg-white border border-gray-200 shadow-md rounded-3xl p-6">
              <h2 className="text-xl font-black mb-1 text-gray-900">ルームに参加</h2>
              <p className="text-gray-600 text-sm font-medium mb-5">ホストからコードを教えてもらおう</p>
              <form onSubmit={handleJoin} className="space-y-4">
                <input
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl tracking-widest uppercase placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all font-bold"
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                />
                <input
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all font-medium"
                  placeholder="あなたの名前（12文字以内）"
                  value={joinName}
                  onChange={e => setJoinName(e.target.value)}
                  maxLength={12}
                />
                {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !joinCode.trim() || !joinName.trim()}
                  className="w-full text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-lg shadow-lg shadow-purple-200"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
                >
                  {loading ? '参加中...' : '🚀 参加する'}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* ── Below-fold content (home only) ── */}
      {mode === 'home' && (
        <>
          {/* ── Game preview ── */}
          <section className="px-5 py-12">
            <p className="text-center text-xs font-black text-purple-500 uppercase tracking-widest mb-1">こんなゲームです</p>
            <h2 className="text-center text-2xl font-black text-gray-900 mb-6">ゲームイメージ</h2>
            <div className="max-w-sm mx-auto rounded-3xl overflow-hidden border border-purple-100 shadow-md">
              {/* Card header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 flex items-center gap-2">
                <span className="text-xl">💕</span>
                <span className="font-bold text-white text-sm">恋愛テーマ — 2位を予想中！</span>
              </div>
              {/* Ranking rows */}
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
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                      state === 'correct' ? 'bg-green-50 border border-green-200' :
                      state === 'active'  ? 'bg-purple-50 border border-purple-200 ring-1 ring-purple-300' :
                      state === 'hint'    ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-gray-50 border border-gray-200 opacity-60'
                    }`}
                  >
                    <span className="w-7 text-right text-xs font-bold text-gray-600">{rank}位</span>
                    <span className="text-base">{state === 'hidden' ? '❓' : emoji}</span>
                    <span className={`font-semibold ${state === 'hidden' ? 'text-gray-400' : state === 'active' ? 'text-purple-700' : 'text-gray-800'}`}>
                      {label}
                    </span>
                    {state === 'correct' && <span className="ml-auto text-green-600 text-xs font-bold">✓ 正解</span>}
                    {state === 'hint'    && <span className="ml-auto text-yellow-600 text-xs font-bold">💡 ヒント</span>}
                    {state === 'active'  && <span className="ml-auto text-purple-600 text-xs font-bold">← 予想中</span>}
                  </div>
                ))}
              </div>
              <div className="bg-purple-50 px-4 py-3 text-center border-t border-purple-100">
                <p className="text-xs text-purple-700 font-semibold">4位だけヒントとして公開される！他は順番に当てていこう</p>
              </div>
            </div>
          </section>

          {/* ── How to play ── */}
          <section className="bg-gray-50 px-5 py-12">
            <p className="text-center text-xs font-black text-purple-500 uppercase tracking-widest mb-1">HOW TO PLAY</p>
            <h2 className="text-center text-2xl font-black text-gray-900 mb-8">あそびかた</h2>
            <div className="max-w-sm mx-auto space-y-0">
              {[
                {
                  step: 1, emoji: '📱',
                  title: 'ルームを作って仲間を招待',
                  desc: 'ホストがルームコードを共有。飲み会中にスマホで参加するだけ',
                },
                {
                  step: 2, emoji: '🎯',
                  title: 'テーマと出題者を決める',
                  desc: '「恋愛」「人生観」などのテーマを選んで、今回の出題者を指名',
                },
                {
                  step: 3, emoji: '📝',
                  title: '出題者が7項目をランキング',
                  desc: '自分の正直な順位を入力。4位だけ全員に公開されるヒントになる',
                },
                {
                  step: 4, emoji: '🤔',
                  title: 'みんなで1〜6位を順番に予想',
                  desc: 'ヒントを参考に全員が予想。合ってたらポイントゲット！',
                },
                {
                  step: 5, emoji: '🎊',
                  title: 'スコア発表 → 次の出題者へ',
                  desc: '全部当てたら神読み！出題者を交代してまた盛り上がろう',
                },
              ].map(({ step, emoji, title, desc }, i, arr) => (
                <div key={step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                    >
                      {step}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-0.5 flex-1 bg-purple-200 my-1 min-h-[20px]" />
                    )}
                  </div>
                  <div className="pb-7">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{emoji}</span>
                      <span className="font-black text-gray-900">{title}</span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Themes ── */}
          <section className="px-5 py-12">
            <p className="text-center text-xs font-black text-purple-500 uppercase tracking-widest mb-1">THEMES</p>
            <h2 className="text-center text-2xl font-black text-gray-900 mb-6">テーマ</h2>
            <div className="flex gap-3 max-w-sm mx-auto">
              {[
                { emoji: '💕', label: '恋愛', items: '顔・性格・収入…' },
                { emoji: '🌈', label: '人生観', items: '自由・お金・健康…' },
                { emoji: '🍸', label: 'デート', items: '雰囲気・映え・リード…' },
              ].map(({ emoji, label, items }) => (
                <div key={label} className="flex-1 bg-purple-50 border border-purple-200 rounded-2xl px-2 py-4 text-center">
                  <div className="text-3xl mb-2">{emoji}</div>
                  <div className="font-black text-purple-800 text-sm mb-1">{label}</div>
                  <div className="text-xs text-gray-600 font-medium leading-tight">{items}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Bottom CTA ── */}
          <section className="px-5 pb-16 pt-2 text-center">
            <p className="text-gray-700 font-semibold text-base mb-6">さあ、飲み会をもっと盛り上げよう！</p>
            <button
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMode('create') }}
              className="text-white font-black text-xl py-5 px-12 rounded-2xl shadow-xl shadow-purple-300 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              🍻 今すぐはじめる
            </button>
          </section>

          {/* ── Footer ── */}
          <footer className="px-5 pb-8 pt-6 text-center border-t border-gray-200">
            <Link href="/privacy" className="text-gray-500 text-xs hover:text-gray-700 transition-colors font-medium">
              プライバシーポリシー
            </Link>
          </footer>
        </>
      )}
    </div>
  )
}
