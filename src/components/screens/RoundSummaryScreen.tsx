'use client'

import { useState } from 'react'
import { getThemeItem } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  roomCode: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function RoundSummaryScreen({ gameState, playerId, roomCode, onAction }: Props) {
  const { room, players, theme, round, scores, round_scores } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false
  const asker = players.find(p => p.id === room.asker_player_id)
  const ranking = round?.ranking_json
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const nonAskerRoundScores = (round_scores ?? [])
    .filter(s => s.player_id !== room.asker_player_id)
    .sort((a, b) => b.correct - a.correct)

  const topRoundScore = nonAskerRoundScores[0]?.correct ?? 0
  const bottomRoundScore = nonAskerRoundScores[nonAskerRoundScores.length - 1]?.correct ?? 0
  const allTied = topRoundScore === bottomRoundScore && nonAskerRoundScores.length > 1

  const topScorers = allTied ? [] : nonAskerRoundScores.filter(s => s.correct === topRoundScore)
  const bottomScorers = allTied ? [] : nonAskerRoundScores.filter(s => s.correct === bottomRoundScore && s.correct !== topRoundScore)

  const sortedScores = [...(scores ?? [])].sort((a, b) => b.total - a.total)
  const maxTotal = Math.max(...sortedScores.map(s => s.total), 1)

  const buildShareText = () => {
    const winner = topScorers[0]
      ? players.find(p => p.id === topScorers[0].player_id)?.name
      : null
    const scoreText = sortedScores
      .map((s, i) => {
        const p = players.find(pl => pl.id === s.player_id)
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
        return `${medal} ${p?.name ?? '?'}: ${s.total}点`
      })
      .join('\n')

    return [
      winner
        ? `🏆 ${winner}が${asker?.name}の価値観を一番わかってた！`
        : `🎮 GUESSOで${asker?.name}の価値観を予想したよ！`,
      `テーマ: ${theme?.emoji ?? ''} ${theme?.title ?? ''}`,
      '',
      scoreText,
      '',
      '▶ 一緒に遊ぶ → https://guesso-app.vercel.app',
      '#GUESSO #価値観ゲーム',
    ].filter(Boolean).join('\n')
  }

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)

    const text = buildShareText()
    const url = 'https://guesso-app.vercel.app'

    try {
      // ── 画像キャプチャを試みる ────────────────────────────
      const cardEl = document.getElementById('share-card')
      if (cardEl && typeof navigator !== 'undefined' && navigator.share) {
        try {
          // html2canvas を動的インポート（SSR回避）
          const html2canvas = (await import('html2canvas')).default
          const canvas = await html2canvas(cardEl, {
            backgroundColor: '#0f1a3a',
            scale: 2,           // 高解像度
            useCORS: true,
            logging: false,
            // iOSでスクロール位置がずれないよう固定
            scrollX: 0,
            scrollY: -window.scrollY,
          })

          const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/png')
          )

          if (blob) {
            const file = new File([blob], 'guesso-result.png', { type: 'image/png' })
            // ファイル共有に対応しているか確認
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], text, url })
              return
            }
          }
        } catch (e) {
          console.warn('[share] 画像キャプチャ失敗、テキストのみでシェア:', e)
        }
      }

      // ── フォールバック: テキストのみシェア ────────────────
      if (navigator.share) {
        try { await navigator.share({ title: 'GUESSO', text, url }) } catch { /* キャンセル */ }
      } else {
        // Web Share API 非対応ブラウザ → クリップボードにコピー
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-6">

      {/* ===== シェアカード（スクショ用・意図的にダーク） ===== */}
      <div
        id="share-card"
        className="rounded-3xl overflow-hidden mb-4 animate-fade-in"
        style={{ background: 'linear-gradient(160deg, #1a0533 0%, #0f1a3a 50%, #001a10 100%)' }}
      >
        {/* カードヘッダー */}
        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-black tracking-widest text-white/30 uppercase">GUESSO</span>
            <span className="text-xs text-white/30">ラウンド {room.current_round}</span>
          </div>
          <p className="text-lg font-black text-white">
            {theme?.emoji} {theme?.title}
          </p>
          <p className="text-white/50 text-sm">
            出題者: <span className="text-yellow-400 font-bold">{asker?.name}</span>
          </p>
        </div>

        {/* 全ランキング */}
        {ranking && theme && (
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-white/30 text-xs mb-2">正解ランキング</p>
            <div className="space-y-1.5">
              {ranking.map((itemId, idx) => {
                if (!itemId) return null
                const item = getThemeItem(theme.id, itemId)
                if (!item) return null
                const rank = idx + 1
                const isTop = rank === 1
                const isHint = idx === 3
                return (
                  <div key={idx} className={`flex items-center gap-2 rounded-xl px-3 py-1.5
                    ${isTop ? 'bg-yellow-400/15 border border-yellow-400/30' :
                      isHint ? 'bg-pink-400/10 border border-pink-400/20' :
                      'bg-white/5'}`}
                  >
                    <span className="text-sm font-black w-6 text-center text-white/60">
                      {RANK_MEDAL[rank] ?? rank}
                    </span>
                    <span className="text-lg">{item.emoji}</span>
                    <span className={`text-sm font-semibold flex-1 ${isTop ? 'text-yellow-300' : 'text-white/80'}`}>
                      {item.label}
                    </span>
                    {isHint && <span className="text-xs text-pink-400 opacity-60">ヒント</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* スコアボード */}
        <div className="px-4 py-3">
          <p className="text-white/30 text-xs mb-2">累計スコア</p>
          <div className="space-y-2">
            {sortedScores.map((s, i) => {
              const p = players.find(pl => pl.id === s.player_id)
              const isAskerThisRound = s.player_id === room.asker_player_id
              const barPct = maxTotal > 0 ? Math.round((s.total / maxTotal) * 100) : 0
              return (
                <div key={s.player_id} className="flex items-center gap-2">
                  <span className="text-sm w-5 text-center">{RANK_MEDAL[i + 1] ?? ''}</span>
                  <span className="text-sm font-semibold w-16 truncate text-white/80">{p?.name}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="text-sm font-black text-white w-8 text-right">{s.total}</span>
                  {isAskerThisRound && <span className="text-xs text-yellow-400/60">出題</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* カードフッター */}
        <div className="px-5 py-3 border-t border-white/10">
          <p className="text-white/20 text-xs text-center">guesso-app.vercel.app</p>
        </div>
      </div>

      {/* ===== 称号バナー ===== */}
      {!allTied && (topScorers.length > 0 || bottomScorers.length > 0) && (
        <div className="space-y-2 mb-4 animate-slide-up">
          {topScorers.map(s => {
            const p = players.find(pl => pl.id === s.player_id)
            return (
              <div key={s.player_id} className="rounded-2xl px-4 py-3 flex items-center gap-3
                bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-black text-yellow-700">{p?.name}</p>
                  <p className="text-gray-600 text-sm">
                    {asker?.name}の<span className="text-yellow-600 font-bold">一番の理解者</span>！
                    <span className="text-gray-400 ml-1">({s.correct}/{5}点)</span>
                  </p>
                </div>
              </div>
            )
          })}
          {bottomScorers.map(s => {
            const p = players.find(pl => pl.id === s.player_id)
            return (
              <div key={s.player_id} className="rounded-2xl px-4 py-3 flex items-center gap-3
                glass border border-purple-100">
                <span className="text-2xl">💔</span>
                <div>
                  <p className="font-bold text-gray-800">{p?.name}</p>
                  <p className="text-gray-600 text-sm">
                    {asker?.name}と
                    <span className="font-semibold text-gray-700">もっと仲良くなろう</span>！
                    <span className="text-gray-400 ml-1">({s.correct}/{5}点)</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===== ボタン ===== */}
      <div className="space-y-3 mt-auto">
        {/* コピー完了トースト */}
        {copied && (
          <div className="text-center text-sm font-bold text-emerald-600 animate-fade-in">
            ✅ テキストをコピーしました
          </div>
        )}
        <button
          onClick={handleShare}
          disabled={sharing}
          className="w-full text-white font-black text-base py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #06c755 0%, #00a046 100%)' }}
        >
          {sharing ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
              <span>画像を準備中...</span>
            </>
          ) : (
            <>
              <span>💚</span>
              <span>誰が1番の理解者かLINEで共有</span>
            </>
          )}
        </button>

        {isHost ? (
          <button
            onClick={() => onAction('next-round')}
            className="btn-primary w-full text-xl py-4"
          >
            ▶️ 次のラウンドへ
          </button>
        ) : (
          <div className="glass rounded-2xl py-3 text-center">
            <p className="text-gray-500 text-sm">⏳ ホストが次のラウンドを始めます</p>
          </div>
        )}
      </div>
    </div>
  )
}
