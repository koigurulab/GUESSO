// ============================================================
// プレミアム購入状態管理（localStorage + デバッグモード）
// ============================================================

const STORAGE_KEY = 'guesso_premium'

/** プレミアム購入済みかどうかを判定 */
export function hasPurchased(): boolean {
  if (process.env.NEXT_PUBLIC_PREMIUM_DEBUG === 'true') return true
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** 購入済みとしてマーク（Stripe success page から呼ぶ） */
export function setPurchased(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // ignore (Safari private mode など)
  }
}
