import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { room_code, name } = await req.json()
    if (!room_code?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'ルームコードと名前を入力してください' }, { status: 400 })
    }

    const supabase = createServerClient()
    const code = room_code.trim().toUpperCase()

    // ルーム存在確認
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('code, state')
      .eq('code', code)
      .single()

    if (roomErr || !room) {
      return NextResponse.json({ error: 'ルームが見つかりません' }, { status: 404 })
    }

    // 人数チェック（最大8人）
    const { count } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('room_code', code)
    if ((count ?? 0) >= 8) {
      return NextResponse.json({ error: 'このルームは満員です（最大8人）' }, { status: 400 })
    }

    // プレイヤー作成
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .insert({ room_code: code, name: name.trim(), is_host: false })
      .select()
      .single()
    if (playerErr) throw playerErr

    // rooms.updated_at を更新してホストのETagを無効化（新メンバーが即座に反映される）
    await supabase
      .from('rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('code', code)

    return NextResponse.json({ player_id: player.id, room_code: code })
  } catch (err) {
    console.error('[join room]', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
