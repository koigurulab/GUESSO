'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { RoomStateResponse } from '@/lib/types'
import { trackEvent } from '@/lib/analytics'

import LobbyScreen from '@/components/screens/LobbyScreen'
import ThemeSelectScreen from '@/components/screens/ThemeSelectScreen'
import ChooseAskerScreen from '@/components/screens/ChooseAskerScreen'
import RankInputScreen from '@/components/screens/RankInputScreen'
import RevealMiddleScreen from '@/components/screens/RevealMiddleScreen'
import GuessingScreen from '@/components/screens/GuessingScreen'
import GuessingClosedScreen from '@/components/screens/GuessingClosedScreen'
import ResultScreen from '@/components/screens/ResultScreen'
import RoundSummaryScreen from '@/components/screens/RoundSummaryScreen'

// ── ポーリング間隔（状態ごとに調整）──────────────────────────
const POLL_INTERVALS: Partial<Record<string, number>> = {
  WAITING_PLAYERS: 5000,
  GUESSING_OPEN:   2000,
}
const DEFAULT_POLL_MS = 3000

// last_seen を更新する間隔
const LAST_SEEN_INTERVAL_MS = 30_000

// ポーリング連続失敗してから「接続中...」バナーを出すまでの回数
const OFFLINE_THRESHOLD = 3

interface Props {
  roomCode: string
}

export default function GameRoom({ roomCode }: Props) {
  const router = useRouter()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerName, setPlayerName] = useState<string>('')
  const [gameState, setGameState] = useState<RoomStateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Join form
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  // ── 通知系 state ──────────────────────────────────────────
  /** alert() の代わり: アクションエラーをトーストで表示 */
  const [actionError, setActionError] = useState<string | null>(null)
  /** 連続ポーリング失敗時の「接続中...」バナー */
  const [isOffline, setIsOffline] = useState(false)

  // ── ポーリング制御用 ref ──────────────────────────────────
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const updatedAtRef = useRef<string>('')
  const gameStateRef = useRef<RoomStateResponse | null>(null)
  const lastSeenSentAtRef = useRef<number>(0)
  const prevStateRef = useRef<string | null>(null)
  const pollFailCountRef = useRef<number>(0)
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { gameStateRef.current = gameState }, [gameState])

  // ── ブラウザ戻るボタンでゲームルームを離れないようにする ──────────
  useEffect(() => {
    history.pushState(null, '', window.location.href)
    const handlePopState = () => {
      history.pushState(null, '', window.location.href)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  /** アクションエラートーストを表示（3秒で自動消去） */
  const showActionError = useCallback((msg: string) => {
    setActionError(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setActionError(null), 3000)
  }, [])

  const getPollMs = (): number => {
    const state = gameStateRef.current?.room.state ?? ''
    return POLL_INTERVALS[state] ?? DEFAULT_POLL_MS
  }

  // Load player from localStorage
  useEffect(() => {
    trackEvent('room_page_viewed', { room_code: roomCode })
    const stored = localStorage.getItem(`guesso_${roomCode}`)
    if (stored) {
      try {
        const { playerId: pid, playerName: pname } = JSON.parse(stored)
        setPlayerId(pid)
        setPlayerName(pname)
      } catch {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [roomCode])

  // Fetch state
  const fetchState = useCallback(async (pid?: string) => {
    const id = pid ?? playerId
    if (!id) return

    const now = Date.now()
    let updateSeen = false
    if (now - lastSeenSentAtRef.current >= LAST_SEEN_INTERVAL_MS) {
      updateSeen = true
      lastSeenSentAtRef.current = now
    }

    try {
      const params = new URLSearchParams({ player_id: id })
      if (updatedAtRef.current) params.set('ver', updatedAtRef.current)
      if (updateSeen) params.set('update_seen', '1')

      const res = await fetch(`/api/room/${roomCode}/state?${params}`)
      if (res.status === 404) {
        setError('ルームが見つかりません')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('fetch failed')

      const data = await res.json()

      // 成功 → オフラインフラグをリセット
      pollFailCountRef.current = 0
      setIsOffline(false)

      if ('changed' in data && data.changed === false) {
        setLoading(false)
        return
      }

      const newRoomState = data.room?.state
      if (newRoomState && prevStateRef.current !== newRoomState) {
        trackEvent('game_phase_changed', {
          from_phase: prevStateRef.current ?? 'none',
          to_phase: newRoomState,
          room_code: roomCode,
          round: data.room.current_round ?? 1,
        })
        prevStateRef.current = newRoomState
      }

      if (data.updated_at) updatedAtRef.current = data.updated_at
      setGameState(data)
      setLoading(false)
    } catch (e) {
      console.error('[fetchState]', e)
      // 連続失敗カウントを増やし、閾値を超えたらバナーを表示
      pollFailCountRef.current += 1
      if (pollFailCountRef.current >= OFFLINE_THRESHOLD) {
        setIsOffline(true)
      }
      // ポーリングは引き続き継続（自動復帰）
    }
  }, [roomCode, playerId])

  // アダプティブポーリング（setTimeout チェーン）
  useEffect(() => {
    if (!playerId) return

    let cancelled = false

    const poll = async (isFirst = false) => {
      if (cancelled) return
      await fetchState(isFirst ? playerId : undefined)
      if (!cancelled) {
        pollingRef.current = setTimeout(() => poll(), getPollMs())
      }
    }

    poll(true)

    return () => {
      cancelled = true
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, fetchState])

  // Action handler
  const handleAction = useCallback(async (action: string, params: Record<string, unknown> = {}): Promise<boolean> => {
    if (!playerId) return false

    const doFetch = () => fetch(`/api/room/${roomCode}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, player_id: playerId, ...params }),
    })

    try {
      let res = await doFetch()

      // ネットワーク系エラーではなくAPI側エラーの場合
      if (!res.ok) {
        const data = await res.json()

        // 状態ズレによる競合エラーは静かにリフレッシュして終了
        // （「現在 X 状態のため〜」系メッセージ）
        if (res.status === 400 && typeof data.error === 'string' && data.error.includes('状態のため')) {
          updatedAtRef.current = ''
          await fetchState()
          return false
        }

        showActionError(data.error ?? 'エラーが発生しました')
        return false
      }

      const data = await res.json()
      trackEvent('game_action', {
        action,
        room_code: roomCode,
        ...(typeof params.theme_id === 'string' ? { theme_id: params.theme_id } : {}),
      })
      updatedAtRef.current = ''
      await fetchState()
      return true
    } catch {
      // ネットワークエラー: 1回だけ自動リトライ
      try {
        await new Promise(r => setTimeout(r, 1500))
        const retry = await doFetch()
        if (!retry.ok) {
          const data = await retry.json()
          showActionError(data.error ?? '操作に失敗しました。もう一度お試しください')
          return false
        }
        trackEvent('game_action', { action, room_code: roomCode, retried: true })
        updatedAtRef.current = ''
        await fetchState()
        return true
      } catch {
        // リトライも失敗 → トーストで通知（alertではない）
        showActionError('通信に失敗しました。少し待って再度お試しください')
        return false
      }
    }
  }, [roomCode, playerId, fetchState, showActionError])

  // Join handler
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinName.trim()) return
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: roomCode, name: joinName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setJoinError(data.error ?? '参加に失敗しました')
        return
      }
      localStorage.setItem(
        `guesso_${roomCode}`,
        JSON.stringify({ playerId: data.player_id, playerName: joinName.trim() })
      )
      trackEvent('room_joined_via_link', { room_code: roomCode })
      setPlayerId(data.player_id)
      setPlayerName(joinName.trim())
      setLoading(true)
    } catch {
      setJoinError('通信エラーが発生しました')
    } finally {
      setJoining(false)
    }
  }

  // ── Render ──────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">😵</div>
        <p className="text-white text-xl font-bold mb-2">{error}</p>
        <button onClick={() => router.push('/')} className="btn-primary mt-4">
          トップに戻る
        </button>
      </div>
    )
  }

  if (!playerId) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="text-4xl font-black gradient-text">GUESSO</h1>
          <p className="text-white/40 text-sm mt-2">ルーム <span className="font-bold text-white">{roomCode}</span> に参加</p>
        </div>
        <div className="w-full max-w-sm glass rounded-3xl p-6 animate-slide-up">
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              className="input-field"
              placeholder="あなたの名前（12文字以内）"
              value={joinName}
              onChange={e => setJoinName(e.target.value)}
              maxLength={12}
              autoFocus
            />
            {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
            <button
              type="submit"
              disabled={joining || !joinName.trim()}
              className="btn-primary w-full text-lg"
            >
              {joining ? '参加中...' : '🚀 参加する'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading || !gameState) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center">
        <div className="text-5xl mb-4 animate-pulse-slow">🎯</div>
        <p className="text-white/40 text-sm">読み込み中...</p>
      </div>
    )
  }

  const state = gameState.room.state
  const commonProps = { gameState, playerId, roomCode, onAction: handleAction }

  return (
    <>
      {/* ── 接続中バナー（ポーリング連続失敗時） ── */}
      {isOffline && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-sm font-bold text-white"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          接続中... 自動で再接続します
        </div>
      )}

      {/* ── アクションエラートースト（alert() の代替） ── */}
      {actionError && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-xs w-[90vw] rounded-2xl px-4 py-3 text-sm font-bold text-white text-center shadow-xl"
          style={{ background: 'rgba(220,38,38,0.92)', backdropFilter: 'blur(8px)' }}
        >
          ⚠️ {actionError}
        </div>
      )}

      {/* ── メイン画面 ── */}
      {(() => {
        switch (state) {
          case 'WAITING_PLAYERS':   return <LobbyScreen {...commonProps} />
          case 'SELECT_THEME':      return <ThemeSelectScreen {...commonProps} />
          case 'SELECT_ASKER':      return <ChooseAskerScreen {...commonProps} />
          case 'ASKER_RANKING':     return <RankInputScreen {...commonProps} />
          case 'REVEAL_MIDDLE':     return <RevealMiddleScreen {...commonProps} />
          case 'GUESSING_OPEN':     return <GuessingScreen {...commonProps} />
          case 'GUESSING_CLOSED':   return <GuessingClosedScreen {...commonProps} />
          case 'RESULT_REVEALED':
            return <ResultScreen gameState={gameState} playerId={playerId} onAction={handleAction} />
          case 'ROUND_SUMMARY':
            return <RoundSummaryScreen gameState={gameState} playerId={playerId} roomCode={roomCode} onAction={handleAction} />
          default:
            return (
              <div className="min-h-dvh flex items-center justify-center">
                <p className="text-white/40">不明な状態: {state}</p>
              </div>
            )
        }
      })()}
    </>
  )
}
