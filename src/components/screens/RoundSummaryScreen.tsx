'use client'

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

  // 称号: 今ラウンドのスコアで決定（出題者を除く）
  const nonAskerRoundScores = (round_scores ?? [])
    .filter(s => s.player_id !== room.asker_player_id)
    .sort((a, b) => b.correct - a.correct)

  const topRoundScore = nonAskerRoundScores[0]?.correct ?? 0
  const bottomRoundScore = nonAskerRoundScores[nonAskerRoundScores.length - 1]?.correct ?? 0
  const allTied = topRoundScore === bottomRoundScore && nonAskerRoundScores.length > 1

  const topScorers = allTied ? [] : nonAskerRoundScores.filter(s => s.correct === topRoundScore)
  const bottomScorers = allTied ? [] : nonAskerRoundScores.filter(s => s.correct === bottomRoundScore && s.correct !== topRoundScore)

  // ゲーム通算スコア（表示用・出題者を含む全員）
  const sortedScores = [...(scores ?? [])].sort((a, b) => b.total - a.total)
  const maxTotal = Math.max(...sortedScores.map(s => s.total), 1)

  // Web Share API
  const handleShare = async () => {
    const scoreText = sortedScores
      .map((s, i) => {
        const p = players.find(pl => pl.id === s.player_id)
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '　'
        return `${medal} ${p?.name}: ${s.total}点`
      })
      .join('\n')

    const titleText = topScorers.length > 0
      ? `🏆 ${topScorers.map(s => players.find(p => p.id === s.player_id)?.name).join('・')}が${asker?.name}の一番の理解者！`
      : ''

    const text = [
      `🎮 GUESSO ラウンド${room.current_round}終了！`,
      `${asker?.name}さんの「${theme?.title}」ランキングを予想したよ`,
      '',
      scoreText,
      titleText,
      '',
      `#GUESSO`,
    ].filter(Boolean).join('\n')

    const url = `https://guesso-app.vercel.app`

    if (navigator.share) {
      try { await navigator.share({ title: 'GUESSO', text, url }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      alert('クリップボードにコピーしました！')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-6">

      {/* ===== シェアカード（スクショ用） ===== */}
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
                bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-400/30">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-black text-yellow-300">{p?.name}</p>
                  <p className="text-white/60 text-sm">
                    {asker?.name}の<span className="text-yellow-400 font-bold">一番の理解者</span>！
                    <span className="text-white/40 ml-1">({s.correct}/{5}点)</span>
                  </p>
                </div>
              </div>
            )
          })}
          {bottomScorers.map(s => {
            const p = players.find(pl => pl.id === s.player_id)
            return (
              <div key={s.player_id} className="rounded-2xl px-4 py-3 flex items-center gap-3
                glass border border-white/10">
                <span className="text-2xl">💔</span>
                <div>
                  <p className="font-bold text-white/70">{p?.name}</p>
                  <p className="text-white/50 text-sm">
                    {asker?.name}と
                    <span className="font-semibold text-white/70">もっと仲良くなろう</span>！
                    <span className="text-white/30 ml-1">({s.correct}/{5}点)</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===== ボタン ===== */}
      <div className="space-y-3 mt-auto">
        <button
          onClick={handleShare}
          className="btn-secondary w-full text-base py-3 flex items-center justify-center gap-2"
        >
          <span>📸</span>
          <span>スクショしてシェア</span>
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
            <p className="text-white/40 text-sm">⏳ ホストが次のラウンドを始めます</p>
          </div>
        )}
      </div>
    </div>
  )
}
