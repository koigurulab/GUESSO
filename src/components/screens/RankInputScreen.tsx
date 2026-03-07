'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RoomStateResponse, ThemeItem } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

function SortableItem({
  item,
  rank,
  disabled,
}: {
  item: ThemeItem
  rank: number
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  }

  const rankColor =
    rank === 1 ? 'text-yellow-500' :
    rank === 2 ? 'text-gray-500' :
    rank === 3 ? 'text-amber-600' :
    rank === 4 ? 'ring-2 ring-pink-400/60 text-pink-600' :
    'text-gray-500'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        glass rounded-2xl px-4 py-3 flex items-center gap-3
        ${isDragging ? 'shadow-xl shadow-purple-300/50 scale-105' : ''}
        ${disabled ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'}
        transition-shadow
      `}
    >
      <span className={`text-xl font-black w-8 text-center ${rankColor}`}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
      </span>
      {item.emoji && <span className="text-3xl">{item.emoji}</span>}
      <span className="font-bold flex-1 text-lg text-gray-900">{item.label}</span>
      {!disabled && <span className="text-gray-400 text-xl">⠿</span>}
    </div>
  )
}

export default function RankInputScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, theme, round } = gameState
  const isAsker = room.asker_player_id === playerId
  const asker = players.find(p => p.id === room.asker_player_id)
  const isPersonRank = round?.is_person_rank ?? false

  // 人ランキングの場合: target_player_ids からアイテムを構築
  // 通常の場合: theme.items を使用
  const buildItems = (): ThemeItem[] => {
    if (isPersonRank && round?.target_player_ids) {
      return round.target_player_ids
        .map(id => {
          const p = players.find(pl => pl.id === id)
          return p ? { id: p.id, emoji: '', label: p.name } : null
        })
        .filter((x): x is ThemeItem => x !== null)
    }
    return theme?.items ?? []
  }

  const [items, setItems] = useState<ThemeItem[]>(buildItems())
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const N = items.length
  // ヒント位置: 人ランキングN>=5なら3位（index 2）、通常なら4位（index 3）、人ランキングN<5はなし
  const hintIndex = isPersonRank ? (N >= 5 ? 2 : -1) : 3

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIdx = prev.findIndex(i => i.id === active.id)
        const newIdx = prev.findIndex(i => i.id === over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    const ok = await onAction('submit-ranking', { ranking: items.map(i => i.id) })
    if (ok) setConfirmed(true)
    setSubmitting(false)
  }

  if (!isAsker) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center animate-bounce-in">
          <div className="text-6xl mb-4">🤔</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            {asker?.name} さんが
          </h2>
          <p className="text-gray-600 text-lg">
            {isPersonRank ? '正直にランク付け中...' : 'ランキングを入力中...'}
          </p>
          {isPersonRank && (
            <p className="text-gray-400 text-sm mt-1">あなたは何位？</p>
          )}
          <div className="mt-6 flex gap-1 justify-center">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          {theme && !isPersonRank && (
            <div className="mt-6 glass rounded-2xl p-4">
              <p className="text-gray-500 text-xs mb-2">テーマ: {theme.title} {theme.emoji}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {theme.items.map(item => (
                  <span key={item.id} className="text-lg">{item.emoji}</span>
                ))}
              </div>
            </div>
          )}
          {isPersonRank && round?.target_player_ids && (
            <div className="mt-6 glass rounded-2xl p-4">
              <p className="text-gray-500 text-xs mb-2">テーマ: {theme?.emoji} {theme?.title}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {round.target_player_ids.map(id => {
                  const p = players.find(pl => pl.id === id)
                  return p ? (
                    <span key={id} className="text-xs glass rounded-xl px-2 py-1 text-gray-700">
                      {p.name}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="text-center mb-5 animate-fade-in">
        <div className="text-3xl mb-1">{theme?.emoji}</div>
        <h2 className="text-xl font-black gradient-text">{theme?.title}</h2>
        <p className="text-gray-500 text-sm mt-1">
          {isPersonRank ? '正直な気持ちで並べよう' : 'あなたにとって大切な順に並べよう'}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          {isPersonRank ? '1位 = 最もそう思う人　／　最下位 = 最もそう思わない人' : '↑ 1位が一番 ↓'}
        </p>
      </div>

      {confirmed ? (
        <div className="flex-1 flex flex-col items-center justify-center animate-bounce-in">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-xl font-bold text-gray-900">ランキング確定！</p>
          <p className="text-gray-500 text-sm mt-2">ホストが公開を待ってるよ</p>
          <div className="mt-6 space-y-2 w-full max-w-sm">
            {items.map((item, idx) => (
              <div key={item.id} className="glass rounded-2xl px-4 py-2 flex items-center gap-3">
                <span className="text-sm font-bold text-gray-500 w-6 text-center">{idx + 1}</span>
                {item.emoji && <span className="text-2xl">{item.emoji}</span>}
                <span className="font-semibold text-gray-900">{item.label}</span>
                {idx === hintIndex && hintIndex >= 0 && (
                  <span className="ml-auto text-xs text-pink-600 font-bold">
                    {hintIndex + 1}位（公開）
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 flex-1">
                {items.map((item, idx) => (
                  <SortableItem key={item.id} item={item} rank={idx + 1} disabled={submitting} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {hintIndex >= 0 && (
            <div className="mt-5 glass rounded-3xl p-4 mb-4 text-center">
              <p className="text-gray-600 text-xs">
                📌 確定後、{hintIndex + 1}位の{' '}
                <strong className="text-pink-600">
                  {items[hintIndex]?.emoji}{items[hintIndex]?.label}
                </strong>{' '}
                がヒントとして公開される。その後みんながあなたのランキングを当てにくるよ！
              </p>
            </div>
          )}

          {hintIndex < 0 && isPersonRank && (
            <div className="mt-5 glass rounded-3xl p-4 mb-4 text-center">
              <p className="text-gray-600 text-xs">
                📌 ヒントなし！確定後すぐにみんながあなたのランキングを当てにくるよ
              </p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full text-xl py-4"
          >
            {submitting ? '送信中...' : '✅ これで確定！'}
          </button>
        </>
      )}
    </div>
  )
}
