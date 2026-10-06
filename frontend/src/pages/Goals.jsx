import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useCategories } from '../CategoryContext'
import CategoryFormDialog from '../components/CategoryFormDialog'
import ManageCategoriesDialog from '../components/ManageCategoriesDialog'
import GoalProgressBar from '../components/GoalProgressBar'

const emptyForm = () => ({
  title: '',
  category: 'work',
  mode: 'hours',
  target_hours: 5,
  period: 'weekly',
  start_date: '',
  end_date: '',
  task_ids: [],
  completion_pct: 0,
  status: 'active',
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
    completion_pct: goal.completion_pct ?? 0,
    status: goal.status || (goal.is_active ? 'active' : 'completed'),
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

function clampPct(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
}

export default function Goals() {
  const { token } = useAuth()
  const { categories, categoryColors, categoryLabel } = useCategories()
  const [goals, setGoals] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)

  const isEditing = editingId != null
  const editingGoal = useMemo(
    () => goals.find((g) => g.id === editingId) || null,
    [goals, editingId],
  )
  const dueDateLocked = Boolean(isEditing && editingGoal?.end_date)

  async function load() {
    const [goalList, boardTasks] = await Promise.all([
      api.listGoals(token),
      api.listTasks(token),
    ])
    setGoals(goalList)
    setAllTasks(boardTasks)
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
        ? {
            end_date: dueDateLocked ? prev.end_date : '',
            period: prev.period === 'deadline' ? 'weekly' : prev.period,
          }
        : { target_hours: prev.target_hours || 5 }),
    }))
  }

  function selectTaskId(id) {
    const key = String(id)
    setForm((prev) => ({
      ...prev,
      task_ids: prev.task_ids.includes(key) ? [] : [key],
    }))
  }

  function resetEditor() {
    setEditingId(null)
    setForm(emptyForm())
    setError('')
  }

  function startEdit(goal) {
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
      if (isEditing) {
        const payload = buildPayload()
        if (dueDateLocked) delete payload.end_date
        payload.completion_pct = clampPct(form.completion_pct)
        payload.status = form.status
        await api.updateGoal(token, editingId, payload)
        resetEditor()
      } else {
        await api.createGoal(token, buildPayload())
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
    const status = goal.status || (goal.is_active ? 'active' : 'completed')
    if (status !== 'active') {
      setError('Completed and failed goals cannot be deleted.')
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

  const editorAccent = categoryColors(form.category)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Goals</h1>
          <p className="muted">
            Create goals or edit any goal (active, completed, or failed): details, status, linked
            tasks, and task completion %.
          </p>
        </div>
      </header>

      <div className="grid-2 split-panels-layout goals-layout">
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
              onChange={(e) => {
                const category = e.target.value
                if (category === '__create__') {
                  setCreateCategoryOpen(true)
                  return
                }
                if (category === '__manage__') {
                  setManageCategoriesOpen(true)
                  return
                }
                setForm({
                  ...form,
                  category,
                  task_ids: form.task_ids.filter((id) => {
                    const task = allTasks.find((t) => String(t.id) === id)
                    return task && task.category === category
                  }),
                })
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
              <option value="__create__">+ Create category…</option>
              <option value="__manage__">Manage categories…</option>
            </select>
          </label>

          {isEditing && (
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          )}

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

          {isEditing && (
            <>
              <p className="muted" style={{ marginBottom: 0, fontWeight: 650 }}>
                Task completion
              </p>
              <GoalProgressBar
                pct={form.completion_pct}
                accentColor={editorAccent.fg}
                status={form.status}
                editable
                disabled={busy}
                onPctChange={(pct) => setForm({ ...form, completion_pct: clampPct(pct) })}
              />
              <label>
                Completion (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form.completion_pct}
                  disabled={busy}
                  onChange={(e) =>
                    setForm({ ...form, completion_pct: clampPct(e.target.value) })
                  }
                />
              </label>
            </>
          )}

          <div>
            <p className="muted" style={{ marginBottom: 8, fontWeight: 650 }}>
              Associated Board task
            </p>
            {selectableTasks.length === 0 ? (
              <p className="muted">
                No {categoryLabel(form.category)} tasks yet. Create them on the{' '}
                <Link to="/">Board</Link>, then link them here.
              </p>
            ) : (
              <ul className="task-pick-list">
                <li>
                  <label className="check-row">
                    <input
                      type="radio"
                      name="goal-linked-task"
                      checked={form.task_ids.length === 0}
                      onChange={() => setForm((prev) => ({ ...prev, task_ids: [] }))}
                    />
                    <span className="muted">No linked task</span>
                  </label>
                </li>
                {selectableTasks.map((task) => (
                  <li key={task.id}>
                    <label className="check-row">
                      <input
                        type="radio"
                        name="goal-linked-task"
                        checked={form.task_ids.includes(String(task.id))}
                        onChange={() => selectTaskId(task.id)}
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
            <div className="goals-list-scroll split-panel-scroll">
              <ul className="goal-manage-list">
              {goals.map((g) => {
                const status = g.status || (g.is_active ? 'active' : 'completed')
                const completionPct = g.completion_pct ?? 0
                const colors = categoryColors(g.category)
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
                        {isActive && (
                        <div className="goal-manage-actions">
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
                          <button
                            type="button"
                            className="ghost-btn ghost-btn-sm ghost-btn-danger"
                            onClick={() => remove(g)}
                            disabled={busy}
                          >
                            Delete
                          </button>
                        </div>
                        )}
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

                      <GoalProgressBar
                        pct={completionPct}
                        accentColor={colors.fg}
                        status={status}
                      />

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
            </div>
          )}
        </div>
      </div>

      <CategoryFormDialog
        open={createCategoryOpen}
        mode="create"
        onClose={() => setCreateCategoryOpen(false)}
        onSaved={(slug) => {
          setForm((prev) => ({ ...prev, category: slug, task_ids: [] }))
        }}
      />
      <ManageCategoriesDialog
        open={manageCategoriesOpen}
        onClose={() => setManageCategoriesOpen(false)}
      />
    </div>
  )
}
