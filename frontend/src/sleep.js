/** Sleep duration + Ideal / Normal / Bad classification (mirrors backend/app/sleep.py). */

const MIN_GOOD_SLEEP_MINUTES = 7 * 60

function toMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return null
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

/** Normalize API time ("23:00:00" or "23:00") to HTML time input value "HH:MM". */
export function toTimeInputValue(value) {
  if (!value) return ''
  const s = String(value)
  return s.length >= 5 ? s.slice(0, 5) : s
}

export function sleepDurationMinutes(startHhmm, endHhmm) {
  const start = toMinutes(startHhmm)
  const end = toMinutes(endHhmm)
  if (start == null || end == null) return null
  if (end <= start) return end + 24 * 60 - start
  return end - start
}

function inInclusive(m, lo, hi) {
  return m >= lo && m <= hi
}

/**
 * Ideal: wake 06:00–06:30 and duration ≥ 7 hours.
 * Normal: wake 06:30–07:30 and duration ≥ 7 hours.
 * Bad: anything else. Ideal wins when windows overlap (e.g. exactly 06:30).
 */
export function classifySleepQuality(startHhmm, endHhmm) {
  const start = toMinutes(startHhmm)
  const end = toMinutes(endHhmm)
  if (start == null || end == null) return null

  const duration = sleepDurationMinutes(startHhmm, endHhmm)
  if (duration == null || duration < MIN_GOOD_SLEEP_MINUTES) return 'bad'

  if (inInclusive(end, 6 * 60, 6 * 60 + 30)) return 'ideal'
  if (inInclusive(end, 6 * 60 + 30, 7 * 60 + 30)) return 'normal'

  return 'bad'
}

export const SLEEP_QUALITY_LABEL = {
  ideal: 'Ideal',
  normal: 'Normal',
  bad: 'Bad',
}

export const SLEEP_QUALITY_STYLE = {
  ideal: { bg: 'rgba(52,211,153,0.16)', fg: '#6EE7B7' },
  normal: { bg: 'rgba(56,189,248,0.16)', fg: '#7DD3FC' },
  bad: { bg: 'rgba(248,113,113,0.16)', fg: '#FCA5A5' },
}

/** Solid fills for sleep quality bars. */
export const SLEEP_QUALITY_CHART_COLOR = {
  ideal: '#6EE7B7',
  normal: '#7DD3FC',
  bad: '#FCA5A5',
}

export function sleepQualityChartColor(quality) {
  return SLEEP_QUALITY_CHART_COLOR[quality] || 'rgba(148,163,184,0.35)'
}
