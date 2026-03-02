import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { THEMES, computePersonRankSequence } from '@/lib/themes'
import type { ActionRequest, RoomState } from '@/lib/types'

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase()
    const body: ActionRequest = await req.json()
    const { action, player_id } = body

    if (!action || !player_id) return err('actionとplayer_idは必須です')

    const supabase = createServerClient()

    // ルーム + プレイヤー を同時取得
    const [{ data: room }, { data: player }] = await Promise.all([
      supabase.from('rooms').select('*').eq('code', code).single(),
      supabase.from('players').select('*').eq('id', player_id).eq('room_code', code).single(),
    ])

    if (!room) return err('ルームが見つかりません', 404)
    if (!player) return err('このルームのプレイヤーではありません', 403)

    const isHost = player.is_host
    const state: RoomState = room.state
    const now = new Date().toISOString()

    const updateRoom = (patch: Record<string, unknown>) =>
      supabase.from('rooms').update({ ...patch, updated_at: now }).eq('code', code)

    // ========================
    // start-game
    // ========================
    if (action === 'start-game') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'WAITING_PLAYERS') return err(`現在 ${state} 状態のため開始できません`)

      const { error } = await updateRoom({ state: 'SELECT_THEME', current_round: 1 })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // select-theme
    // ========================
    if (action === 'select-theme') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'SELECT_THEME') return err(`現在 ${state} 状態のためテーマ選択できません`)
      if (!body.theme_id) return err('theme_idが必要です')

      // テーマが存在するか確認
      const theme = THEMES.find(t => t.id === body.theme_id)
      if (!theme) return err('無効なテーマIDです')

      // フェチ系テーマはLINE認証が必要
      if (!theme.is_free && theme.category === 'fetish' && !room.line_verified) {
        return err('このテーマはLINE認証が必要です', 403)
      }

      // ラウンドレコードを作成
      const round_no = room.current_round
      const { error: roundErr } = await supabase
        .from('rounds')
        .upsert(
          {
            room_code: code,
            round_no,
            theme_id: body.theme_id,
            is_person_rank: theme.is_person_rank ?? false,
          },
          { onConflict: 'room_code,round_no' }
        )
      if (roundErr) throw roundErr

      const { error } = await updateRoom({ state: 'SELECT_ASKER' })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // select-asker
    // ========================
    if (action === 'select-asker') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'SELECT_ASKER') return err(`現在 ${state} 状態のため出題者選択できません`)
      if (!body.asker_player_id) return err('asker_player_idが必要です')

      // 出題者がこのルームのプレイヤーか確認
      const { data: asker } = await supabase
        .from('players')
        .select('id')
        .eq('id', body.asker_player_id)
        .eq('room_code', code)
        .single()
      if (!asker) return err('指定した出題者はこのルームのプレイヤーではありません')

      // 現在ラウンドが人ランキングかチェック
      const { data: round } = await supabase
        .from('rounds')
        .select('is_person_rank')
        .eq('room_code', code)
        .eq('round_no', room.current_round)
        .single()

      const { error: roundErr } = await supabase
        .from('rounds')
        .update({ asker_player_id: body.asker_player_id })
        .eq('room_code', code)
        .eq('round_no', room.current_round)
      if (roundErr) throw roundErr

      // 人ランキングなら SELECT_TARGETS へ、そうでなければ ASKER_RANKING へ
      const nextState = round?.is_person_rank ? 'SELECT_TARGETS' : 'ASKER_RANKING'
      const { error } = await updateRoom({
        state: nextState,
        asker_player_id: body.asker_player_id,
        gui_mode: body.gui_mode ?? false,
      })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // select-targets（人ランキングのみ: 出題者が対象プレイヤーを選択）
    // ========================
    if (action === 'select-targets') {
      if (player_id !== room.asker_player_id) return err('出題者のみ対象者を選択できます', 403)
      if (state !== 'SELECT_TARGETS') return err(`現在 ${state} 状態のため対象者選択できません`)
      if (!body.target_player_ids || body.target_player_ids.length < 3) {
        return err('3人以上の対象者を選択してください')
      }
      if (body.target_player_ids.length > 7) {
        return err('対象者は7人以下にしてください')
      }

      // 全員がこのルームのプレイヤーかチェック
      const { data: roomPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('room_code', code)
      const validIds = new Set((roomPlayers ?? []).map(p => p.id))
      const allValid = body.target_player_ids.every(id => validIds.has(id))
      if (!allValid) return err('無効なプレイヤーIDが含まれています')

      const N = body.target_player_ids.length
      const rankSequence = computePersonRankSequence(N)

      const { error: roundErr } = await supabase
        .from('rounds')
        .update({
          target_player_ids: body.target_player_ids,
          rank_sequence: rankSequence,
        })
        .eq('room_code', code)
        .eq('round_no', room.current_round)
      if (roundErr) throw roundErr

      const { error } = await updateRoom({ state: 'ASKER_RANKING' })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // submit-ranking (出題者)
    // ========================
    if (action === 'submit-ranking') {
      if (player_id !== room.asker_player_id) return err('出題者のみランキングを入力できます', 403)
      if (state !== 'ASKER_RANKING') return err(`現在 ${state} 状態のためランキング入力できません`)
      if (!body.ranking) return err('rankingが必要です')

      // 現在ラウンドを取得
      const { data: round } = await supabase
        .from('rounds')
        .select('is_person_rank, target_player_ids, rank_sequence')
        .eq('room_code', code)
        .eq('round_no', room.current_round)
        .single()

      if (round?.is_person_rank) {
        // 人ランキングモード
        const N = (round.target_player_ids as string[])?.length ?? 0
        if (body.ranking.length !== N) return err(`${N}人分のランキングを入力してください`)

        // N>=5 なら3位がヒント、N<5 はヒントなし
        const middle = N >= 5 ? body.ranking[2] : null
        const { error: rankErr } = await supabase
          .from('rounds')
          .update({
            ranking_json: body.ranking,
            middle_revealed_value: middle,
          })
          .eq('room_code', code)
          .eq('round_no', room.current_round)
        if (rankErr) throw rankErr

        if (N >= 5) {
          // ヒントあり: REVEAL_MIDDLE へ
          const { error } = await updateRoom({ state: 'REVEAL_MIDDLE' })
          if (error) throw error
        } else {
          // ヒントなし: GUESSING_OPEN へ直接（rank_sequence[0] = 1）
          const rankSeq = (round.rank_sequence as number[]) ?? [1]
          const { error } = await updateRoom({
            state: 'GUESSING_OPEN',
            current_guess_rank: rankSeq[0],
          })
          if (error) throw error
        }
      } else {
        // 通常テーマモード（7アイテム固定）
        if (body.ranking.length !== 7) return err('7つのアイテムを並べてください')
        const middle = body.ranking[3]  // 4位（index 3）

        const { error: rankErr } = await supabase
          .from('rounds')
          .update({ ranking_json: body.ranking, middle_revealed_value: middle })
          .eq('room_code', code)
          .eq('round_no', room.current_round)
        if (rankErr) throw rankErr

        const { error } = await updateRoom({ state: 'REVEAL_MIDDLE' })
        if (error) throw error
      }

      return NextResponse.json({ ok: true })
    }

    // ========================
    // open-guessing
    // ========================
    if (action === 'open-guessing') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'REVEAL_MIDDLE') return err(`現在 ${state} 状態のため予想オープンできません`)

      const { error } = await updateRoom({ state: 'GUESSING_OPEN', current_guess_rank: 1 })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // submit-guess (参加者)
    // ========================
    if (action === 'submit-guess') {
      if (state !== 'GUESSING_OPEN') return err(`現在 ${state} 状態のため予想できません`)
      if (player_id === room.asker_player_id) return err('出題者は予想できません', 403)
      if (!body.guess_top1) return err('guess_top1が必要です')
      if (!room.current_guess_rank) return err('current_guess_rankが設定されていません')

      // UPSERT（再送信も上書き可）
      const { error } = await supabase
        .from('guesses')
        .upsert(
          {
            room_code: code,
            round_no: room.current_round,
            player_id,
            guess_rank: room.current_guess_rank,
            guess_top1: body.guess_top1,
            submitted_at: now,
          },
          { onConflict: 'room_code,round_no,player_id,guess_rank' }
        )
      if (error) throw error

      // rooms.updated_at を更新してホストのETagを無効化
      const { error: touchErr } = await updateRoom({})
      if (touchErr) throw touchErr
      return NextResponse.json({ ok: true })
    }

    // ========================
    // close-guess
    // ========================
    if (action === 'close-guess') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'GUESSING_OPEN') return err(`現在 ${state} 状態のため締切できません`)

      const { error } = await updateRoom({ state: 'GUESSING_CLOSED' })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // reveal-result
    // ========================
    if (action === 'reveal-result') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'GUESSING_CLOSED') return err(`現在 ${state} 状態のため結果公開できません`)

      const { error } = await updateRoom({ state: 'RESULT_REVEALED' })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // show-summary（ラウンドサマリーへ移行）
    // ========================
    if (action === 'show-summary') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'RESULT_REVEALED') return err(`現在 ${state} 状態のためサマリーに進めません`)

      // rank_sequence の最後のランクまで予想したか確認
      const { data: round } = await supabase
        .from('rounds')
        .select('rank_sequence, ranking_json, asker_player_id')
        .eq('room_code', code)
        .eq('round_no', room.current_round)
        .single()

      const rankSeq = (round?.rank_sequence as number[] | null) ?? [1, 2, 3, 5, 6]
      const lastRank = rankSeq[rankSeq.length - 1]
      if (room.current_guess_rank !== lastRank) {
        return err('まだ全ての順位を予想し終えていません')
      }

      // グイモードの場合、グイ数を計算して保存
      if (room.gui_mode) {
        const { data: allGuesses } = await supabase
          .from('guesses')
          .select('player_id, guess_rank, guess_top1')
          .eq('room_code', code)
          .eq('round_no', room.current_round)

        const rankingJson = (round?.ranking_json as string[] | null) ?? []
        const askerPlayerId: string | null = round?.asker_player_id ?? null
        const guiCounts: Record<string, number> = {}

        for (const rank of rankSeq) {
          const correctAnswer = rankingJson[rank - 1]
          const guessesForRank = (allGuesses ?? []).filter(g => g.guess_rank === rank)
          const wrongGuessers = guessesForRank.filter(g => g.guess_top1 !== correctAnswer)
          const allCorrect = guessesForRank.length > 0 && wrongGuessers.length === 0

          if (allCorrect && askerPlayerId) {
            // 全員正解 → 出題者がグイ
            guiCounts[askerPlayerId] = (guiCounts[askerPlayerId] ?? 0) + 1
          } else {
            // 外した人がグイ
            wrongGuessers.forEach(g => {
              guiCounts[g.player_id] = (guiCounts[g.player_id] ?? 0) + 1
            })
          }
        }

        await supabase
          .from('rounds')
          .update({ gui_counts: guiCounts })
          .eq('room_code', code)
          .eq('round_no', room.current_round)
      }

      const { error } = await updateRoom({ state: 'ROUND_SUMMARY' })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // next-rank（同テーマで次の順位を予想）
    // ========================
    if (action === 'next-rank') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'RESULT_REVEALED') return err(`現在 ${state} 状態のため次の順位に進めません`)

      // rank_sequence を取得して次のランクを決定
      const { data: round } = await supabase
        .from('rounds')
        .select('rank_sequence')
        .eq('room_code', code)
        .eq('round_no', room.current_round)
        .single()

      const rankSeq = (round?.rank_sequence as number[] | null) ?? [1, 2, 3, 5, 6]
      const currentIdx = rankSeq.indexOf(room.current_guess_rank ?? -1)
      if (currentIdx === -1 || currentIdx >= rankSeq.length - 1) {
        return err('全ての順位を予想し終えています。show-summaryを使ってください')
      }
      const nextRank = rankSeq[currentIdx + 1]

      const { error } = await updateRoom({ state: 'GUESSING_OPEN', current_guess_rank: nextRank })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // back-to-theme（テーマ選択に戻る）
    // ========================
    if (action === 'back-to-theme') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      const allowed = ['SELECT_ASKER', 'SELECT_TARGETS', 'ASKER_RANKING', 'REVEAL_MIDDLE']
      if (!allowed.includes(state)) return err(`現在 ${state} 状態のためテーマ選択に戻れません`)

      // ラウンドレコードをリセット
      await supabase
        .from('rounds')
        .update({
          asker_player_id: null,
          ranking_json: null,
          middle_revealed_value: null,
          is_person_rank: false,
          target_player_ids: null,
          rank_sequence: null,
        })
        .eq('room_code', code)
        .eq('round_no', room.current_round)

      const { error } = await updateRoom({
        state: 'SELECT_THEME',
        asker_player_id: null,
        current_guess_rank: null,
      })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // next-round
    // ========================
    if (action === 'next-round') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'ROUND_SUMMARY') return err(`現在 ${state} 状態のため次ラウンドに進めません`)

      const { error } = await updateRoom({
        state: 'SELECT_THEME',
        current_round: room.current_round + 1,
        asker_player_id: null,
        current_guess_rank: null,
        gui_mode: false,
      })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // kick-player
    // ========================
    if (action === 'kick-player') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (!body.kick_player_id) return err('kick_player_idが必要です')
      if (body.kick_player_id === player_id) return err('自分自身をキックできません')

      await supabase
        .from('players')
        .delete()
        .eq('id', body.kick_player_id)
        .eq('room_code', code)

      const { error } = await updateRoom({})
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return err(`不明なアクション: ${action}`)
  } catch (err) {
    console.error('[action]', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
