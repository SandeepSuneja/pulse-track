import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { CATEGORIES, categoryColors, categoryLabel } from '../constants'
import { formatDuration } from '../duration'

const emptyForm = () => ({
  title: '',
  category: 'work',
  mode: 'hours', // hours | due
  target_hours: 5,
  period: 'weekly',
  start_date: '',
  end_date: '',
  task_ids: [],
})

function goalToForm(goal) {
  const isDue = goal.period === 'deadline' || (!goal.target_minutes && goal.end_date)
  return {
    title: goal.title || '',
    category: goal.category || 'work',
    mode: isDue ? 'due' : 'hours',
    target_hours: goal.target_minutes ? goal.target_minutes / 60 : 5,
    period: isDue ? 'weekly' : goal.period || 'weekly',
    start_date: goal.start_date || '',
    end_date: goal.end_date || '',
    task_ids: (goal.task_ids || []).map(String),
  }
}

function isDeadlineGoal(goal) {
  return goal.period === 'deadline' || (!goal.target_minutes && goal.end_date)
}

function formatGoalMeta(goal) {
  const bits = []
  if (!isDeadlineGoal(goal) && goal.target_minutes) {
    const hours = goal.target_minutes / 60
    const hoursLabel = Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
    bits.push(`${hoursLabel} / ${goal.period}`)
  }
  if (goal.start_date) bits.push(`Starts ${goal.start_date}`)
  return bits.join(' · ')
}

function isPastDue(isoDate) {
  if (!isoDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${isoDate}T00:00:00`) < today
}

function statusLabel(status) {
  if (status === 'completed') return 'Completed'
  if (status === 'failed') return 'Failed'
  return 'Active'
}

function progressForGoal(goal, weekById, activities) {
  const linkedIds = new Set(goal.task_ids || [])
  if (isDeadlineGoal(goal)) {
    const start = goal.start_date || '1970-01-01'
    const end = goal.end_date || '9999-12-31'
    const actual = activities
      .filter((a) => {
        const inWindow = a.activity_date >= start && a.activity_date <= end
        if (!inWindow) return false
        if (linkedIds.size > 0) return linkedIds.has(a.task_id)
        return a.category === goal.category
      })
      .reduce((sum, a) => sum + (a.duration_minutes || 0), 0)
    return { actual_minutes: actual, target_minutes: 0, completion_pct: 0 }
  }
  return (
    weekById[goal.id] || {
      actual_minutes: 0,
      target_minutes: goal.target_minutes || 0,
      completion_pct: 0,
    }
  )
}

export default function Goals() {
  const { token } = useAuth()
  const [goals, setGoals] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [weekById, setWeekById] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isEditing = editingId != null
  const editingGoal = useMemo(
    () => goals.find((g) => g.id === editingId) || null,
    [goals, editingId],
  )
  const dueDateLocked = Boolean(editingGoal?.end_date)

  async function load() {
    const [goalList, boardTasks, logs, summary] = await Promise.all([
      api.listGoals(token),
      api.listTasks(token),
      api.listActivities(token),
      api.analytics(token, 'week'),
    ])
    setGoals(goalList)
    setAllTasks(boardTasks)
    setActivities(logs)
    const map = {}
    for (const item of summary.goal_progress || []) {
      map[item.goal_id] = item
    }
    setWeekById(map)
  }

  useEffect(() => {
    if (!token) return
    load().catch((err) => setError(err.message))
  }, [token])

  const selectableTasks = useMemo(() => {
    return allTasks.filter((t) => !form.category || t.category === form.category)
  }, [allTasks, form.category])

  function setMode(mode) {
    if (dueDateLocked && mode === 'hours') return
    setForm((prev) => ({
      ...prev,
      mode,
      ...(mode === 'hours'
        ? { end_date: dueDateLocked ? prev.end_date : '', period: prev.period === 'deadline' ? 'weekly' : prev.period }
        : { target_hours: prev.target_hours || 5 }),
    }))
  }

  function toggleTaskId(id) {
    const key = String(id)
    setForm((prev) => {
      const has = prev.task_ids.includes(key)
      return {
        ...prev,
        task_ids: has ? prev.task_ids.filter((x) => x !== key) : [...prev.task_ids, key],
      }
    })
  }

  function resetEditor() {
    setEditingId(null)
    setForm(emptyForm())
    setError('')
  }

  function startEdit(goal) {
    if (goal.status === 'failed') {
      setError('Failed goals cannot be edited.')
      return
    }
    if (goal.status === 'completed') {
      setError('Completed goals cannot be edited.')
      return
    }
    setEditingId(goal.id)
    setForm(goalToForm(goal))
    setError('')
  }

  function buildPayload() {
    const payload = {
      title: form.title.trim(),
      category: form.category,
      start_date: form.start_date || null,
      task_ids: form.task_ids.map(Number),
    }
    if (form.mode === 'hours') {
      const hours = Number(form.target_hours)
      if (!hours || hours <= 0) {
        throw new Error('Enter target hours.')
      }
      payload.target_minutes = Math.round(hours * 60)
      payload.period = form.period
      if (!dueDateLocked) payload.end_date = null
    } else {
      if (!form.end_date && !dueDateLocked) {
        throw new Error('Pick a due date.')
      }
      if (form.end_date) payload.end_date = form.end_date
      payload.period = 'deadline'
      payload.target_minutes = null
    }
    return payload
  }

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = buildPayload()
      if (isEditing) {
        // Never send end_date change when locked
        if (dueDateLocked) delete payload.end_date
        await api.updateGoal(token, editingId, payload)
        resetEditor()
      } else {
        await api.createGoal(token, payload)
        setForm(emptyForm())
      }
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function completeGoal(goal) {
    setBusy(true)
    setError('')
    try {
      await api.updateGoal(token, goal.id, { status: 'completed' })
      if (editingId === goal.id) resetEditor()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(goal) {
    if ((goal.status || (goal.is_active ? 'active' : 'completed')) === 'failed') {
      setError('Failed goals cannot be deleted.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api.deleteGoal(token, goal.id)
      if (editingId === goal.id) resetEditor()
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
          <h1>Goals</h1>
          <p className="muted">
            Link Board tasks to a goal, track progress from Activity logs, then mark the goal
            complete. Missed due dates fail automatically.
          </p>
        </div>
      </header>

      <div className="grid-2 goals-layout">
        <form className="panel stack goals-editor" onSubmit={onSubmit}>
          <h2>{isEditing ? 'Edit goal' : 'New goal'}</h2>
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
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value,
                  task_ids: form.task_ids.filter((id) => {
                    const task = allTasks.find((t) => String(t.id) === id)
                    return task && task.category === e.target.value
                  }),
                })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="muted" style={{ marginBottom: 8, fontWeight: 650 }}>
              Target type
            </p>
            <div className="period-toggle" role="group" aria-label="Target type">
              <button
                type="button"
                className={form.mode === 'hours' ? 'active' : ''}
                onClick={() => setMode('hours')}
                disabled={dueDateLocked}
              >
                Target hours
              </button>
              <button
                type="button"
                className={form.mode === 'due' ? 'active' : ''}
                onClick={() => setMode('due')}
              >
                Due date
              </button>
            </div>
          </div>

          {form.mode === 'hours' ? (
            <div className="row-2">
              <label>
                Target hours
                <input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={form.target_hours}
                  onChange={(e) => setForm({ ...form, target_hours: e.target.value })}
                  required
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
          ) : (
            <label>
              Due date {dueDateLocked ? <span className="muted">(locked)</span> : null}
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required={!dueDateLocked}
                disabled={dueDateLocked}
              />
            </label>
          )}

          <label>
            Start date <span className="muted">(optional)</span>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </label>

          <div>
            <p className="muted" style={{ marginBottom: 8, fontWeight: 650 }}>
              Associated Board tasks
            </p>
            {selectableTasks.length === 0 ? (
              <p className="muted">
                No {categoryLabel(form.category)} tasks yet. Create them on the{' '}
                <Link to="/">Board</Link>, then link them here.
              </p>
            ) : (
              <ul className="task-pick-list">
                {selectableTasks.map((task) => (
                  <li key={task.id}>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={form.task_ids.includes(String(task.id))}
                        onChange={() => toggleTaskId(task.id)}
                      />
                      <span>
                        PT-{task.id} · {task.title}{' '}
                        <span className="muted">({task.status.replace('_', ' ')})</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="error">{error}</p>}
          <div className="row-2" style={{ alignItems: 'center' }}>
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Create goal'}
            </button>
            {isEditing && (
              <button type="button" className="ghost-btn" disabled={busy} onClick={resetEditor}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="panel goals-list-panel">
          <h2>Your goals</h2>
          {goals.length === 0 ? (
            <p className="muted">No goals yet. Create one and link Board tasks.</p>
          ) : (
            <ul className="goal-manage-list goals-list-body">
              {goals.map((g) => {
                const progress = progressForGoal(g, weekById, activities)
                const status = g.status || (g.is_active ? 'active' : 'completed')
                const colors = categoryColors(g.category)
                const pct = Math.min(Math.round(progress.completion_pct || 0), 100)
                const isActive = status === 'active'
                const isEditingThis = editingId === g.id
                return (
                  <li
                    key={g.id}
                    className={`goal-manage-item status-${status}${isEditingThis ? ' is-editing' : ''}`}
                    style={{ '--goal-accent': colors.fg }}
                  >
                    <div className="goal-card-accent" aria-hidden />
                    <div className="goal-card-body">
                      <div className="goal-card-top">
                        <div className="goal-card-title-block">
                          <div className="goal-title-row">
                            <strong>{g.title}</strong>
                            <span className={`goal-status-pill ${status}`}>
                              {statusLabel(status)}
                            </span>
                          </div>
                          <div className="goal-card-tags">
                            <span
                              className="goal-cat-chip"
                              style={{ background: colors.bg, color: colors.fg }}
                            >
                              {categoryLabel(g.category)}
                            </span>
                            {isDeadlineGoal(g) && g.end_date && (
                              <span
                                className={`goal-due-chip${
                                  status === 'failed' || isPastDue(g.end_date)
                                    ? ' is-overdue'
                                    : ''
                                }`}
                              >
                                Due {g.end_date}
                              </span>
                            )}
                            {formatGoalMeta(g) ? (
                              <span className="goal-card-meta">{formatGoalMeta(g)}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="goal-manage-actions">
                          {isActive && (
                            <>
                              <button
                                type="button"
                                className="ghost-btn ghost-btn-sm"
                                onClick={() => startEdit(g)}
                                disabled={busy}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ghost-btn ghost-btn-sm ghost-btn-accent"
                                onClick={() => completeGoal(g)}
                                disabled={busy}
                              >
                                Complete
                              </button>
                            </>
                          )}
                          {status !== 'failed' && (
                            <button
                              type="button"
                              className="ghost-btn ghost-btn-sm ghost-btn-danger"
                              onClick={() => remove(g)}
                              disabled={busy}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {(g.tasks || []).length > 0 && (
                        <div className="goal-task-chips">
                          {g.tasks.map((t) => (
                            <span key={t.id} className="goal-task-chip">
                              PT-{t.id} · {t.title}
                            </span>
                          ))}
                        </div>
                      )}

                      {isActive && (
                        <div className="goal-progress-block">
                          <div className="goal-progress-stats">
                            <span>
                              {progress.target_minutes
                                ? `${formatDuration(progress.actual_minutes)} / ${formatDuration(progress.target_minutes)}`
                                : formatDuration(progress.actual_minutes)}
                            </span>
                            {progress.target_minutes > 0 ? (
                              <span className="goal-progress-pct">{pct}%</span>
                            ) : (
                              <span className="muted">logged</span>
                            )}
                          </div>
                          {progress.target_minutes > 0 && (
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {status === 'failed' && (
                        <p className="goal-failed-note">
                          Due date {g.end_date} was missed — this goal failed.
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
