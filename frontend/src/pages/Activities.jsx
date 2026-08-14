import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { categoryLabel } from '../constants'

const emptyForm = () => ({
  task_id: '',
  notes: '',
  activity_date: new Date().toISOString().slice(0, 10),
  duration_minutes: 60,
})

export default function Activities() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isEditing = editingId != null

  async function load({ preserveForm = false } = {}) {
    const [logs, boardTasks] = await Promise.all([
      api.listActivities(token),
      api.listTasks(token, { status: 'in_progress' }),
    ])
    setItems(logs)
    setTasks(boardTasks)
    if (preserveForm) return
    setForm((prev) => {
      const stillValid = boardTasks.some((t) => String(t.id) === String(prev.task_id))
      if (stillValid) return prev
      return {
        ...prev,
        task_id: boardTasks.length > 0 ? String(boardTasks[0].id) : '',
      }
    })
  }

  useEffect(() => {
    if (!token) return
    load().catch((err) => setError(err.message))
  }, [token])

  function startEdit(item) {
    setEditingId(item.id)
    setEditingTitle(item.title || '')
    setForm({
      task_id: item.task_id ? String(item.task_id) : '',
      notes: item.notes || '',
      activity_date: item.activity_date,
      duration_minutes: item.duration_minutes,
    })
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
    setForm((prev) => {
      const stillValid = tasks.some((t) => String(t.id) === String(prev.task_id))
      return {
        ...emptyForm(),
        task_id: stillValid
          ? prev.task_id
          : tasks.length > 0
            ? String(tasks[0].id)
            : '',
      }
    })
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!isEditing && !form.task_id) {
      setError('Move a task to In Progress on the Board, then log time here.')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (isEditing) {
        await api.updateActivity(token, editingId, {
          notes: form.notes,
          activity_date: form.activity_date,
          duration_minutes: Number(form.duration_minutes),
        })
        setEditingId(null)
        setEditingTitle('')
        setForm((prev) => ({
          ...emptyForm(),
          task_id: prev.task_id,
        }))
      } else {
        await api.createActivity(token, {
          task_id: Number(form.task_id),
          notes: form.notes,
          activity_date: form.activity_date,
          duration_minutes: Number(form.duration_minutes),
        })
        setForm((prev) => ({
          ...emptyForm(),
          task_id: prev.task_id,
        }))
      }
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    await api.deleteActivity(token, id)
    if (editingId === id) {
      cancelEdit()
    }
    await load({ preserveForm: editingId != null && editingId !== id })
  }

  const selectedTask = tasks.find((t) => String(t.id) === String(form.task_id))

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Activities</h1>
          <p className="muted">
            Log time against <strong>In Progress</strong> tasks. Matching category time also advances{' '}
            <Link to="/goals">Goals</Link>. Create and move tasks on the <Link to="/">Board</Link>.
          </p>
        </div>
      </header>

      <div className="grid-2">
        <form className="panel stack" onSubmit={onSubmit}>
          <h2>{isEditing ? 'Edit activity' : 'Log activity'}</h2>
          {isEditing ? (
            <p className="muted">
              Task:{' '}
              <strong>
                {form.task_id ? `PT-${form.task_id}` : '—'}
                {editingTitle ? ` · ${editingTitle}` : ''}
              </strong>
            </p>
          ) : tasks.length === 0 ? (
            <p className="muted">
              No In Progress tasks. Move a task to In Progress on the <Link to="/">Board</Link>, then
              come back to log time.
            </p>
          ) : (
            <label>
              Task
              <select
                value={form.task_id}
                onChange={(e) => setForm({ ...form, task_id: e.target.value })}
                required
              >
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    PT-{task.id} · {task.title} ({categoryLabel(task.category)})
                  </option>
                ))}
              </select>
            </label>
          )}
          {!isEditing && selectedTask && (selectedTask.activity_count || 0) > 0 && (
            <p className="muted">
              {selectedTask.activity_count}{' '}
              {selectedTask.activity_count === 1 ? 'activity' : 'activities'}
              {(selectedTask.logged_minutes || 0) > 0
                ? ` · ${selectedTask.logged_minutes} min logged`
                : ''}
            </p>
          )}
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
          <label>
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="row-2" style={{ alignItems: 'center' }}>
            <button type="submit" disabled={busy || (!isEditing && tasks.length === 0)}>
              {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Save log'}
            </button>
            {isEditing && (
              <button type="button" className="ghost-btn" disabled={busy} onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="panel">
          <h2>Recent logs</h2>
          {items.length === 0 ? (
            <p className="muted">No activity logs yet.</p>
          ) : (
            <ul className="record-list">
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p className="muted">
                      {item.activity_date} · {categoryLabel(item.category)} · {item.duration_minutes}{' '}
                      min
                      {item.task_id ? ` · PT-${item.task_id}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => startEdit(item)}
                      disabled={busy}
                    >
                      {editingId === item.id ? 'Editing…' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => remove(item.id)}
                      disabled={busy}
                    >
                      Delete
                    </button>
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
