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
  health: { bg: 'rgba(16,185,129,0.28)', fg: '#34D399' },
  learning: { bg: 'rgba(168,85,247,0.28)', fg: '#C084FC' },
  work: { bg: 'rgba(37,99,235,0.30)', fg: '#60A5FA' },
  sleep: { bg: 'rgba(251,113,133,0.28)', fg: '#FB7185' },
  entertainment: { bg: 'rgba(254,242,160,0.28)', fg: '#FEF2A0' },
  personal_technical_projects: { bg: 'rgba(249,115,22,0.28)', fg: '#FB923C' },
  ai_content_generation: { bg: 'rgba(236,72,153,0.28)', fg: '#F472B6' },
  others: { bg: 'rgba(148,163,184,0.24)', fg: '#E2E8F0' },
}

export function categoryLabel(category) {
  const match = CATEGORIES.find((c) => c.id === category)
  if (match) return match.label
  return String(category || 'Others').replaceAll('_', ' ')
}

export function categoryColors(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.others
}

/** Solid hex for charts (lines, pie slices, bars). */
export function categoryChartColor(category) {
  return categoryColors(category).fg
}
