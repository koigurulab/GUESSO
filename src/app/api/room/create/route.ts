import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, generateRoomCode, generateVerifyCode } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { host_name } = await req.json()
    if (!host_name?.trim()) {
      return NextResponse.json({ error: '名前を入力してください' }, { status: 400 })
    }

    const supabase = createServerClient()

    // ユニークなルームコードを生成（最大5回リトライ）
    let code = ''
    for (let i = 0; i < 5; i++) {
      const candidate = generateRoomCode()
      const { data } = await supabase
        .from('rooms')
        .select('code')
        .eq('code', candidate)
        .single()
      if (!data) { code = candidate; break }
    }
    if (!code) {
      return NextResponse.json({ error: 'ルームコードの生成に失敗しました' }, { status: 500 })
    }

    // LINE確認コード生成（4桁数字）
    const verifyCode = generateVerifyCode()

    // ルーム作成（host_player_id は後で更新）
    const { error: roomErr } = await supabase
      .from('rooms')
      .insert({ code, state: 'WAITING_PLAYERS', current_round: 0, line_verify_code: verifyCode, line_verified: false })
    if (roomErr) throw roomErr

    // ホストプレイヤー作成
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ room_code: code, name: host_name.trim(), is_host: true })
      .select()
      .single()
    if (playerErr) throw playerErr

    // ルームにホストIDをセット
    await supabase
      .from('rooms')
      .update({ host_player_id: player.id, updated_at: new Date().toISOString() })
      .eq('code', code)

    return NextResponse.json({ room_code: code, player_id: player.id })
  } catch (err) {
    console.error('[create room]', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
