import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { CATEGORIES, categoryLabel } from '../constants'

export default function Goals() {
  const { token } = useAuth()
  const [goals, setGoals] = useState([])
  const [form, setForm] = useState({
    title: '',
    category: 'work',
    target_minutes: 300,
    period: 'weekly',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    is_active: true,
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setGoals(await api.listGoals(token))
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
      await api.createGoal(token, {
        ...form,
        target_minutes: Number(form.target_minutes),
        end_date: form.end_date || null,
      })
      setForm({ ...form, title: '' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    await api.deleteGoal(token, id)
    await load()
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Goals</h1>
          <p className="muted">Set targets, then chase the progress bar as you log time.</p>
        </div>
      </header>

      <div className="grid-2">
        <form className="panel stack" onSubmit={onSubmit}>
          <h2>New goal</h2>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="row-2">
            <label>
              Target minutes
              <input
                type="number"
                min={1}
                value={form.target_minutes}
                onChange={(e) => setForm({ ...form, target_minutes: e.target.value })}
              />
            </label>
            <label>
              Period
              <select
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
              >
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
              </select>
            </label>
          </div>
          <label>
            Start date
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Create goal'}
          </button>
        </form>

        <div className="panel">
          <h2>Your goals</h2>
          {goals.length === 0 ? (
            <p className="muted">No goals yet.</p>
          ) : (
            <ul className="record-list">
              {goals.map((g) => (
                <li key={g.id}>
                  <div>
                    <strong>{g.title}</strong>
                    <p className="muted">
                      {categoryLabel(g.category)} · {g.target_minutes} min / {g.period}
                      {g.is_active ? '' : ' · inactive'}
                    </p>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => remove(g.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
