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

          // カードのinnerHTMLを完全に独立した新しいdivにコピーしてキャプチャ
          // → 元のDOMツリー（祖先のpadding/flex/scroll等）から切り離すことでズレを防ぐ
          // ※ カード内は全てinlineスタイルなのでinnerHTMLコピーで見た目が完全再現される
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
            // レイアウト確定を待つ
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

          // 正確に 1080×1920 (360*3 × 640*3) にクロップ
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

      {/* ===== シェアカード（9:16 ストーリーサイズ・白背景） ===== */}
      <div
        id="share-card"
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
                <span style={{
                  fontSize: '30px',
                  fontWeight: 900,
                  color: '#7c3aed',
                  lineHeight: 1.1,
                }}>GUESSO</span>
                <span style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 700, marginLeft: '4px' }}>（ゲッソ）</span>
              </div>
              <span style={{ fontSize: '11px', color: '#374151', fontWeight: 600 }}>ラウンド {room.current_round}</span>
            </div>
            <p style={{ fontSize: '11px', color: '#374151', marginTop: '2px', lineHeight: 1.4 }}>
              友達の本音・価値観を予想するパーティゲーム
            </p>
          </div>

          {/* テーマ・出題者 */}
          <div style={{
            background: 'linear-gradient(135deg, #f5f3ff, #fdf2f8)',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '14px',
          }}>
            <p style={{ fontSize: '17px', fontWeight: 900, color: '#1f2937', lineHeight: 1.3 }}>
              {theme?.emoji} {theme?.title}
            </p>
            <p style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
              出題者：<span style={{ color: '#7c3aed', fontWeight: 700 }}>{asker?.name}</span>
            </p>
          </div>

          {/* 理解者・最下位 */}
          {!allTied && (topScorers.length > 0 || bottomScorers.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
              {topScorers[0] && (() => {
                const p = players.find(pl => pl.id === topScorers[0].player_id)
                const gc = guiCounts?.[topScorers[0].player_id] ?? 0
                return (
                  <div style={{
                    background: 'linear-gradient(135deg, #fef9c3, #fef3c7)',
                    border: '2px solid #fbbf24',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <span style={{ fontSize: '24px', lineHeight: 1 }}>🏆</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '16px', fontWeight: 900, color: '#92400e', lineHeight: 1.3 }}>{p?.name}</p>
                      <p style={{ fontSize: '11px', color: '#b45309', marginTop: '2px', lineHeight: 1.3 }}>
                        {asker?.name}の一番の理解者！ · {topScorers[0].correct}/{maxRoundScore}問
                      </p>
                    </div>
                    {guiMode && gc > 0 && (
                      <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 700 }}>🍺×{gc}</span>
                    )}
                  </div>
                )
              })()}
              {bottomScorers[0] && (() => {
                const p = players.find(pl => pl.id === bottomScorers[0].player_id)
                const gc = guiCounts?.[bottomScorers[0].player_id] ?? 0
                return (
                  <div style={{
                    background: '#f9fafb',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <span style={{ fontSize: '24px', lineHeight: 1 }}>💦</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#4b5563', lineHeight: 1.3 }}>{p?.name}</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', lineHeight: 1.3 }}>
                        {asker?.name}の謎がまだ解けてない...
                      </p>
                    </div>
                    {guiMode && gc > 0 && (
                      <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 700 }}>🍺×{gc}</span>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* 価値観ランキング */}
          {ranking && (
            <div style={{
              background: '#f9fafb',
              borderRadius: '16px',
              padding: '10px 12px',
              marginBottom: '10px',
            }}>
              <p style={{ fontSize: '11px', color: '#374151', fontWeight: 700, marginBottom: '6px' }}>
                {asker?.name}の価値観ランキング
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {ranking.filter(id => id !== null).map((id, idx) => {
                  if (!id) return null
                  const info = getInfo(id)
                  const rank = idx + 1
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: rank === 1 ? '#fef9c3' : '#ffffff',
                      borderRadius: '8px',
                      padding: '5px 8px',
                      border: rank === 1 ? '1px solid #fbbf24' : '1px solid #f3f4f6',
                    }}>
                      <span style={{ fontSize: '14px', width: '20px', textAlign: 'center', lineHeight: 1 }}>
                        {RANK_MEDAL[rank] ?? String(rank)}
                      </span>
                      {info.emoji && <span style={{ fontSize: '14px', lineHeight: 1 }}>{info.emoji}</span>}
                      {!info.emoji && isPersonRank && <span style={{ fontSize: '14px', lineHeight: 1 }}>🧑</span>}
                      <span style={{
                        fontSize: '12px',
                        fontWeight: rank === 1 ? 800 : 600,
                        color: rank === 1 ? '#92400e' : '#374151',
                        lineHeight: 1.2,
                      }}>{info.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* CTA フッター */}
          <div style={{ marginTop: 'auto', textAlign: 'center', paddingTop: '6px' }}>
            <p style={{
              fontSize: '13px',
              fontWeight: 900,
              color: '#7c3aed',
              marginBottom: '2px',
              lineHeight: 1.4,
            }}>友達の本音、知ってる？</p>
            <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.3 }}>guesso-app.vercel.app</p>
          </div>
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
