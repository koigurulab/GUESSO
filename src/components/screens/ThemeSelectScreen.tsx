'use client'

import { useState, useEffect } from 'react'
import { FREE_THEMES, FETISH_THEMES, PERSON_RANK_THEMES } from '@/lib/themes'
import { hasPurchased } from '@/lib/purchase'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  roomCode: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

const categoryColor: Record<string, string> = {
  love:        'from-pink-500 to-rose-600',
  life:        'from-blue-500 to-indigo-600',
  light:       'from-amber-500 to-orange-600',
  fetish:      'from-purple-500 to-violet-600',
  'person-rank': 'from-violet-500 to-fuchsia-600',
}

// LINEアカウント追加リンク（@117ppmlv）
const LINE_ADD_URL = 'https://line.me/R/ti/p/%40117ppmlv'

export default function ThemeSelectScreen({ gameState, playerId, roomCode, onAction }: Props) {
  const { room, players } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false
  const lineVerified = room.line_verified
  const verifyCode = room.line_verify_code

  // フェチカードの展開状態
  const [fetishExpanded, setFetishExpanded] = useState(false)
  // 人ランキングパックの展開状態
  const [personRankExpanded, setPersonRankExpanded] = useState(false)
  // 購入済み状態（localStorageから読む）
  const [purchased, setPurchased] = useState(false)
  // Stripe決済中
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    setPurchased(hasPurchased())
  }, [])

  const handleBuyPersonRank = async () => {
    if (purchasing) return
    setPurchasing(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, player_id: playerId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? '決済ページを開けませんでした')
        setPurchasing(false)
      }
    } catch {
      alert('通信エラーが発生しました')
      setPurchasing(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="text-center mb-6 animate-fade-in">
        <p className="text-gray-500 text-xs mb-1">ラウンド {room.current_round}</p>
        <h2 className="text-2xl font-black text-gray-900">テーマを選ぼう！</h2>
      </div>

      <div className="space-y-3 flex-1 animate-slide-up">

        {/* 通常テーマ（無料） */}
        {FREE_THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => isHost && onAction('select-theme', { theme_id: theme.id })}
            disabled={!isHost}
            className={`
              w-full glass rounded-3xl p-5 text-left
              transition-all active:scale-95
              ${isHost ? 'cursor-pointer hover:glass-strong' : 'cursor-default opacity-80'}
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${categoryColor[theme.category]} flex items-center justify-center text-3xl`}>
                {theme.emoji}
              </div>
              <div className="flex-1">
                <p className="font-black text-lg text-gray-900">{theme.title}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {theme.items.map(item => (
                    <span key={item.id} className="text-xs text-gray-500">
                      {item.emoji}{item.label}
                    </span>
                  ))}
                </div>
              </div>
              {isHost && <span className="text-gray-400 text-lg">›</span>}
            </div>
          </button>
        ))}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            フェチテーマ（LINE認証が必要 / 認証済みで選択可）
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="glass rounded-3xl overflow-hidden">
          {/* ヘッダー行 */}
          <button
            onClick={() => setFetishExpanded(prev => !prev)}
            className="w-full p-5 text-left transition-all active:scale-95 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${categoryColor.fetish} flex items-center justify-center text-3xl`}>
                {lineVerified ? '🔥' : '🔒'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-lg text-gray-900">正直、どこフェチ？</p>
                  {!lineVerified && (
                    <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                      LINE追加で解放！
                    </span>
                  )}
                  {lineVerified && (
                    <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                      💜 解放済み
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {lineVerified
                    ? 'うなじ・鎖骨・わき・手・血管・肩幅...'
                    : 'タップして詳細を確認'}
                </p>
              </div>
              <span className="text-gray-400 text-lg">{fetishExpanded ? '∨' : '›'}</span>
            </div>
          </button>

          {/* 展開パネル */}
          {fetishExpanded && (
            <div className="border-t border-white/30 px-5 pb-5 pt-4 space-y-4">

              {/* ── 未認証：LINE誘導パネル ── */}
              {!lineVerified && (
                <>
                  <div className="space-y-2">
                    {FETISH_THEMES.map(theme => (
                      <div key={theme.id} className="bg-white/30 rounded-2xl px-4 py-3">
                        <p className="text-sm font-bold text-gray-700 mb-1">{theme.emoji} {theme.title}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {theme.items.map(item => (
                            <span key={item.id} className="text-xs text-gray-600">
                              {item.emoji}{item.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* LINE追加ボタン */}
                  <a
                    href={LINE_ADD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold text-white text-sm"
                    style={{ backgroundColor: '#06C755' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    LINE公式アカウントを友達追加する
                  </a>

                  {/* 確認コード */}
                  {verifyCode && (
                    <div className="bg-white/50 rounded-2xl p-4 text-center">
                      <p className="text-xs text-gray-500 mb-1">② 追加したら、このコードをLINEに送信</p>
                      <p className="text-4xl font-black tracking-widest text-purple-700 my-2">
                        {verifyCode}
                      </p>
                      <p className="text-xs text-gray-400">送信後、このページが自動で更新されます</p>
                    </div>
                  )}
                </>
              )}

              {/* ── 認証済み + ホスト：女性/男性サブ選択 ── */}
              {lineVerified && isHost && (
                <>
                  <p className="text-sm text-gray-600 text-center font-bold">対象を選んでください</p>
                  {FETISH_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => onAction('select-theme', { theme_id: theme.id })}
                      className="w-full bg-white/40 hover:bg-white/60 active:scale-95 rounded-2xl p-4 text-left transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{theme.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm">{theme.title}</p>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {theme.items.map(item => (
                              <span key={item.id} className="text-xs text-gray-500">
                                {item.emoji}{item.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-gray-400">›</span>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* ── 認証済み + 非ホスト ── */}
              {lineVerified && !isHost && (
                <p className="text-sm text-gray-500 text-center py-2">
                  💜 解放済み！ホストがテーマを選んでいます
                </p>
              )}
            </div>
          )}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            人ランキングパック（Stripe課金）
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="glass rounded-3xl overflow-hidden">
          {/* ヘッダー行 */}
          <button
            onClick={() => setPersonRankExpanded(prev => !prev)}
            className="w-full p-5 text-left transition-all active:scale-95 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${categoryColor['person-rank']} flex items-center justify-center text-3xl`}>
                {purchased ? '👥' : '🔒'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-lg text-gray-900">👥 人ランキング</p>
                  {!purchased && (
                    <span className="text-xs bg-fuchsia-100 text-fuchsia-700 font-bold px-2 py-0.5 rounded-full">
                      ¥480で解放！
                    </span>
                  )}
                  {purchased && (
                    <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">
                      👑 解放済み
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  恋人・モテ・旅行...仲間をランク付け！
                </p>
              </div>
              <span className="text-gray-400 text-lg">{personRankExpanded ? '∨' : '›'}</span>
            </div>
          </button>

          {/* 展開パネル */}
          {personRankExpanded && (
            <div className="border-t border-white/30 px-5 pb-5 pt-4 space-y-3">

              {/* テーマ一覧 */}
              <div className="space-y-2">
                {PERSON_RANK_THEMES.map(theme => (
                  <div key={theme.id} className="bg-white/30 rounded-2xl px-4 py-3">
                    <p className="text-sm font-bold text-gray-700">{theme.emoji} {theme.title}</p>
                  </div>
                ))}
              </div>

              {/* 未購入: 購入ボタン（ホストのみ） */}
              {!purchased && isHost && (
                <button
                  onClick={handleBuyPersonRank}
                  disabled={purchasing}
                  className="w-full py-3 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 active:scale-95 transition-all disabled:opacity-60"
                >
                  {purchasing ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                      決済ページを開いています...
                    </>
                  ) : (
                    '¥480 で解放する（1回払い・この端末ずっと使える）'
                  )}
                </button>
              )}

              {/* 未購入: 非ホスト向けメッセージ */}
              {!purchased && !isHost && (
                <p className="text-sm text-gray-500 text-center py-2">
                  ¥480で解放できます。ホストに伝えてみよう！
                </p>
              )}

              {/* 購入済み + ホスト: テーマ選択ボタン */}
              {purchased && isHost && (
                <>
                  <p className="text-sm text-gray-600 text-center font-bold">テーマを選んでください</p>
                  {PERSON_RANK_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => onAction('select-theme', { theme_id: theme.id })}
                      className="w-full bg-white/40 hover:bg-white/60 active:scale-95 rounded-2xl p-4 text-left transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{theme.emoji}</span>
                        <p className="font-bold text-gray-900 text-sm flex-1">{theme.title}</p>
                        <span className="text-gray-400">›</span>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* 購入済み + 非ホスト */}
              {purchased && !isHost && (
                <p className="text-sm text-gray-500 text-center py-2">
                  👑 解放済み！ホストがテーマを選んでいます
                </p>
              )}
            </div>
          )}
        </div>

      </div>

      {!isHost && (
        <div className="mt-4 glass rounded-2xl py-4 text-center">
          <p className="text-gray-500 text-sm">⏳ ホストがテーマを選んでいます...</p>
        </div>
      )}
    </div>
  )
}
