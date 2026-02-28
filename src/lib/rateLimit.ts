/**
 * シンプルなメモリベースレート制限
 * IP アドレスごとにリクエスト数を追跡
 */

interface RateLimitEntry {
  timestamps: number[]
}

const rateLimitMap = new Map<string, RateLimitEntry>()

export function getRateLimitKey(req: Request): string {
  // IPアドレスを取得（Vervel環境での優先順位）
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown'
  return ip
}

/**
 * レート制限チェック
 * @param key IP or 識別子
 * @param maxRequests 時間枠内での最大リクエスト数
 * @param windowMs 時間枠（ミリ秒）
 * @returns true なら OK、false なら超過
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now()
  let entry = rateLimitMap.get(key)

  if (!entry) {
    // 初回アクセス
    rateLimitMap.set(key, { timestamps: [now] })
    return true
  }

  // 時間枠外の古いタイムスタンプを削除
  entry.timestamps = entry.timestamps.filter(t => now - t < windowMs)

  // 制限チェック
  if (entry.timestamps.length >= maxRequests) {
    return false // 超過
  }

  // 新しいリクエストを記録
  entry.timestamps.push(now)
  return true
}

/**
 * 定期的にメモリをクリーンアップ（古いエントリを削除）
 * サーバー起動時に1回呼ぶ
 */
export function startRateLimitCleanup(intervalMs: number = 600000) {
  // 10分ごとにクリーンアップ
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      const now = Date.now()
      rateLimitMap.forEach((entry, key) => {
        entry.timestamps = entry.timestamps.filter(t => now - t < 600000)
        if (entry.timestamps.length === 0) {
          rateLimitMap.delete(key)
        }
      })
    }, intervalMs)
  }
}
