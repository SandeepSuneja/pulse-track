/** Shared ticket / activity category options (built-in defaults). */

export function colorsFromHex(hex, alpha = 0.28) {
  const raw = String(hex || '#94A3B8').replace('#', '')
  const full =
    raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.padEnd(6, '0').slice(0, 6)
  const n = Number.parseInt(full, 16)
  if (!Number.isFinite(n)) {
    return { bg: 'rgba(148,163,184,0.24)', fg: '#E2E8F0' }
  }
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return {
    bg: `rgba(${r},${g},${b},${alpha})`,
    fg: `#${full.toUpperCase()}`,
  }
}

/** Default categories available to every user. */
export const BUILTIN_CATEGORIES = [
  { id: 'health', label: 'Health', color: '#34D399', builtin: true },
  { id: 'work', label: 'Work', color: '#60A5FA', builtin: true },
  { id: 'learning', label: 'Learning', color: '#C084FC', builtin: true },
  { id: 'entertainment', label: 'Entertainment', color: '#838921', builtin: true },
  { id: 'others', label: 'Others', color: '#E2E8F0', builtin: true },
  { id: 'sleep', label: 'Sleep', color: '#FB7185', builtin: true },
]

/** Former built-ins — still rendered if present on old tasks; not offered as defaults. */
const LEGACY_CATEGORY_COLORS = {
  personal_technical_projects: '#FB923C',
  ai_content_generation: '#450C3F',
}

/** @deprecated Prefer useCategories().categories — kept for fallbacks before context loads */
export const CATEGORIES = BUILTIN_CATEGORIES.map(({ id, label }) => ({ id, label }))

export const CATEGORY_COLORS = {
  ...Object.fromEntries(BUILTIN_CATEGORIES.map((c) => [c.id, colorsFromHex(c.color)])),
  ...Object.fromEntries(
    Object.entries(LEGACY_CATEGORY_COLORS).map(([id, color]) => [id, colorsFromHex(color)]),
  ),
}

export function categoryLabel(category, categories = BUILTIN_CATEGORIES) {
  const match = categories.find((c) => c.id === category)
  if (match) return match.label
  return String(category || 'Others').replaceAll('_', ' ')
}

export function categoryColors(category, categories = BUILTIN_CATEGORIES) {
  const match = categories.find((c) => c.id === category)
  if (match?.color) return colorsFromHex(match.color)
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.others
}

/** Solid hex for charts (lines, pie slices, bars). */
export function categoryChartColor(category, categories = BUILTIN_CATEGORIES) {
  return categoryColors(category, categories).fg
}

export const PRESET_CATEGORY_COLORS = [
  '#34D399',
  '#60A5FA',
  '#C084FC',
  '#FB7185',
  '#FB923C',
  '#FBBF24',
  '#22D3EE',
  '#A3E635',
  '#F472B6',
  '#E2E8F0',
]
