'use client'

import { useState } from 'react'
import type { RoomStateResponse } from '@/lib/types'

interface Props {
  gameState: RoomStateResponse
  playerId: string
  roomCode: string
  onAction: (action: string, params?: Record<string, unknown>) => Promise<boolean>
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function EndGameScreen({ gameState, playerId, onAction }: Props) {
  const { room, players, scores } = gameState
  const isHost = players.find(p => p.id === playerId)?.is_host ?? false
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const sortedScores = [...(scores ?? [])].sort((a, b) => b.total - a.total)
  const maxTotal = Math.max(...sortedScores.map(s => s.total), 1)
  const winner = players.find(p => p.id === sortedScores[0]?.player_id)

  const buildShareText = () => {
    const ranking = sortedScores
      .slice(0, 3)
      .map((s, i) => {
        const p = players.find(pl => pl.id === s.player_id)
        return `${['🥇', '🥈', '🥉'][i]} ${p?.name ?? '?'} (${s.total}点)`
      })
      .join('\n')

    return [
      `🎮 GUESSOで${room.current_round}ラウンド遊んだ結果！`,
      '',
      ranking,
      '',
      '友達の本音、知ってる？',
      '▶ https://guesso-app.vercel.app',
      '#GUESSO',
    ].join('\n')
  }

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)

    const text = buildShareText()
    const url = 'https://guesso-app.vercel.app'

    try {
      const cardEl = document.getElementById('end-share-card')
      if (cardEl && typeof navigator !== 'undefined' && navigator.share) {
        try {
          const html2canvas = (await import('html2canvas')).default

          const wrapper = document.createElement('div')
          wrapper.style.cssText = [
            'position:fixed', 'top:0', 'left:0',
            'width:360px', 'height:640px',
            'background:#ffffff', 'border-radius:24px',
            'overflow:hidden', 'display:flex', 'flex-direction:column',
            'z-index:99999', 'pointer-events:none',
          ].join(';')
          wrapper.innerHTML = cardEl.innerHTML
          document.body.appendChild(wrapper)

          let rawCanvas: HTMLCanvasElement | null = null
          try {
            await new Promise(r => requestAnimationFrame(r))
            rawCanvas = await html2canvas(wrapper, {
              backgroundColor: '#ffffff',
              scale: 3,
              useCORS: true,
              logging: false,
              scrollX: 0,
              scrollY: 0,
            })
          } finally {
            document.body.removeChild(wrapper)
          }

          if (!rawCanvas) throw new Error('capture failed')

          const targetW = 360 * 3
          const targetH = 640 * 3
          const croppedCanvas = document.createElement('canvas')
          croppedCanvas.width = targetW
          croppedCanvas.height = targetH
          const ctx = croppedCanvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, targetW, targetH)
            ctx.drawImage(rawCanvas, 0, 0)
          }

          const blob = await new Promise<Blob | null>(resolve =>
            (ctx ? croppedCanvas : rawCanvas!).toBlob(resolve, 'image/png')
          )

          if (blob) {
            const file = new File([blob], 'guesso-result.png', { type: 'image/png' })
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], text, url })
              return
            }
          }
        } catch (e) {
          console.warn('[share] 画像キャプチャ失敗:', e)
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

      {/* ===== シェアカード ===== */}
      <div
        id="end-share-card"
        className="mb-4 animate-fade-in mx-auto"
        style={{
          width: '360px',
          height: '640px',
          background: '#ffffff',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 上部カラーバー */}
        <div style={{ height: '8px', background: 'linear-gradient(90deg, #7c3aed, #db2777, #f59e0b)', flexShrink: 0 }} />

        {/* メインコンテンツ */}
        <div style={{ padding: '24px 24px 20px', display: 'flex', flexDirection: 'column', height: '632px', boxSizing: 'border-box' }}>

          {/* GUESSO ブランディング */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '30px', fontWeight: 900, color: '#7c3aed', lineHeight: 1.1 }}>GUESSO</span>
                <span style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 700, marginLeft: '4px' }}>（ゲッソ）</span>
              </div>
              <span style={{ fontSize: '11px', color: '#374151', fontWeight: 600 }}>{room.current_round}ラウンド 最終結果</span>
            </div>
            <p style={{ fontSize: '11px', color: '#374151', marginTop: '2px', lineHeight: 1.4 }}>
              友達の本音・価値観を予想するパーティゲーム
            </p>
          </div>

          {/* 優勝者バナー */}
          {winner && (
            <div style={{
              background: 'linear-gradient(135deg, #fef9c3, #fef3c7)',
              border: '2px solid #fbbf24',
              borderRadius: '16px',
              padding: '14px 16px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{ fontSize: '36px', lineHeight: 1 }}>🏆</span>
              <div>
                <p style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, marginBottom: '2px' }}>今日の飲み会チャンピオン！</p>
                <p style={{ fontSize: '22px', fontWeight: 900, color: '#92400e', lineHeight: 1.2 }}>{winner.name}</p>
                <p style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>
                  {sortedScores[0]?.total}点 / {room.current_round}ラウンド
                </p>
              </div>
            </div>
          )}

          {/* 最終スコアランキング */}
          <div style={{
            background: '#f9fafb',
            borderRadius: '16px',
            padding: '10px 12px',
            flex: 1,
            overflow: 'hidden',
          }}>
            <p style={{ fontSize: '11px', color: '#374151', fontWeight: 700, marginBottom: '8px' }}>
              最終スコアランキング
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sortedScores.map((s, i) => {
                const p = players.find(pl => pl.id === s.player_id)
                const barWidth = maxTotal > 0 ? Math.round((s.total / maxTotal) * 100) : 0
                return (
                  <div key={s.player_id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', width: '22px', textAlign: 'center', lineHeight: 1 }}>
                      {RANK_MEDAL[i + 1] ?? `${i + 1}.`}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '12px', fontWeight: i === 0 ? 800 : 600, color: i === 0 ? '#92400e' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p?.name ?? '?'}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: i === 0 ? '#d97706' : '#6b7280', marginLeft: '4px', flexShrink: 0 }}>
                          {s.total}点
                        </span>
                      </div>
                      <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${barWidth}%`,
                          background: i === 0 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : '#a78bfa',
                          borderRadius: '3px',
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CTA フッター */}
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', fontWeight: 900, color: '#7c3aed', marginBottom: '2px', lineHeight: 1.4 }}>
              友達の本音、知ってる？
            </p>
            <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.3 }}>guesso-app.vercel.app</p>
          </div>
        </div>
      </div>

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
              <span>今日の飲み会結果をLINEで共有</span>
            </>
          )}
        </button>

        {isHost ? (
          <button
            onClick={() => onAction('new-game')}
            className="btn-primary w-full text-xl py-4"
          >
            🎮 同じメンバーでもう一回！
          </button>
        ) : (
          <div className="glass rounded-2xl py-3 text-center">
            <p className="text-gray-500 text-sm">⏳ ホストが次の操作を選んでいます</p>
          </div>
        )}
      </div>
    </div>
  )
}
