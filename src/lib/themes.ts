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
    title: '正直、どこフェチ？（女性）',
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
    title: '正直、どこフェチ？（男性）',
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

// LINE認証不要・Stripe課金で解放する人ランキングテーマ（is_person_rank: true, items は空）
export const PERSON_RANK_THEMES: Theme[] = [
  // 💕 恋愛・ドキドキ系
  { id: 'pr-type',      title: '一番タイプな人は？',             emoji: '💘', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  { id: 'pr-popular',   title: '一番モテそうなのは誰？',         emoji: '🌟', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  { id: 'pr-kiss',      title: 'キスが上手そうなのは誰？',       emoji: '💋', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  { id: 'pr-clingy',    title: '付き合ったら束縛しそうなのは誰？', emoji: '🔒', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  // 🔥 本音・フェロモン系
  { id: 'pr-charisma',  title: '一番色気あるのは誰？',           emoji: '✨', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  { id: 'pr-night',     title: '夜が強そうなのは誰？',           emoji: '🌙', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  { id: 'pr-erotic',    title: '正直エロそうなのは誰？',         emoji: '🔥', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  { id: 'pr-ds',        title: '一番ドSそうなのは誰？',          emoji: '😈', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  // 😈 毒舌・キャラ系
  { id: 'pr-cheat',     title: '浮気しそうなのは誰？',           emoji: '💔', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  { id: 'pr-drunk',     title: '酔ったら面倒くさそうなのは誰？', emoji: '🍺', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  { id: 'pr-selfish',   title: '一番ワガママそうなのは誰？',     emoji: '👑', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
  { id: 'pr-heartbreak',title: '失恋したら一番引きずりそうなのは誰？', emoji: '😢', category: 'person-rank', is_free: false, is_person_rank: true, items: [] },
]

// 人ランキングをジャンル別にグループ化した定義（ThemeSelectScreen 用）
export const PERSON_RANK_GENRES = [
  {
    id: 'love',
    label: '💕 恋愛・ドキドキ系',
    themeIds: ['pr-type', 'pr-popular', 'pr-kiss', 'pr-clingy'],
  },
  {
    id: 'vibe',
    label: '🔥 本音・フェロモン系',
    themeIds: ['pr-charisma', 'pr-night', 'pr-erotic', 'pr-ds'],
  },
  {
    id: 'roast',
    label: '😈 毒舌・キャラ系',
    themeIds: ['pr-cheat', 'pr-drunk', 'pr-selfish', 'pr-heartbreak'],
  },
]

export const THEMES: Theme[] = [...FREE_THEMES, ...FETISH_THEMES, ...PERSON_RANK_THEMES]

export function getTheme(id: string): Theme | undefined {
  return THEMES.find(t => t.id === id)
}

export function getThemeItem(themeId: string, itemId: string) {
  return getTheme(themeId)?.items.find(i => i.id === itemId)
}

/**
 * 人ランキングモードで予想する順位の配列を計算する
 * N=3 → [1,2], N=4 → [1,2,3], N=5 → [1,2,4], N=6 → [1,2,4,5], N=7 → [1,2,4,5,6]
 * （N>=5 のとき3位はヒントとして公開されるためスキップ、N位は最下位として自動公開）
 */
export function computePersonRankSequence(N: number): number[] {
  const seq: number[] = []
  for (let r = 1; r < N; r++) {
    if (N >= 5 && r === 3) continue  // 3位はヒント公開済みのためスキップ
    seq.push(r)
  }
  return seq
}
