import type { Theme } from './types'

// テーマはDB seeded だが、クライアント側でも使うためここにも定義
export const THEMES: Theme[] = [
  {
    id: 'love',
    title: '異性に求めるもの',
    emoji: '💕',
    category: 'love',
    is_free: true,
    items: [
      { id: 'face',        emoji: '👀', label: '顔' },
      { id: 'personality', emoji: '💝', label: '性格' },
      { id: 'height',      emoji: '📏', label: '身長' },
      { id: 'income',      emoji: '💰', label: '収入' },
      { id: 'chemistry',   emoji: '🔥', label: '体の相性' },
      { id: 'drinking',    emoji: '🍻', label: 'お酒の飲み具合' },
      { id: 'frequency',   emoji: '📅', label: '会える頻度' },
    ],
  },
  {
    id: 'life',
    title: '人生で大事なもの',
    emoji: '🌈',
    category: 'life',
    is_free: true,
    items: [
      { id: 'freedom', emoji: '🗽', label: '自由' },
      { id: 'money',   emoji: '💴', label: 'お金' },
      { id: 'health',  emoji: '💪', label: '健康' },
      { id: 'family',  emoji: '👨‍👩‍👧', label: '家族' },
      { id: 'work',    emoji: '🏢', label: '仕事' },
      { id: 'friends', emoji: '👫', label: '友達' },
      { id: 'hobby',   emoji: '🎨', label: '趣味' },
    ],
  },
  {
    id: 'drinks',
    title: '好きなお酒の種類',
    emoji: '🍺',
    category: 'light',
    is_free: true,
    items: [
      { id: 'beer',        emoji: '🍺', label: 'ビール' },
      { id: 'highball',    emoji: '🥃', label: 'ハイボール' },
      { id: 'sake',        emoji: '🍶', label: '日本酒' },
      { id: 'wine',        emoji: '🍷', label: 'ワイン' },
      { id: 'shochu',      emoji: '🫗', label: '焼酎' },
      { id: 'lemonsour',   emoji: '🍋', label: 'レモンサワー' },
      { id: 'tequila',     emoji: '🌵', label: 'テキーラ' },
    ],
  },
]

export function getTheme(id: string): Theme | undefined {
  return THEMES.find(t => t.id === id)
}

export function getThemeItem(themeId: string, itemId: string) {
  return getTheme(themeId)?.items.find(i => i.id === itemId)
}
