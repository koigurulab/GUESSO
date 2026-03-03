import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Vercel Cron: 毎日3時に実行（vercel.json で設定）
// 7日以上更新されていないルームとその関連データを削除

export async function GET(req: NextRequest) {
  // Vercel Cron からのリクエストか検証
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // 古いルームのコードを取得
    const { data: oldRooms } = await supabase
      .from('rooms')
      .select('code')
      .lt('updated_at', cutoff)

    if (!oldRooms || oldRooms.length === 0) {
      return NextResponse.json({ deleted: 0 })
    }

    const codes = oldRooms.map(r => r.code)

    // 関連データを削除（外部キー制約の順番に注意）
    await Promise.all([
      supabase.from('guesses').delete().in('room_code', codes),
      supabase.from('rounds').delete().in('room_code', codes),
      supabase.from('players').delete().in('room_code', codes),
    ])
    await supabase.from('rooms').delete().in('code', codes)

    console.log(`[cron/cleanup] Deleted ${codes.length} old rooms: ${codes.join(', ')}`)
    return NextResponse.json({ deleted: codes.length })
  } catch (err) {
    console.error('[cron/cleanup]', err)
    return NextResponse.json({ error: 'cleanup failed' }, { status: 500 })
  }
}
