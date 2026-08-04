import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { CATEGORIES, categoryLabel } from '../constants'

const emptyForm = () => ({
  title: '',
  category: 'work',
  status: 'todo',
  notes: '',
  activity_date: new Date().toISOString().slice(0, 10),
  hasDueDate: false,
  due_date: new Date().toISOString().slice(0, 10),
  duration_minutes: 60,
  focus_score: 7,
  energy_score: 7,
  productivity_score: 7,
})

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Done',
}

export default function Activities() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const data = await api.listActivities(token)
    setItems(data)
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
      const { hasDueDate, due_date, ...rest } = form
      await api.createActivity(token, {
        ...rest,
        due_date: hasDueDate ? due_date : null,
        duration_minutes: Number(form.duration_minutes),
        focus_score: Number(form.focus_score),
        energy_score: Number(form.energy_score),
        productivity_score: Number(form.productivity_score),
      })
      setForm(emptyForm())
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    await api.deleteActivity(token, id)
    await load()
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Activities</h1>
          <p className="muted">Log timed work blocks. Use the Board to move tickets by status.</p>
        </div>
      </header>

      <div className="grid-2">
        <form className="panel stack" onSubmit={onSubmit}>
          <h2>Log activity</h2>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <div className="row-2">
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
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row-2">
            <label>
              Date
              <input
                type="date"
                value={form.activity_date}
                onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
                required
              />
            </label>
            <label>
              Duration (min)
              <input
                type="number"
                min={1}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                required
              />
            </label>
          </div>
          <label className="check-row">
            <span>
              <input
                type="checkbox"
                checked={form.hasDueDate}
                onChange={(e) => setForm({ ...form, hasDueDate: e.target.checked })}
              />{' '}
              Set a due date
            </span>
          </label>
          {form.hasDueDate && (
            <label>
              Due date
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                required
              />
            </label>
          )}
          {!form.hasDueDate && <p className="muted">This task is indefinite (no due date).</p>}
          <div className="row-3">
            <label>
              Focus
              <input
                type="number"
                min={1}
                max={10}
                value={form.focus_score}
                onChange={(e) => setForm({ ...form, focus_score: e.target.value })}
              />
            </label>
            <label>
              Energy
              <input
                type="number"
                min={1}
                max={10}
                value={form.energy_score}
                onChange={(e) => setForm({ ...form, energy_score: e.target.value })}
              />
            </label>
            <label>
              Productivity
              <input
                type="number"
                min={1}
                max={10}
                value={form.productivity_score}
                onChange={(e) => setForm({ ...form, productivity_score: e.target.value })}
              />
            </label>
          </div>
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
            {busy ? 'Saving…' : 'Save activity'}
          </button>
        </form>

        <div className="panel">
          <h2>Recent</h2>
          {items.length === 0 ? (
            <p className="muted">No activities logged yet.</p>
          ) : (
            <ul className="record-list">
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p className="muted">
                      {item.activity_date} · {categoryLabel(item.category)} · {item.duration_minutes}{' '}
                      min · {STATUS_LABELS[item.status] || item.status || 'To Do'}
                      {item.due_date ? ` · Due ${item.due_date}` : ' · Ongoing'}
                    </p>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => remove(item.id)}>
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
