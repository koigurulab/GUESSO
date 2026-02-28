'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { RoomStateResponse } from '@/lib/types'

import LobbyScreen from '@/components/screens/LobbyScreen'
import ThemeSelectScreen from '@/components/screens/ThemeSelectScreen'
import ChooseAskerScreen from '@/components/screens/ChooseAskerScreen'
import RankInputScreen from '@/components/screens/RankInputScreen'
import RevealMiddleScreen from '@/components/screens/RevealMiddleScreen'
import GuessingScreen from '@/components/screens/GuessingScreen'
import GuessingClosedScreen from '@/components/screens/GuessingClosedScreen'
import ResultScreen from '@/components/screens/ResultScreen'
import RoundSummaryScreen from '@/components/screens/RoundSummaryScreen'

const POLL_INTERVAL = 2000

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

  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Load player from localStorage
  useEffect(() => {
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
    try {
      const res = await fetch(`/api/room/${roomCode}/state?player_id=${id}`)
      if (res.status === 404) {
        setError('ルームが見つかりません')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('fetch failed')
      const data: RoomStateResponse = await res.json()
      setGameState(data)
      setLoading(false)
    } catch (e) {
      console.error('[fetchState]', e)
      // ネットワークエラーは静かに無視（ポーリングで再試行）
    }
  }, [roomCode, playerId])

  // Start polling when player_id is set
  useEffect(() => {
    if (!playerId) return
    fetchState(playerId)
    pollingRef.current = setInterval(() => fetchState(), POLL_INTERVAL)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
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
      // すぐにポーリング
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
