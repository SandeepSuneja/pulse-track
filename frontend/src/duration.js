/** Duration helpers — API stores minutes; UI uses hours + minutes. */

export function splitDuration(totalMinutes) {
  const n = Math.max(0, Math.round(Number(totalMinutes) || 0))
  return {
    hours: Math.floor(n / 60),
    minutes: n % 60,
  }
}

export function combineDuration(hours, minutes) {
  const h = Math.max(0, Number(hours) || 0)
  const m = Math.max(0, Number(minutes) || 0)
  return h * 60 + m
}

/** e.g. 90 → "1h 30m", 45 → "45m", 120 → "2h" */
export function formatDuration(totalMinutes) {
  const n = Math.max(0, Math.round(Number(totalMinutes) || 0))
  const h = Math.floor(n / 60)
  const m = n % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}
