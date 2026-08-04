export function IconBoard({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 5h4v14H4V5Zm6 0h4v9h-4V5Zm6 0h4v12h-4V5Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function IconDashboard({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4h7v9H4V4Zm9 0h7v5h-7V4ZM4 15h7v5H4v-5Zm9-4h7v9h-7v-9Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export function IconActivity({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12h4l2.5-6 4 12L16 9h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconEffort({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconGoals({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function IconAnalytics({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 15V9M12 15V7M16 15v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function IconProfile({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 19c1.5-3.2 4-4.8 7-4.8S17.5 15.8 19 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

export function ScoreRing({ value, max = 10, label, color = '#3B82F6' }) {
  const pct = Math.max(0, Math.min(1, Number(value) / max))
  const r = 34
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)

  return (
    <div className="score-ring" style={{ '--ring': color }}>
      <svg viewBox="0 0 84 84" className="score-ring-svg">
        <circle cx="42" cy="42" r={r} className="score-ring-track" />
        <circle
          cx="42"
          cy="42"
          r={r}
          className="score-ring-value"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="score-ring-label">
        <strong>{Number(value).toFixed(1)}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}
