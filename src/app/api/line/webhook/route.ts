import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import crypto from 'crypto'

// Next.js の静的最適化を無効にしてPOSTを常に動的処理する
export const dynamic = 'force-dynamic'

// LINE署名を検証する
function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64')
  return hmac === signature
}

// LINE Reply APIでメッセージを返信する
async function replyToLine(replyToken: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET
    if (!channelSecret) {
      console.error('[LINE webhook] LINE_CHANNEL_SECRET が設定されていません')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // ボディを文字列として取得（署名検証に必要）
    const body = await req.text()
    const signature = req.headers.get('x-line-signature') ?? ''

    // 署名検証 — 不正リクエストを弾く
    if (!verifySignature(body, signature, channelSecret)) {
      console.warn('[LINE webhook] 署名検証失敗')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const data = JSON.parse(body) as {
      events: Array<{
        type: string
        replyToken?: string
        message?: { type: string; text: string }
      }>
    }

    const supabase = createServerClient()

    for (const event of data.events) {
      // 友達追加イベント — 使い方を案内する
      if (event.type === 'follow' && event.replyToken) {
        await replyToLine(
          event.replyToken,
          '友達追加ありがとう！🎉\n\nGUESSO で「理解できるフェチ」テーマを解放するには、\nゲームのロビー画面に表示されている4桁の確認コードをこのトークに送ってね！'
        )
        continue
      }

      // テキストメッセージイベント — 確認コードを照合する
      if (
        event.type === 'message' &&
        event.message?.type === 'text' &&
        event.replyToken
      ) {
        const text = event.message.text.trim()

        // 4桁数字かチェック
        if (/^\d{4}$/.test(text)) {
          const { data: room } = await supabase
            .from('rooms')
            .select('code')
            .eq('line_verify_code', text)
            .eq('line_verified', false)
            .single()

          if (room) {
            // LINE認証済みに更新 + updated_at を更新してポーリングを即時反映
            await supabase
              .from('rooms')
              .update({
                line_verified: true,
                updated_at: new Date().toISOString(),
              })
              .eq('code', room.code)

            await replyToLine(
              event.replyToken,
              '✅ 認証完了！\nゲームに戻って「理解できるフェチ」テーマを楽しんでね🎉'
            )
          } else {
            // コードが見つからない or 既に認証済み
            await replyToLine(
              event.replyToken,
              '⚠️ コードが見つかりませんでした。\nゲームのロビー画面に表示されている4桁の数字を確認してね。'
            )
          }
        }
      }
    }

    // LINEのWebhookは常に200を返す必要がある
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[LINE webhook]', err)
    // LINEのWebhookは常に200を返す（エラーでも）
    return NextResponse.json({ ok: true })
  }
}
