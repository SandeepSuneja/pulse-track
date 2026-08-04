/** Shared ticket / activity category options */
export const CATEGORIES = [
  { id: 'health', label: 'Health' },
  { id: 'learning', label: 'Learning' },
  { id: 'work', label: 'Work' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'others', label: 'Others' },
]

export const CATEGORY_COLORS = {
  health: { bg: 'rgba(34,197,94,0.14)', fg: '#15803D' },
  learning: { bg: 'rgba(6,182,212,0.14)', fg: '#0E7490' },
  work: { bg: 'rgba(59,130,246,0.12)', fg: '#1D4ED8' },
  sleep: { bg: 'rgba(99,102,241,0.14)', fg: '#4338CA' },
  entertainment: { bg: 'rgba(245,158,11,0.14)', fg: '#B45309' },
  others: { bg: 'rgba(148,163,184,0.18)', fg: '#475569' },
}

export function categoryLabel(category) {
  const match = CATEGORIES.find((c) => c.id === category)
  if (match) return match.label
  return String(category || 'Others').replaceAll('_', ' ')
}

export function categoryColors(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.others
}
