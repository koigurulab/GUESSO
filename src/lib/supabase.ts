import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// サーバーサイド専用（API Routes のみ使用）
// service_role key で RLS をバイパスして書き込みも可能にする
export function createServerClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: {
      // Next.js 14のfetchキャッシュを無効化し、常に最新データを取得する
      fetch: (url: RequestInfo | URL, options?: RequestInit) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  })
}

// ルームコード生成（6文字英大文字）
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // 紛らわしい文字を除外
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// LINE確認コード生成（4文字数字 — ルームコードと区別しやすい形式）
export function generateVerifyCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}
