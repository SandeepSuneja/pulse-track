import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const PARAMS = ['focus', 'consistency', 'productivity', 'energy', 'wellbeing']

export default function Effort() {
  const { token } = useAuth()
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState({
    log_date: new Date().toISOString().slice(0, 10),
    focus: 7,
    consistency: 7,
    productivity: 7,
    energy: 7,
    wellbeing: 7,
    notes: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLogs(await api.listEffort(token))
  }

  useEffect(() => {
    if (!token) return
    load().catch((err) => setError(err.message))
  }, [token])

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = {
        ...form,
        focus: Number(form.focus),
        consistency: Number(form.consistency),
        productivity: Number(form.productivity),
        energy: Number(form.energy),
        wellbeing: Number(form.wellbeing),
      }
      await api.upsertEffort(token, body)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Daily effort</h1>
          <p className="muted">Drag the meters — feel your day take shape in real time.</p>
        </div>
      </header>

      <div className="grid-2">
        <form className="panel stack" onSubmit={onSubmit}>
          <h2>Today&apos;s check-in</h2>
          <label>
            Date
            <input
              type="date"
              value={form.log_date}
              onChange={(e) => setForm({ ...form, log_date: e.target.value })}
            />
          </label>
          {PARAMS.map((param) => {
            const value = Number(form[param])
            const pct = `${(value / 10) * 100}%`
            return (
              <div className="meter" key={param}>
                <div className="meter-head">
                  <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{param}</span>
                  <span className="meter-value">{value}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={form[param]}
                  style={{ '--pct': pct }}
                  onChange={(e) => setForm({ ...form, [param]: e.target.value })}
                />
              </div>
            )
          })}
          <label>
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save effort log'}
          </button>
        </form>

        <div className="panel">
          <h2>History</h2>
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="illus" />
              <p className="muted">No effort logs yet. Your first check-in starts the streak.</p>
            </div>
          ) : (
            <ul className="record-list">
              {logs.map((log) => (
                <li key={log.id}>
                  <div>
                    <strong>{log.log_date}</strong>
                    <p className="muted">
                      F {log.focus} · C {log.consistency} · P {log.productivity} · E {log.energy} · W{' '}
                      {log.wellbeing}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
