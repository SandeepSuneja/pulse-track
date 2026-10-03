export default function GoalProgressBar({
  pct = 0,
  accentColor,
  status = 'active',
  editable = false,
  disabled = false,
  onPctChange,
}) {
  const value = Math.max(0, Math.min(100, Math.round(pct || 0)))
  const fillColor =
    status === 'completed' ? '#34d399' : status === 'failed' ? '#fb7185' : accentColor

  return (
    <div className="goal-progress-block">
      <div className="goal-progress-stats">
        <span className="muted">Task completion</span>
        <span className="goal-progress-pct">{value}%</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-fill" style={{ width: `${value}%`, background: fillColor }} />
      </div>
      {editable ? (
        <input
          type="range"
          className="goal-progress-slider"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          aria-label="Goal completion percentage"
          onChange={(e) => onPctChange?.(Number(e.target.value))}
        />
      ) : null}
    </div>
  )
}
