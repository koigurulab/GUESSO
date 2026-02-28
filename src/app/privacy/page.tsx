import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'プライバシーポリシー | GUESSO',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh px-4 py-10 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/" className="text-white/40 text-sm hover:text-white/60 flex items-center gap-1">
          ← トップへ戻る
        </Link>
      </div>

      <h1 className="text-2xl font-black text-white mb-2">プライバシーポリシー</h1>
      <p className="text-white/40 text-sm mb-8">最終更新日：2025年2月</p>

      <div className="space-y-8 text-white/70 leading-relaxed">

        <section>
          <h2 className="text-lg font-bold text-white mb-3">1. 基本方針</h2>
          <p>
            GUESSO（以下「本サービス」）は、ユーザーのプライバシーを尊重し、
            個人情報の保護に努めます。本ポリシーは、本サービスにおける
            情報の収集・利用方法について説明します。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">2. 収集する情報</h2>
          <p className="mb-3">本サービスは以下の情報を収集します：</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <span className="text-white/90 font-semibold">ニックネーム</span>
              ：ゲームプレイ時に任意で入力するお名前。本名である必要はありません。
            </li>
            <li>
              <span className="text-white/90 font-semibold">ゲームデータ</span>
              ：ランキング入力内容、予想内容、スコアなどのゲームプレイ情報。
            </li>
            <li>
              <span className="text-white/90 font-semibold">アクセスログ</span>
              ：IPアドレス、ブラウザの種類、アクセス日時などの技術的情報。
            </li>
          </ul>
          <p className="mt-3">
            本サービスはアカウント登録を必要とせず、氏名・メールアドレス・
            電話番号などの個人を特定できる情報は収集しません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">3. 広告について（Google AdSense）</h2>
          <p className="mb-3">
            本サービスは、Google LLCが提供する広告配信サービス
            「Google AdSense」を利用しています。
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              Google AdSenseは、ユーザーの興味に基づいた広告を表示するために
              Cookieを使用することがあります。
            </li>
            <li>
              Cookieを通じて収集される情報には、本サービスへのアクセス情報が
              含まれますが、氏名や住所などの個人を特定できる情報は含まれません。
            </li>
            <li>
              Googleによるデータの使用については、
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 underline ml-1"
              >
                Googleの広告ポリシー
              </a>
              をご確認ください。
            </li>
          </ul>
          <p className="mt-3">
            ブラウザの設定からCookieを無効にすることで、
            パーソナライズ広告をオプトアウトできます。または
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 underline ml-1"
            >
              Google広告設定
            </a>
            からも管理できます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">4. Cookieの使用</h2>
          <p className="mb-3">
            本サービスは以下の目的でCookieおよびブラウザのローカルストレージを使用します：
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>ゲームセッション情報の一時保存（プレイヤーID等）</li>
            <li>Google AdSenseによる広告の最適化</li>
          </ul>
          <p className="mt-3">
            ブラウザの設定によりCookieを無効にすることができますが、
            一部機能が正常に動作しない場合があります。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">5. 情報の利用目的</h2>
          <p className="mb-3">収集した情報は以下の目的に使用します：</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>ゲームサービスの提供・改善</li>
            <li>不正アクセスの防止</li>
            <li>広告の配信</li>
            <li>サービスの利用状況の把握・分析</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">6. 第三者への情報提供</h2>
          <p>
            本サービスは、法令に基づく場合または広告配信サービス（Google AdSense）
            のために必要な範囲を除き、収集した情報を第三者に提供・開示しません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">7. データの保管</h2>
          <p>
            ゲームデータはSupabase（米国）のサーバーに保管されます。
            ゲームセッション終了後、ルームデータは定期的に削除されます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">8. 未成年者について</h2>
          <p>
            本サービスは13歳未満の方を対象としていません。
            13歳未満の方は保護者の同意のもとでご利用ください。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">9. ポリシーの変更</h2>
          <p>
            本プライバシーポリシーは予告なく変更される場合があります。
            重要な変更がある場合は本ページにて告知します。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-3">10. お問い合わせ</h2>
          <p>
            本プライバシーポリシーに関するお問い合わせは、
            本サービスの運営者までご連絡ください。
          </p>
        </section>

      </div>

      <div className="mt-12 pt-6 border-t border-white/10 text-center">
        <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
          GUESSOで遊ぶ →
        </Link>
      </div>
    </main>
  )
}
