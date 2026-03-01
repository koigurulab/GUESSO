import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { room_code, player_id } = await req.json()
    if (!room_code || !player_id) {
      return NextResponse.json({ error: 'room_codeとplayer_idが必要です' }, { status: 400 })
    }

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Stripe設定が不完全です' }, { status: 500 })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://guesso-app.vercel.app'
    const successUrl = `${origin}/purchase/success?room_code=${encodeURIComponent(room_code)}`
    const cancelUrl  = `${origin}/room/${room_code}`

    const params = new URLSearchParams()
    params.append('mode', 'payment')
    params.append('success_url', successUrl)
    params.append('cancel_url', cancelUrl)
    params.append('line_items[0][price_data][currency]', 'jpy')
    params.append('line_items[0][price_data][unit_amount]', '480')
    params.append('line_items[0][price_data][product_data][name]', 'GUESSO プレミアムパック – 👥 人ランキング')
    params.append('line_items[0][price_data][product_data][description]', '恋人にするなら？一番モテそうなのは？5つの人ランキングテーマが解放されます')
    params.append('line_items[0][quantity]', '1')
    params.append('payment_method_types[0]', 'card')
    params.append('metadata[room_code]', room_code)
    params.append('metadata[player_id]', player_id)

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[stripe/checkout] Stripe API error:', res.status, body)
      return NextResponse.json({ error: '決済セッションの作成に失敗しました' }, { status: 500 })
    }

    const session = await res.json()
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
