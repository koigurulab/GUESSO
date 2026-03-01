import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getTheme } from '@/lib/themes'
import type { RoomStateResponse } from '@/lib/types'

// Next.js 14はfetch()をキャッシュするため、常に最新DBデータを取得するよう強制
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase()
    const playerId = req.nextUrl.searchParams.get('player_id')
    // ETag用: クライアントが前回受け取ったrooms.updated_at
    const ver = req.nextUrl.searchParams.get('ver')
    // last_seen更新フラグ: クライアントが30秒間隔で送る
    const updateSeen = req.nextUrl.searchParams.get('update_seen') === '1'

    const supabase = createServerClient()

    // ── ① ルーム取得（常に1回だけ読む）──────────────────────
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single()
    if (roomErr || !room) {
      return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
    }

    // ── ② last_seen 更新（クライアント制御・30秒間隔）────────
    if (updateSeen && playerId) {
      supabase
        .from('players')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', playerId)
        .then(() => {})
    }

    // ── ③ ETag変更検知 ───────────────────────────────────────
    if (ver && room.updated_at && ver === room.updated_at) {
      return NextResponse.json({ changed: false })
    }

    // ── ④ 以下は状態が変わっていた場合のみ実行 ───────────────

    // プレイヤー一覧取得
    const { data: players } = await supabase
      .from('players')
      .select('id, name, is_host, last_seen')
      .eq('room_code', code)
      .order('joined_at', { ascending: true })

    // 現在ラウンドの取得
    let roundData = null
    let themeData = null
    let guessCount = 0
    let myGuess: string | null = null
    let guessesResult = null
    let scores: Array<{ player_id: string; total: number }> | null = null
    let roundScores: Array<{ player_id: string; correct: number }> | null = null

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

        // ランキング公開制御
        // 通常テーマ: hint = rank 4, 予想外順位 = rank 7
        // 人ランキング N>=5: hint = rank 3, 予想外順位 = rank N
        // 人ランキング N<5: hint なし, 予想外順位 = rank N
        const isPersonRank = round.is_person_rank ?? false
        const rankSeq: number[] = (round.rank_sequence as number[] | null) ?? [1, 2, 3, 5, 6]
        const targetIds: string[] | null = round.target_player_ids as string[] | null
        const N = isPersonRank ? (targetIds?.length ?? 0) : 7

        // ヒント位置: 人ランキングN>=5なら3位、通常なら4位、人ランキングN<5はなし
        const hintRank: number | null = isPersonRank
          ? (N >= 5 ? 3 : null)
          : 4
        const lastPlaceRank = N  // 公開される最終順位

        const revealStates = ['REVEAL_MIDDLE', 'GUESSING_OPEN', 'GUESSING_CLOSED', 'RESULT_REVEALED', 'ROUND_SUMMARY']

        let maskedRanking: (string | null)[] | null = null
        if (round.ranking_json && revealStates.includes(room.state)) {
          const rawRanking = round.ranking_json as string[]
          const revealedRanks = new Set<number>(hintRank ? [hintRank] : [])
          const currentGuessRank: number | null = room.current_guess_rank ?? null

          if (room.state === 'ROUND_SUMMARY') {
            // サマリーでは全て公開
            for (let r = 1; r <= N; r++) revealedRanks.add(r)
          } else if (currentGuessRank != null) {
            const idx = rankSeq.indexOf(currentGuessRank)
            if (room.state === 'RESULT_REVEALED') {
              // 現在のランクまで全て公開
              for (let i = 0; i <= idx; i++) revealedRanks.add(rankSeq[i])
              // 最後の予想順位に達したら最下位も自動公開
              if (currentGuessRank === rankSeq[rankSeq.length - 1]) {
                revealedRanks.add(lastPlaceRank)
              }
            } else {
              // GUESSING_OPEN/CLOSED: 現在のランクより前のものだけ公開
              for (let i = 0; i < idx; i++) revealedRanks.add(rankSeq[i])
            }
          }

          maskedRanking = rawRanking.map((itemId, i) =>
            revealedRanks.has(i + 1) ? itemId : null
          )
        }

        roundData = {
          round_no: round.round_no,
          theme_id: round.theme_id,
          asker_player_id: round.asker_player_id,
          ranking_json: maskedRanking,
          middle_revealed_value: round.middle_revealed_value,
          is_person_rank: isPersonRank,
          target_player_ids: targetIds,
          rank_sequence: rankSeq,
        }

        // 予想数を取得（現在の順位のみ）
        const currentGuessRank: number | null = room.current_guess_rank ?? null
        if (currentGuessRank != null) {
          const { count } = await supabase
            .from('guesses')
            .select('id', { count: 'exact', head: true })
            .eq('room_code', code)
            .eq('round_no', room.current_round)
            .eq('guess_rank', currentGuessRank)
          guessCount = count ?? 0
        }

        // 自分の予想（現在の順位のみ）
        if (playerId && currentGuessRank != null) {
          const { data: myG } = await supabase
            .from('guesses')
            .select('guess_top1')
            .eq('room_code', code)
            .eq('round_no', room.current_round)
            .eq('player_id', playerId)
            .eq('guess_rank', currentGuessRank)
            .maybeSingle()
          myGuess = myG?.guess_top1 ?? null
        }

        // RESULT_REVEALED のみ全予想公開（現在の順位のみ）
        if (room.state === 'RESULT_REVEALED' && currentGuessRank != null) {
          const { data: allGuesses } = await supabase
            .from('guesses')
            .select('player_id, guess_top1')
            .eq('room_code', code)
            .eq('round_no', room.current_round)
            .eq('guess_rank', currentGuessRank)
          guessesResult = allGuesses ?? []
        }

        // ROUND_SUMMARY: スコア計算（ゲーム通算 + 今ラウンド）
        if (room.state === 'ROUND_SUMMARY') {
          const [{ data: allRounds }, { data: allGuesses }] = await Promise.all([
            supabase
              .from('rounds')
              .select('round_no, ranking_json')
              .eq('room_code', code)
              .lte('round_no', room.current_round),
            supabase
              .from('guesses')
              .select('player_id, round_no, guess_rank, guess_top1')
              .eq('room_code', code),
          ])

          const totalMap: Record<string, number> = {}
          const roundMap: Record<string, number> = {}
          ;(players ?? []).forEach(p => { totalMap[p.id] = 0; roundMap[p.id] = 0 })

          ;(allGuesses ?? []).forEach(guess => {
            const r = allRounds?.find(r => r.round_no === guess.round_no)
            if (!r?.ranking_json) return
            const correct = (r.ranking_json as string[])[guess.guess_rank - 1]
            if (guess.guess_top1 === correct) {
              totalMap[guess.player_id] = (totalMap[guess.player_id] ?? 0) + 1
              if (guess.round_no === room.current_round) {
                roundMap[guess.player_id] = (roundMap[guess.player_id] ?? 0) + 1
              }
            }
          })

          scores = Object.entries(totalMap).map(([player_id, total]) => ({ player_id, total }))
          roundScores = Object.entries(roundMap).map(([player_id, correct]) => ({ player_id, correct }))
        }
      }
    }

    const response: RoomStateResponse = {
      updated_at: room.updated_at ?? new Date().toISOString(),
      room: {
        code: room.code,
        state: room.state,
        current_round: room.current_round,
        asker_player_id: room.asker_player_id,
        current_guess_rank: room.current_guess_rank ?? null,
        line_verified: room.line_verified ?? false,
        line_verify_code: room.line_verify_code ?? null,
      },
      players: players ?? [],
      theme: themeData ?? null,
      round: roundData,
      guess_count: guessCount,
      my_guess: myGuess,
      guesses: guessesResult,
      scores: scores,
      round_scores: roundScores,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[state]', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
