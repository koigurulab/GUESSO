# 🎯 GUESSO — 価値観推理ゲーム

飲み会で盛り上がる！みんなの価値観ランキングを当てよう。

## ゲームの流れ

1. **ホストがルームを作成** → 6文字のコードをシェア
2. **全員がスマホで参加** → URLまたはコード入力
3. **ホストがテーマを選ぶ**（恋愛 / 人生観 / デート）
4. **出題者が指名される** → 7つのアイテムをドラッグでランキング
5. **4位だけ公開** → みんなが1位を予想
6. **ホストが締め切り** → 全結果公開
7. **正解者が判明！** → 結果カードをスクショ共有
8. **次ラウンドへ** → 無限に回せる

## 特徴

- 📱 各自のスマホで参加（ルーム制）
- ⚡ 30秒でゲーム開始
- 🎨 スクショ映えする結果カード
- 🔄 ポーリング同期（WebSocket不要）

## Setup

```bash
npm install
cp .env.local.example .env.local
# .env.local に Supabase の URL と keys を設定
# supabase/schema.sql を Supabase SQL Editor で実行
npm run dev
```

## Tech Stack

Next.js 14 + Supabase + Tailwind CSS + @dnd-kit

---

詳細な設計・実装方針は [CLAUDE.md](./CLAUDE.md) を参照。