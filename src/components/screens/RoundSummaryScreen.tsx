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
  const isPersonRank = round?.is_person_rank ?? false
  const rankSeq = round?.rank_sequence ?? [1, 2, 3, 5, 6]
  const guiMode = room.gui_mode
  const guiCounts = round?.gui_counts ?? null
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  // ヒント位置インデックス: 人ランキングN>=5なら2(3位), 通常なら3(4位)
  const N = isPersonRank ? (round?.target_player_ids?.length ?? 0) : 7
  const hintIndex = isPersonRank ? (N >= 5 ? 2 : -1) : 3

  // IDからラベル情報を取得
  const getInfo = (id: string): { emoji?: string; label: string } => {
    if (isPersonRank) {
      const p = players.find(pl => pl.id === id)
      return { label: p?.name ?? id }
    }
    const item = theme ? getThemeItem(theme.id, id) : null
    return { emoji: item?.emoji, label: item?.label ?? id }
  }

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

  // 今ラウンドの最大正解数（rank_sequenceの長さ）
  const maxRoundScore = rankSeq.length

  const buildShareText = () => {
    const winner = topScorers[0]
      ? players.find(p => p.id === topScorers[0].player_id)?.name
      : null
    const loser = bottomScorers[0]
      ? players.find(p => p.id === bottomScorers[0].player_id)?.name
      : null
    const guiLine = guiMode && guiCounts
      ? Object.entries(guiCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 1)
          .map(([pid, count]) => {
            const p = players.find(pl => pl.id === pid)
            return `🍺 ${p?.name ?? '?'}は${count}杯グイ！`
          })[0] ?? ''
      : ''

    return [
      winner
        ? `🏆 ${winner}が${asker?.name}の本音を一番わかってた！`
        : `🎮 ${asker?.name}の本音を予想したよ！`,
      `テーマ: ${theme?.emoji ?? ''} ${theme?.title ?? ''}`,
      loser ? `💀 ${loser}はちょっと理解不足...` : '',
      guiLine,
      '',
      '友達の本音、知ってる？',
      '▶ https://guesso-app.vercel.app',
      '#GUESSO',
    ].filter(Boolean).join('\n')
  }

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)

    const text = buildShareText()
    const url = 'https://guesso-app.vercel.app'

    try {
      const cardEl = document.getElementById('share-card')
      if (cardEl && typeof navigator !== 'undefined' && navigator.share) {
        try {
          const html2canvas = (await import('html2canvas')).default
          const canvas = await html2canvas(cardEl, {
            backgroundColor: '#0f1a3a',
            scale: 2,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: -window.scrollY,
          })

          const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/png')
          )

          if (blob) {
            const file = new File([blob], 'guesso-result.png', { type: 'image/png' })
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], text, url })
              return
            }
          }
        } catch (e) {
          console.warn('[share] 画像キャプチャ失敗、テキストのみでシェア:', e)
        }
      }

      if (navigator.share) {
        try { await navigator.share({ title: 'GUESSO', text, url }) } catch { /* キャンセル */ }
      } else {
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
        {/* ヘッダー */}
        <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-black tracking-widest text-white/30 uppercase">GUESSO</span>
          <span className="text-xs text-white/30">ラウンド {room.current_round}</span>
        </div>

        {/* テーマ・出題者 */}
        <div className="px-5 py-3 border-b border-white/10">
          <p className="text-base font-black text-white">{theme?.emoji} {theme?.title}</p>
          <p className="text-white/40 text-xs mt-0.5">
            出題者: <span className="text-yellow-400 font-bold">{asker?.name}</span>
          </p>
        </div>

        {/* 理解者・最下位 */}
        {!allTied && (topScorers.length > 0 || bottomScorers.length > 0) && (
          <div className="px-5 py-3 border-b border-white/10 space-y-2">
            {topScorers[0] && (() => {
              const p = players.find(pl => pl.id === topScorers[0].player_id)
              const gc = guiCounts?.[topScorers[0].player_id] ?? 0
              return (
                <div className="flex items-center gap-3">
                  <span className="text-lg shrink-0">🏆</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-yellow-300 font-black text-sm truncate">{p?.name}</p>
                    <p className="text-white/40 text-xs">一番の理解者 · {topScorers[0].correct}/{maxRoundScore}問正解</p>
                  </div>
                  {guiMode && gc > 0 && <span className="text-xs text-amber-400 font-bold shrink-0">🍺×{gc}</span>}
                </div>
              )
            })()}
            {bottomScorers[0] && (() => {
              const p = players.find(pl => pl.id === bottomScorers[0].player_id)
              const gc = guiCounts?.[bottomScorers[0].player_id] ?? 0
              return (
                <div className="flex items-center gap-3">
                  <span className="text-lg shrink-0">💀</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 font-bold text-sm truncate">{p?.name}</p>
                    <p className="text-white/30 text-xs">最下位 · {bottomScorers[0].correct}/{maxRoundScore}問正解</p>
                  </div>
                  {guiMode && gc > 0 && <span className="text-xs text-amber-400 font-bold shrink-0">🍺×{gc}</span>}
                </div>
              )
            })()}
          </div>
        )}

        {/* 正解ランキング上位3位 */}
        {ranking && (
          <div className="px-5 py-3 border-b border-white/10">
            <div className="space-y-1.5">
              {ranking.slice(0, 3).map((id, idx) => {
                if (!id) return null
                const info = getInfo(id)
                const rank = idx + 1
                return (
                  <div key={idx} className={`flex items-center gap-2 rounded-xl px-3 py-1.5
                    ${rank === 1 ? 'bg-yellow-400/15 border border-yellow-400/30' : 'bg-white/5'}`}
                  >
                    <span className="text-sm font-black w-5 text-center text-white/60">
                      {RANK_MEDAL[rank] ?? rank}
                    </span>
                    {info.emoji
                      ? <span className="text-base">{info.emoji}</span>
                      : <span className="text-base">{isPersonRank ? '🧑' : ''}</span>
                    }
                    <span className={`text-sm font-semibold flex-1 ${rank === 1 ? 'text-yellow-300' : 'text-white/80'}`}>
                      {info.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA フッター */}
        <div className="px-5 py-3 text-center">
          <p className="text-white/60 text-xs font-bold mb-0.5">友達の本音、知ってる？</p>
          <p className="text-white/20 text-xs">guesso-app.vercel.app</p>
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
                    <span className="text-gray-400 ml-1">({s.correct}/{maxRoundScore}点)</span>
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
                    <span className="text-gray-400 ml-1">({s.correct}/{maxRoundScore}点)</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===== グイ数ランキング ===== */}
      {guiMode && guiCounts && Object.keys(guiCounts).length > 0 && (() => {
        const guiRanking = Object.entries(guiCounts)
          .sort((a, b) => b[1] - a[1])
        return (
          <div className="glass rounded-2xl p-4 mb-4 animate-fade-in">
            <p className="text-gray-500 text-xs font-bold mb-2">🍺 今回のグイ数ランキング</p>
            <div className="space-y-2">
              {guiRanking.map(([pid, count], i) => {
                const p = players.find(pl => pl.id === pid)
                const isAsker = pid === room.asker_player_id
                return (
                  <div key={pid} className="flex items-center gap-3">
                    <span className="text-sm w-5 text-center">{i === 0 ? '🥇' : `${i + 1}.`}</span>
                    <span className="font-semibold flex-1 text-sm text-gray-800 truncate">{p?.name}</span>
                    {isAsker && <span className="text-xs text-yellow-600 font-bold">全員正解</span>}
                    <span className="font-black text-amber-600">{count}杯 🍺</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ===== ボタン ===== */}
      <div className="space-y-3 mt-auto">
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
