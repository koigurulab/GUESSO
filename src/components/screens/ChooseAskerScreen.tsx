'use client'

import { useState } from 'react'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

export default function ChooseAskerScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, theme } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false
  const [guiMode, setGuiMode] = useState(false)

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8">
      <div className="text-center mb-6 animate-fade-in">
        <div className="text-4xl mb-2">{theme?.emoji ?? '🎯'}</div>
        <p className="text-gray-500 text-xs mb-1">ラウンド {room.current_round} · {theme?.title}</p>
        <h2 className="text-2xl font-black text-gray-900">出題者を指名！</h2>
        <p className="text-gray-500 text-sm mt-1">誰の価値観を当てる？</p>
      </div>

      {/* 人ランキング: ルール説明パネル */}
      {theme?.is_person_rank && (
        <div className="glass rounded-3xl p-4 mb-5 animate-fade-in">
          <p className="text-center font-black text-gray-800 text-sm mb-3">👥 人ランキングの遊び方</p>
          <div className="space-y-2.5">
            {[
              { step: '①', text: <>出題者が <strong>3〜7人</strong> を選んでこっそりランク付け</> },
              { step: '②', text: <>3位だけ全員に公開（ヒント！）</> },
              { step: '③', text: <>出題者が <strong>誰を何位にしたか</strong> をみんなで当てにいく！</> },
              { step: '④', text: <>外したらグイ 🍺（グイモードをONにすると発動）</> },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span className="text-purple-500 font-black shrink-0">{step}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 通常テーマ: アイテムプレビュー */}
      {theme && !theme.is_person_rank && (
        <div className="glass rounded-3xl p-4 mb-5 animate-fade-in">
          <p className="text-gray-500 text-xs mb-2 text-center">このテーマのアイテム</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {theme.items.map(item => (
              <span key={item.id} className="glass rounded-xl px-3 py-1.5 text-sm text-gray-700">
                {item.emoji} {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* グイモードトグル（ホストのみ） */}
      {isHost && (
        <button
          onClick={() => setGuiMode(prev => !prev)}
          className={`w-full rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 transition-all active:scale-95
            ${guiMode ? 'bg-amber-50 border-2 border-amber-400' : 'glass border-2 border-transparent'}`}
        >
          <span className="text-2xl">🍺</span>
          <div className="flex-1 text-left">
            <p className={`font-black text-sm ${guiMode ? 'text-amber-700' : 'text-gray-600'}`}>
              グイモード {guiMode ? 'ON' : 'OFF'}
            </p>
            <p className="text-xs text-gray-400">外した人はお酒を一杯！</p>
          </div>
          <div className={`w-11 h-6 rounded-full transition-all ${guiMode ? 'bg-amber-400' : 'bg-gray-200'}`}>
            <div className={`w-5 h-5 bg-white rounded-full mt-0.5 shadow transition-all ${guiMode ? 'ml-5' : 'ml-0.5'}`} />
          </div>
        </button>
      )}

      {/* Player list */}
      <div className="space-y-2 flex-1 animate-slide-up">
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => isHost && onAction('select-asker', { asker_player_id: p.id, gui_mode: guiMode })}
            disabled={!isHost}
            className={`
              w-full glass rounded-2xl px-5 py-4 flex items-center gap-3
              transition-all
              ${isHost ? 'active:scale-95 hover:glass-strong cursor-pointer' : 'cursor-default'}
            `}
          >
            <span className="text-2xl">{p.is_host ? '👑' : '😊'}</span>
            <span className="font-bold flex-1 text-left text-gray-900">
              {p.name}
              {p.id === playerId && <span className="text-gray-400 text-xs ml-2">（あなた）</span>}
            </span>
            {isHost && (
              <span className="text-pink-500 text-sm font-bold">
                指名 →
              </span>
            )}
          </button>
        ))}
      </div>

      {isHost ? (
        <div className="mt-4">
          <button
            onClick={() => onAction('back-to-theme')}
            className="w-full glass rounded-2xl py-3 text-sm text-gray-500 font-semibold active:scale-95 transition-all"
          >
            ← テーマを変える
          </button>
        </div>
      ) : (
        <div className="mt-4 glass rounded-2xl py-4 text-center">
          <p className="text-gray-500 text-sm">⏳ ホストが出題者を選んでいます...</p>
        </div>
      )}
    </div>
  )
}
