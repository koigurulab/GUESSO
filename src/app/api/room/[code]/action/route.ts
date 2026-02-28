import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { checkRateLimit, getRateLimitKey } from '@/lib/rateLimit'
import type { ActionRequest, RoomState } from '@/lib/types'

function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    // レート制限: 60秒間に30回まで（ゲーム中は操作が多い）
    const ip = getRateLimitKey(req)
    if (!checkRateLimit(ip, 30, 60000)) {
      return err('リクエストが多すぎます。少し待ってからやり直してください', 429)
    }

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

      // ラウンドレコードを作成
      const round_no = room.current_round
      const { error: roundErr } = await supabase
        .from('rounds')
        .upsert({ room_code: code, round_no, theme_id: body.theme_id }, { onConflict: 'room_code,round_no' })
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

      await supabase
        .from('rounds')
        .update({ asker_player_id: body.asker_player_id })
        .eq('room_code', code)
        .eq('round_no', room.current_round)

      const { error } = await updateRoom({
        state: 'ASKER_RANKING',
        asker_player_id: body.asker_player_id,
      })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // submit-ranking (出題者)
    // ========================
    if (action === 'submit-ranking') {
      if (player_id !== room.asker_player_id) return err('出題者のみランキングを入力できます', 403)
      if (state !== 'ASKER_RANKING') return err(`現在 ${state} 状態のためランキング入力できません`)
      if (!body.ranking || body.ranking.length !== 7) return err('7つのアイテムを並べてください')

      const middle = body.ranking[3]  // 4位（index 3）

      await supabase
        .from('rounds')
        .update({ ranking_json: body.ranking, middle_revealed_value: middle })
        .eq('room_code', code)
        .eq('round_no', room.current_round)

      const { error } = await updateRoom({ state: 'REVEAL_MIDDLE' })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    // ========================
    // open-guessing
    // ========================
    if (action === 'open-guessing') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'REVEAL_MIDDLE') return err(`現在 ${state} 状態のため予想オープンできません`)

      const { error } = await updateRoom({ state: 'GUESSING_OPEN' })
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

      // UPSERT（再送信も上書き可）
      const { error } = await supabase
        .from('guesses')
        .upsert(
          {
            room_code: code,
            round_no: room.current_round,
            player_id,
            guess_top1: body.guess_top1,
            submitted_at: now,
          },
          { onConflict: 'room_code,round_no,player_id' }
        )
      if (error) throw error
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
    // next-round
    // ========================
    if (action === 'next-round') {
      if (!isHost) return err('ホストのみ操作できます', 403)
      if (state !== 'RESULT_REVEALED') return err(`現在 ${state} 状態のため次ラウンドに進めません`)

      const { error } = await updateRoom({
        state: 'SELECT_THEME',
        current_round: room.current_round + 1,
        asker_player_id: null,
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

      return NextResponse.json({ ok: true })
    }

    return err(`不明なアクション: ${action}`)
  } catch (err) {
    console.error('[action]', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
