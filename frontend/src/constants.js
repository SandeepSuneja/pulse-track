/** Shared ticket / activity category options */
export const CATEGORIES = [
  { id: 'health', label: 'Health' },
  { id: 'learning', label: 'Learning' },
  { id: 'work', label: 'Work' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'personal_technical_projects', label: 'Personal Technical Projects' },
  { id: 'ai_content_generation', label: 'AI Content Generation' },
  { id: 'others', label: 'Others' },
]

export const CATEGORY_COLORS = {
  health: { bg: 'rgba(52,211,153,0.16)', fg: '#6EE7B7' },
  learning: { bg: 'rgba(34,211,238,0.16)', fg: '#67E8F9' },
  work: { bg: 'rgba(56,189,248,0.16)', fg: '#7DD3FC' },
  sleep: { bg: 'rgba(125,211,252,0.14)', fg: '#BAE6FD' },
  entertainment: { bg: 'rgba(251,191,36,0.16)', fg: '#FCD34D' },
  personal_technical_projects: { bg: 'rgba(14,165,233,0.18)', fg: '#38BDF8' },
  ai_content_generation: { bg: 'rgba(244,114,182,0.16)', fg: '#F9A8D4' },
  others: { bg: 'rgba(148,163,184,0.16)', fg: '#CBD5E1' },
}

export function categoryLabel(category) {
  const match = CATEGORIES.find((c) => c.id === category)
  if (match) return match.label
  return String(category || 'Others').replaceAll('_', ' ')
}

export function categoryColors(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.others
}
