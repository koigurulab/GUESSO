'use client'

import { useState } from 'react'
import { getThemeItem } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

export default function GuessingScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, theme, round, guess_count, my_guess } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false
  const isAsker = room.asker_player_id === playerId
  const asker = players.find(p => p.id === room.asker_player_id)
  const currentRank = room.current_guess_rank ?? 1

  const revealedItems = new Set(
    (round?.ranking_json ?? []).filter((id): id is string => id !== null)
  )
  const availableChoices = theme?.items.filter(i => !revealedItems.has(i.id)) ?? []

  const revealedRanks = (round?.ranking_json ?? [])
    .map((itemId, idx) => itemId ? { rank: idx + 1, itemId } : null)
    .filter((r): r is { rank: number; itemId: string } => r !== null)

  const [selected, setSelected] = useState<string>(my_guess ?? '')
  const [submitted, setSubmitted] = useState(!!my_guess)
  const [submitting, setSubmitting] = useState(false)

  const guesserCount = players.filter(p => p.id !== room.asker_player_id).length

  const handleConfirm = async () => {
    if (!selected || submitting || submitted) return
    setSubmitting(true)
    const ok = await onAction('submit-guess', { guess_top1: selected })
    if (ok) setSubmitted(true)
    setSubmitting(false)
  }

  if (isAsker) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-4">🙈</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">あなたは出題者！</h2>
          <p className="text-gray-600">みんなが{currentRank}位を予想してるよ...</p>
          <div className="mt-6 glass rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-gray-900">{guess_count}</p>
            <p className="text-gray-500 text-sm">/{guesserCount}人 予想済み</p>
          </div>
          {isHost && (
            <button
              onClick={() => onAction('close-guess')}
              className="mt-6 btn-primary text-lg px-8"
            >
              🔔 締め切る
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="text-center mb-5 animate-fade-in">
        <p className="text-gray-500 text-xs mb-1">
          ラウンド {room.current_round} · {asker?.name} さんの価値観
        </p>
        <h2 className="text-xl font-black gradient-text">{currentRank}位を予想しよう！</h2>
      </div>

      {/* 公開済みランク（ヒント） */}
      {revealedRanks.length > 0 && (
        <div className="glass rounded-2xl px-4 py-3 mb-5 animate-slide-up">
          <p className="text-gray-500 text-xs mb-2">公開済みの順位</p>
          <div className="flex flex-wrap gap-2">
            {revealedRanks.map(({ rank, itemId }) => {
              const item = theme ? getThemeItem(theme.id, itemId) : null
              return (
                <div key={rank} className="flex items-center gap-1.5 glass rounded-xl px-3 py-1.5">
                  <span className="text-xs text-gray-500 font-bold">{rank}位</span>
                  <span>{item?.emoji}</span>
                  <span className="text-sm font-semibold text-gray-800">{item?.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 既に送信済みの場合 */}
      {submitted && my_guess ? (
        <div className="flex-1 flex flex-col items-center justify-center animate-bounce-in">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-xl font-bold text-gray-900">予想送信ずみ！</p>
          {theme && (
            <div className="mt-4 glass rounded-2xl px-6 py-4 text-center">
              <p className="text-gray-500 text-xs mb-1">あなたの{currentRank}位予想</p>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-3xl">
                  {getThemeItem(theme.id, my_guess)?.emoji}
                </span>
                <span className="text-xl font-bold text-gray-900">
                  {getThemeItem(theme.id, my_guess)?.label}
                </span>
              </div>
            </div>
          )}
          <p className="text-gray-500 text-sm mt-4">みんなの結果を待ってます...</p>
          <div className="mt-3 glass rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-black text-gray-900">{guess_count}</p>
            <p className="text-gray-500 text-sm">/{guesserCount}人 予想済み</p>
          </div>
          {isHost && (
            <button
              onClick={() => onAction('close-guess')}
              className="mt-6 btn-primary text-lg px-8"
            >
              🔔 締め切る
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-gray-600 text-sm text-center mb-3">
            {asker?.name} さんが{currentRank}位に選んだものは？
          </p>
          <div className="grid grid-cols-2 gap-3 animate-slide-up">
            {availableChoices.map(item => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                disabled={submitting}
                className={`
                  glass rounded-3xl p-5 flex flex-col items-center gap-2
                  active:scale-95 transition-all
                  ${selected === item.id ? 'ring-2 ring-violet-500 glass-strong' : ''}
                `}
              >
                <span className="text-5xl">{item.emoji}</span>
                <span className="font-bold text-sm text-gray-900">{item.label}</span>
              </button>
            ))}
          </div>

          {/* 送信ボタン */}
          <div className="mt-4 space-y-3">
            {selected && theme && (
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
              >
                {submitting ? '送信中...' : (
                  <>
                    <span>{getThemeItem(theme.id, selected)?.emoji}</span>
                    <span>「{getThemeItem(theme.id, selected)?.label}」で送信</span>
                  </>
                )}
              </button>
            )}
            {isHost && (
              <button
                onClick={() => onAction('close-guess')}
                className="btn-secondary w-full"
              >
                🔔 今すぐ締め切る
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
