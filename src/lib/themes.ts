import type { Theme } from './types'

// テーマはDB seeded だが、クライアント側でも使うためここにも定義
export const FREE_THEMES: Theme[] = [
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

// LINE認証が必要なフェチテーマ（is_free: false）
export const FETISH_THEMES: Theme[] = [
  {
    id: 'fetish-female',
    title: '理解できるフェチ（女性）',
    emoji: '💜',
    category: 'fetish',
    is_free: false,
    items: [
      { id: 'nape',       emoji: '✨', label: 'うなじ' },
      { id: 'collarbone', emoji: '💜', label: '鎖骨' },
      { id: 'armpit',     emoji: '🌸', label: 'わき' },
      { id: 'thigh',      emoji: '🌙', label: '太もも' },
      { id: 'hand',       emoji: '🤍', label: '手' },
      { id: 'butt',       emoji: '🍑', label: 'おしり' },
      { id: 'chest',      emoji: '💗', label: '胸' },
    ],
  },
  {
    id: 'fetish-male',
    title: '理解できるフェチ（男性）',
    emoji: '💙',
    category: 'fetish',
    is_free: false,
    items: [
      { id: 'hand',       emoji: '✋', label: '手' },
      { id: 'vein',       emoji: '💪', label: '血管' },
      { id: 'shoulder',   emoji: '🏔', label: '肩幅' },
      { id: 'pectoral',   emoji: '🦾', label: '胸筋' },
      { id: 'adams',      emoji: '🔥', label: 'のどぼとけ' },
      { id: 'collarbone', emoji: '⚡', label: '鎖骨' },
      { id: 'calf',       emoji: '🦵', label: 'ふくらはぎ' },
    ],
  },
]

export const THEMES: Theme[] = [...FREE_THEMES, ...FETISH_THEMES]

export function getTheme(id: string): Theme | undefined {
  return THEMES.find(t => t.id === id)
}

export function getThemeItem(themeId: string, itemId: string) {
  return getTheme(themeId)?.items.find(i => i.id === itemId)
}
