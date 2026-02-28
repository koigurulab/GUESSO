/* =========================================================
 * analytics.ts — GA4 イベントトラッキング ユーティリティ
 *
 * 使い方:
 *   import { trackEvent } from '@/lib/analytics'
 *   trackEvent('room_created', { theme: 'love' })
 * ========================================================= */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? ''

/** GA4 カスタムイベントを送信する */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined') return
  if (!window.gtag) return
  window.gtag('event', eventName, params ?? {})
}

/** ページビューを手動送信（SPA遷移時に使用） */
export function trackPageView(path: string) {
  if (typeof window === 'undefined') return
  if (!window.gtag || !GA_ID) return
  window.gtag('config', GA_ID, { page_path: path })
}
