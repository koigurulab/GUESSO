'use client'

import { getThemeItem } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

function calcMostGuessed(guesses: Array<{ guess_top1: string }> | null) {
  if (!guesses || guesses.length === 0) return null
  const counts: Record<string, number> = {}
  guesses.forEach(g => { counts[g.guess_top1] = (counts[g.guess_top1] ?? 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
}

export default function ResultScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, theme, round, guesses, my_guess } = gameState
  const isAsker = room.asker_player_id === playerId
  const guiMode = room.gui_mode
  const asker = players.find(p => p.id === round?.asker_player_id)
  const ranking = round?.ranking_json
  const currentRank = room.current_guess_rank ?? 1
  const isPersonRank = round?.is_person_rank ?? false

  // 人ランキング対象プレイヤーID一覧
  const targetPlayerIds = round?.target_player_ids ?? null

  // ランク配列（DBから取得 or 通常テーマのデフォルト）
  const rankSeq = round?.rank_sequence ?? [1, 2, 3, 5, 6]
  const currentRankIdx = rankSeq.indexOf(currentRank)
  const nextRank = currentRankIdx < rankSeq.length - 1 ? rankSeq[currentRankIdx + 1] : null
  const isFinalRank = nextRank === null

  const correctAnswer = ranking?.[currentRank - 1] ?? null
  const myCorrect = my_guess !== null && my_guess === correctAnswer

  const mostGuessed = calcMostGuessed(guesses)

  // IDからラベル情報を取得（人ランキングか通常かで分岐）
  const getInfo = (id: string): { emoji?: string; label: string } => {
    if (isPersonRank) {
      const p = players.find(pl => pl.id === id)
      return { label: p?.name ?? id }
    }
    const item = theme ? getThemeItem(theme.id, id) : null
    return { emoji: item?.emoji, label: item?.label ?? id }
  }

  // ヒント位置のインデックス: 人ランキングN>=5なら2(3位), 通常なら3(4位), 人ランキングN<5はなし
  const N = isPersonRank ? (targetPlayerIds?.length ?? 0) : 7
  const hintIndex = isPersonRank ? (N >= 5 ? 2 : -1) : 3

  if (!ranking) {
    return <div className="min-h-dvh flex items-center justify-center">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="text-center mb-5 animate-fade-in">
        <p className="text-gray-500 text-xs mb-1">ラウンド {room.current_round}</p>
        <h2 className="text-2xl font-black gradient-text">
          {isFinalRank ? '全ランキング公開！' : `${currentRank}位の結果！`}
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          {asker?.name} さんの {theme?.title} {theme?.emoji} ランキング
        </p>
      </div>

      {/* ランキング */}
      <div className="space-y-2 mb-5 animate-slide-up">
        {ranking.map((id, idx) => {
          const rank = idx + 1
          const isRevealed = id !== null
          const info = (isRevealed && id) ? getInfo(id) : null
          const isCurrentRank = rank === currentRank
          const isTop = rank === 1
          const isHint = idx === hintIndex && hintIndex >= 0

          return (
            <div
              key={idx}
              className={`
                flex items-center gap-3 rounded-2xl px-4 py-3
                ${isCurrentRank ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300' :
                  isTop && isRevealed ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200' :
                  isHint && isRevealed ? 'glass ring-1 ring-pink-300' :
                  isRevealed ? 'glass' :
                  'glass opacity-40'}
                animate-bounce-in
              `}
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              <span className="text-xl font-black w-8 text-center">
                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
              </span>
              {info?.emoji ? (
                <span className="text-3xl">{info.emoji}</span>
              ) : (
                <span className="text-3xl">{isRevealed ? (isPersonRank ? '🧑' : '❓') : '❓'}</span>
              )}
              <span className={`font-bold flex-1 text-lg ${isCurrentRank ? 'text-yellow-700' : !isRevealed ? 'text-gray-400' : 'text-gray-900'}`}>
                {isRevealed ? info?.label : '???'}
              </span>
              {isHint && isRevealed && <span className="text-xs text-pink-600 glass px-2 py-1 rounded-lg font-bold">公開済み</span>}
              {isCurrentRank && <span className="text-yellow-500">★</span>}
            </div>
          )
        })}
      </div>

      {/* 自分の正誤 */}
      {my_guess && room.asker_player_id !== playerId && (
        <div className={`
          rounded-3xl p-4 text-center mb-4 animate-bounce-in
          ${myCorrect
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300'
            : 'glass border border-purple-100'}
        `}>
          {myCorrect ? (
            <>
              <p className="text-2xl font-black text-green-600">👑 正解！</p>
              <p className="text-gray-600 text-sm">{currentRank}位を当てました！</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-600">残念... 不正解</p>
              <p className="text-gray-500 text-sm">
                あなたの予想: {(() => {
                  const info = getInfo(my_guess)
                  return `${info.emoji ?? (isPersonRank ? '🧑' : '')} ${info.label}`
                })()}
              </p>
            </>
          )}
        </div>
      )}

      {/* 全員の予想 */}
      {guesses && guesses.length > 0 && (
        <div className="glass rounded-3xl p-4 mb-4 animate-fade-in">
          <p className="text-gray-500 text-xs mb-3">みんなの{currentRank}位予想</p>
          <div className="space-y-2">
            {guesses.map(g => {
              const p = players.find(pl => pl.id === g.player_id)
              const info = getInfo(g.guess_top1)
              const correct = g.guess_top1 === correctAnswer
              return (
                <div key={g.player_id} className="flex items-center gap-3">
                  <span className="text-xl">{correct ? '👑' : '😅'}</span>
                  <span className="font-semibold flex-1 text-sm text-gray-900">{p?.name}</span>
                  <span className={`text-sm ${correct ? 'text-yellow-600 font-bold' : 'text-gray-500'}`}>
                    {info.emoji} {info.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 最多予想 */}
      {mostGuessed && (
        <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 mb-5">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-gray-500 text-xs">最多予想の{currentRank}位</p>
            <p className="font-bold text-gray-900">
              {(() => {
                const info = getInfo(mostGuessed[0])
                return `${info.emoji ?? (isPersonRank ? '🧑' : '')} ${info.label}`
              })()}
              <span className="text-gray-500 text-xs ml-2">({mostGuessed[1]}票)</span>
            </p>
          </div>
        </div>
      )}

      {/* グイモード表示 */}
      {guiMode && guesses && correctAnswer && (() => {
        const wrongGuessers = guesses.filter(g => g.guess_top1 !== correctAnswer)
        const nonAskerGuesses = guesses.filter(g => g.player_id !== room.asker_player_id)
        const allCorrect = nonAskerGuesses.length > 0 && wrongGuessers.length === 0
        const asker = players.find(p => p.id === round?.asker_player_id)

        if (allCorrect) {
          return (
            <div className="rounded-3xl p-4 text-center mb-4 animate-bounce-in bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-400">
              <p className="text-3xl mb-1">🎉🍺🎉</p>
              <p className="text-lg font-black text-amber-700">
                みんな{asker?.name}を理解していた！
              </p>
              <p className="text-amber-600 font-bold">嬉しいのでグイ確定！</p>
            </div>
          )
        }

        if (wrongGuessers.length === 0) return null

        return (
          <div className="rounded-3xl p-4 mb-4 animate-bounce-in bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300">
            <p className="text-center font-black text-red-600 mb-2">🍺 グイ確定！</p>
            <div className="space-y-1">
              {wrongGuessers.map(g => {
                const p = players.find(pl => pl.id === g.player_id)
                const info = getInfo(g.guess_top1)
                return (
                  <div key={g.player_id} className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2">
                    <span className="text-lg">😅</span>
                    <span className="font-bold text-gray-800 flex-1">{p?.name}</span>
                    <span className="text-xs text-gray-500">
                      {info.emoji} {info.label} と予想
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ボタン */}
      <div className="space-y-3">
        {isAsker && !isFinalRank && (
          <button
            onClick={() => onAction('next-rank')}
            className="btn-primary w-full text-xl py-4"
          >
            ▶️ {nextRank}位を予想する
          </button>
        )}
        {isAsker && isFinalRank && (
          <button
            onClick={() => onAction('show-summary')}
            className="btn-primary w-full text-xl py-4"
          >
            🏆 ラウンド結果を見る
          </button>
        )}
        {!isAsker && (
          <div className="glass rounded-2xl py-3 text-center">
            <p className="text-gray-500 text-sm">
              {isFinalRank ? `⏳ ${asker?.name} さんがラウンド結果を表示します` : `⏳ ${asker?.name} さんが${nextRank}位の予想を始めます`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
