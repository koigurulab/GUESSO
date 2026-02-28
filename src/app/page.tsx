'use client'

import { Fragment, useState } from 'react'
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

  /* ────────────────────────────────────── */
  const gradientText = {
    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 55%, #ec4899 100%)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
  }
  const gradientBg = {
    background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
  }

  return (
    <div className="min-h-dvh bg-white text-gray-900">

      {/* ══════════════════════════════════════════
          HERO — 白基調、スマホ1画面に収める
      ══════════════════════════════════════════ */}
      <section className="px-5 pt-10 pb-8 text-center bg-gradient-to-b from-purple-50/70 to-white">

        {/* バッジ */}
        <div className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-700 mb-4">
          🍻 飲み会向け・価値観推理ゲーム
        </div>

        {/* ロゴ + ふりがな */}
        <div className="mb-3">
          <h1 className="text-6xl font-black tracking-tight leading-none" style={gradientText}>
            GUESSO
          </h1>
          <p className="text-[11px] tracking-[0.35em] text-gray-400 mt-1">ゲッソ</p>
        </div>

        {/* キャッチコピー */}
        <h2 className="text-[1.6rem] font-black text-gray-900 leading-snug mb-1">
          一人の<span className="text-purple-600">価値観</span>を、<br />みんなで当て合おう
        </h2>
        <p className="text-[13px] font-semibold text-gray-900 mb-5">
          あなたを1番理解してる友達は誰だ！？🔥
        </p>

        {/* 3ステップ（1行コンパクト） */}
        <div className="flex items-center max-w-[300px] mx-auto mb-5">
          {[
            { num: 1, emoji: '📝', label: 'ランキング作成' },
            { num: 2, emoji: '👀', label: '4位だけ公開' },
            { num: 3, emoji: '🎯', label: 'みんなで当てる' },
          ].map(({ num, emoji, label }, i) => (
            <Fragment key={num}>
              <div className="flex-1 flex flex-col items-center gap-0.5 rounded-xl border border-purple-100 bg-purple-50 py-2.5 px-1 text-center">
                <span className="text-[10px] font-black text-purple-400 leading-none">{num}</span>
                <span className="text-xl leading-none">{emoji}</span>
                <span className="text-[10px] font-black text-gray-800 leading-tight mt-0.5">{label}</span>
              </div>
              {i < 2 && (
                <span className="text-purple-300 font-bold text-base shrink-0 px-0.5">›</span>
              )}
            </Fragment>
          ))}
        </div>

        {/* ── CTA Buttons ── */}
        {mode === 'home' && (
          <div className="flex flex-col gap-3 max-w-[300px] mx-auto">
            <button
              onClick={() => setMode('create')}
              className="w-full text-white font-black text-lg py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
              style={gradientBg}
            >
              🏠 ルームを作る
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full bg-white border-2 border-purple-200 text-purple-700 font-bold text-base py-3.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 hover:border-purple-400"
            >
              🚪 ルームに参加
            </button>
          </div>
        )}

        {/* ── Create form ── */}
        {mode === 'create' && (
          <div className="max-w-xs mx-auto text-left">
            <button
              onClick={() => { setMode('home'); setError('') }}
              className="text-gray-500 font-medium text-sm mb-4 flex items-center gap-1 hover:text-gray-700 transition-colors"
            >
              ← もどる
            </button>
            <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6">
              <h2 className="text-xl font-black mb-1 text-gray-900">ルームを作成</h2>
              <p className="text-gray-800 text-sm font-medium mb-5">あなたがホストになります</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
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
                  className="w-full text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-lg shadow-md shadow-purple-200"
                  style={gradientBg}
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
            <button
              onClick={() => { setMode('home'); setError('') }}
              className="text-gray-500 font-medium text-sm mb-4 flex items-center gap-1 hover:text-gray-700 transition-colors"
            >
              ← もどる
            </button>
            <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6">
              <h2 className="text-xl font-black mb-1 text-gray-900">ルームに参加</h2>
              <p className="text-gray-800 text-sm font-medium mb-5">ホストからコードを教えてもらおう</p>
              <form onSubmit={handleJoin} className="space-y-4">
                <input
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl tracking-widest uppercase text-gray-900 placeholder-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                  placeholder="XXXXXX"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                />
                <input
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
                  placeholder="あなたの名前（12文字以内）"
                  value={joinName}
                  onChange={e => setJoinName(e.target.value)}
                  maxLength={12}
                />
                {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !joinCode.trim() || !joinName.trim()}
                  className="w-full text-white font-black py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-lg shadow-md shadow-purple-200"
                  style={gradientBg}
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
              LINE 導線バナー
          ══════════════════════════════ */}
          <section className="px-5 py-6 bg-white">
            <div className="max-w-sm mx-auto rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 flex items-center gap-4">
              <div className="text-3xl shrink-0">💬</div>
              <div>
                <p className="font-black text-sm text-gray-900 leading-tight">LINEグループにURLを投げるだけ</p>
                <p className="text-xs text-gray-800 font-medium mt-0.5 leading-snug">
                  ルームを作ったらリンクをシェア。<br />
                  受け取った友達はタップするだけで参加できる。
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════
              ゲームプレビュー
          ══════════════════════════════ */}
          <section className="px-5 py-10 bg-white">
            <p className="text-center text-[11px] font-black text-purple-500 uppercase tracking-widest mb-1">PREVIEW</p>
            <h2 className="text-center text-2xl font-black text-gray-900 mb-6">こんな画面で遊ぶ</h2>
            <div className="max-w-sm mx-auto rounded-3xl overflow-hidden border border-purple-100 shadow-md">
              <div className="px-4 py-3 flex items-center gap-2" style={gradientBg}>
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
                    <span className="w-7 text-right text-xs font-bold text-gray-700">{rank}位</span>
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
              HOW TO PLAY
          ══════════════════════════════ */}
          <section className="bg-gray-50 px-5 py-10">
            <p className="text-center text-[11px] font-black text-purple-500 uppercase tracking-widest mb-1">HOW TO PLAY</p>
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
                      style={gradientBg}
                    >
                      {step}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="w-0.5 flex-1 bg-purple-200 my-1 min-h-[20px]" />
                    )}
                  </div>
                  <div className="pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{emoji}</span>
                      <span className="font-black text-gray-900">{title}</span>
                    </div>
                    <p className="text-sm text-gray-800 font-medium leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════
              テーマ一覧
          ══════════════════════════════ */}
          <section className="bg-white px-5 py-10">
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
                  className="flex-1 rounded-2xl border border-purple-100 bg-purple-50 px-2 py-4 text-center"
                >
                  <div className="text-3xl mb-2">{emoji}</div>
                  <div className="font-black text-gray-900 text-sm mb-1">{label}</div>
                  <div className="text-[11px] text-gray-800 font-medium leading-tight">{items}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════
              Bottom CTA
          ══════════════════════════════ */}
          <section className="bg-gray-50 px-5 py-12 text-center border-t border-gray-100">
            <p className="text-gray-800 font-bold text-base mb-1">さあ、飲み会をもっと盛り上げよう！</p>
            <p className="text-gray-700 text-xs font-medium mb-6">アプリ不要・無料で今すぐ遊べる</p>
            <button
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMode('create') }}
              className="text-white font-black text-lg py-4 px-10 rounded-2xl transition-all active:scale-95 shadow-lg shadow-purple-200"
              style={gradientBg}
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
