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
// 変化が起きやすい状態は短く、待機系は長くしてDB負荷を削減
const POLL_INTERVALS: Partial<Record<string, number>> = {
  WAITING_PLAYERS: 5000,   // 参加待ちは5秒（頻繁な変化なし）
  GUESSING_OPEN:   2000,   // 予想中のみ2秒（guessカウントの反応性が必要）
}
const DEFAULT_POLL_MS = 3000  // その他は3秒

// last_seen を更新する間隔（秒）
const LAST_SEEN_INTERVAL_MS = 30_000

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

  // ── ポーリング制御用 ref ──────────────────────────────────
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  // ETag: 前回レスポンスの rooms.updated_at を保持
  const updatedAtRef = useRef<string>('')
  // gameState を ref でも保持（タイムアウトコールバック内で最新値を読むため）
  const gameStateRef = useRef<RoomStateResponse | null>(null)
  // last_seen を最後に送った時刻
  const lastSeenSentAtRef = useRef<number>(0)
  // フェーズ遷移追跡（GA4用）
  const prevStateRef = useRef<string | null>(null)

  // gameState が変わったら ref も同期
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  /** 現在の room.state に応じたポーリング間隔を返す */
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

    // last_seen 更新フラグ（クライアント側で30秒間隔に制限）
    const now = Date.now()
    let updateSeen = false
    if (now - lastSeenSentAtRef.current >= LAST_SEEN_INTERVAL_MS) {
      updateSeen = true
      lastSeenSentAtRef.current = now
    }

    try {
      const params = new URLSearchParams({ player_id: id })
      // ETagを送信: ver が一致すれば API は {changed: false} を返す
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

      // ETagヒット: 状態変化なし → stateを更新せず早期リターン
      if ('changed' in data && data.changed === false) {
        setLoading(false)
        return
      }

      // ゲーム状態が変わったタイミングでGA4イベント送信
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

      // ETag更新
      if (data.updated_at) updatedAtRef.current = data.updated_at

      setGameState(data)
      setLoading(false)
    } catch (e) {
      console.error('[fetchState]', e)
      // ネットワークエラーは静かに無視（ポーリングで再試行）
    }
  }, [roomCode, playerId])

  // ── アダプティブポーリング（setTimeout チェーン）──────────
  // setInterval と違い、前のリクエストが完了してから次を予約できる。
  // また gameState に応じて間隔を動的に変えられる。
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

  // Action handler (returns true on success, false on failure)
  const handleAction = useCallback(async (action: string, params: Record<string, unknown> = {}): Promise<boolean> => {
    if (!playerId) return false
    try {
      const res = await fetch(`/api/room/${roomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, player_id: playerId, ...params }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'エラーが発生しました')
        return false
      }
      // アクション成功をトラッキング
      trackEvent('game_action', {
        action,
        room_code: roomCode,
        ...(typeof params.theme_id === 'string' ? { theme_id: params.theme_id } : {}),
      })
      // アクション後はETagをリセットして強制フェッチ
      updatedAtRef.current = ''
      await fetchState()
      return true
    } catch {
      alert('通信エラーが発生しました')
      return false
    }
  }, [roomCode, playerId, fetchState])

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

  // Not joined → show join form
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

  // Route to correct screen based on room state
  const state = gameState.room.state

  const commonProps = { gameState, playerId, roomCode, onAction: handleAction }

  switch (state) {
    case 'WAITING_PLAYERS':
      return <LobbyScreen {...commonProps} />
    case 'SELECT_THEME':
      return <ThemeSelectScreen {...commonProps} />
    case 'SELECT_ASKER':
      return <ChooseAskerScreen {...commonProps} />
    case 'ASKER_RANKING':
      return <RankInputScreen {...commonProps} />
    case 'REVEAL_MIDDLE':
      return <RevealMiddleScreen {...commonProps} />
    case 'GUESSING_OPEN':
      return <GuessingScreen {...commonProps} />
    case 'GUESSING_CLOSED':
      return <GuessingClosedScreen {...commonProps} />
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
}
