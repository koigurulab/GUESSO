import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// LINE署名を検証する
function verifySignature(body: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64')
    return hmac === signature
  } catch {
    return false
  }
}

// LINE Reply APIでメッセージを返信する
async function replyToLine(replyToken: string, text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    console.error('[LINE webhook] LINE_CHANNEL_ACCESS_TOKEN が未設定')
    return
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
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
    if (!res.ok) {
      const body = await res.text()
      console.error('[LINE webhook] Reply API エラー:', res.status, body)
    }
  } catch (e) {
    console.error('[LINE webhook] Reply API 例外:', e)
  }
}

export async function POST(req: NextRequest) {
  // LINEのWebhookは常に200を返す必要がある（非200だとLINEがリトライしループする）
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET
    if (!channelSecret) {
      console.error('[LINE webhook] LINE_CHANNEL_SECRET が未設定')
      return NextResponse.json({ ok: true })
    }

    // ボディを文字列として取得（署名検証に必要なため req.json() ではなく req.text()）
    const rawBody = await req.text()
    const signature = req.headers.get('x-line-signature') ?? ''

    console.log('[LINE webhook] 受信 signature:', signature.slice(0, 10) + '...')
    console.log('[LINE webhook] body length:', rawBody.length)

    // 署名検証失敗でも200を返す（LINEのリトライ防止）
    if (!verifySignature(rawBody, signature, channelSecret)) {
      console.warn('[LINE webhook] 署名検証失敗 — 不正リクエストの可能性があります')
      return NextResponse.json({ ok: true })
    }

    const data = JSON.parse(rawBody) as {
      events: Array<{
        type: string
        replyToken?: string
        message?: { type: string; text: string }
      }>
    }

    console.log('[LINE webhook] イベント数:', data.events.length)

    // eventsが空の場合はLINEのWebhook検証リクエスト
    if (data.events.length === 0) {
      console.log('[LINE webhook] Webhook検証リクエスト（空イベント）')
      return NextResponse.json({ ok: true })
    }

    const supabase = createServerClient()

    for (const event of data.events) {
      console.log('[LINE webhook] イベントタイプ:', event.type)

      // 友達追加イベント — 使い方を案内する
      if (event.type === 'follow' && event.replyToken) {
        await replyToLine(
          event.replyToken,
          '友達追加ありがとう！🎉\n\nGUESSO で「正直、どこフェチ？」テーマを解放するには、\nゲームのテーマ選択画面に表示されている4桁の確認コードをこのトークに送ってね！'
        )
        continue
      }

      // テキストメッセージイベント — 確認コードを照合する
      if (
        event.type === 'message' &&
        event.message?.type === 'text' &&
        event.replyToken
      ) {
        // 前後の空白・改行を除去
        const text = event.message.text.trim().replace(/\s+/g, '')
        console.log('[LINE webhook] 受信テキスト:', text)

        // 4桁数字かチェック
        if (/^\d{4}$/.test(text)) {
          console.log('[LINE webhook] 確認コード候補:', text)

          const { data: room, error: dbError } = await supabase
            .from('rooms')
            .select('code')
            .eq('line_verify_code', text)
            .eq('line_verified', false)
            .single()

          if (dbError) {
            console.log('[LINE webhook] DB検索結果 - マッチなし:', dbError.message)
          }

          if (room) {
            console.log('[LINE webhook] ルーム認証成功:', room.code)

            const { error: updateError } = await supabase
              .from('rooms')
              .update({
                line_verified: true,
                updated_at: new Date().toISOString(),
              })
              .eq('code', room.code)

            if (updateError) {
              console.error('[LINE webhook] DB更新エラー:', updateError.message)
            }

            await replyToLine(
              event.replyToken,
              '✅ 認証完了！\nゲームに戻って「正直、どこフェチ？」テーマを楽しんでね🎉'
            )
          } else {
            console.log('[LINE webhook] 対応するルームが見つかりません（コード:', text, '）')
            await replyToLine(
              event.replyToken,
              '⚠️ コードが見つかりませんでした。\nテーマ選択画面に表示されている4桁の数字を確認してね。\nすでに認証済みの場合は何もしなくてOK！'
            )
          }
        } else {
          console.log('[LINE webhook] 4桁数字以外のメッセージ:', text)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[LINE webhook] 予期しないエラー:', err)
    // 例外時も200を返す（LINEのリトライ防止）
    return NextResponse.json({ ok: true })
  }
}
