import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getTheme } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase()
    const playerId = req.nextUrl.searchParams.get('player_id')

    const supabase = createServerClient()

    // ルーム取得
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single()
    if (roomErr || !room) {
      return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
    }

    // プレイヤー一覧取得
    const { data: players } = await supabase
      .from('players')
      .select('id, name, is_host, last_seen')
      .eq('room_code', code)
      .order('joined_at', { ascending: true })

    // プレイヤーの last_seen を更新（fire & forget）
    if (playerId) {
      supabase
        .from('players')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', playerId)
        .then(() => {})
    }

    // 現在ラウンドの取得
    let roundData = null
    let themeData = null
    let guessCount = 0
    let myGuess: string | null = null
    let guessesResult = null

    if (room.current_round > 0) {
      const { data: round } = await supabase
        .from('rounds')
        .select('*')
        .eq('room_code', code)
        .eq('round_no', room.current_round)
        .single()

      if (round) {
        // テーマ情報（クライアント側定数から取得）
        themeData = round.theme_id ? getTheme(round.theme_id) ?? null : null

        // ランキングの公開制御:
        //   RESULT_REVEALED のみフル公開
        //   REVEAL_MIDDLE 以降は middle_revealed_value のみ
        const showFullRanking = room.state === 'RESULT_REVEALED'

        roundData = {
          round_no: round.round_no,
          theme_id: round.theme_id,
          asker_player_id: round.asker_player_id,
          ranking_json: showFullRanking ? (round.ranking_json as string[]) : null,
          middle_revealed_value: round.middle_revealed_value,
        }

        // 予想数を取得
        const { count } = await supabase
          .from('guesses')
          .select('id', { count: 'exact', head: true })
          .eq('room_code', code)
          .eq('round_no', room.current_round)
        guessCount = count ?? 0

        // 自分の予想
        if (playerId) {
          const { data: myG } = await supabase
            .from('guesses')
            .select('guess_top1')
            .eq('room_code', code)
            .eq('round_no', room.current_round)
            .eq('player_id', playerId)
            .single()
          myGuess = myG?.guess_top1 ?? null
        }

        // RESULT_REVEALED のみ全予想公開
        if (room.state === 'RESULT_REVEALED') {
          const { data: allGuesses } = await supabase
            .from('guesses')
            .select('player_id, guess_top1')
            .eq('room_code', code)
            .eq('round_no', room.current_round)
          guessesResult = allGuesses ?? []
        }
      }
    }

    const response: RoomStateResponse = {
      room: {
        code: room.code,
        state: room.state,
        current_round: room.current_round,
        asker_player_id: room.asker_player_id,
      },
      players: players ?? [],
      theme: themeData ?? null,
      round: roundData,
      guess_count: guessCount,
      my_guess: myGuess,
      guesses: guessesResult,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[state]', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
