import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useCategories } from '../CategoryContext'
import {
  SLEEP_QUALITY_LABEL,
  SLEEP_QUALITY_STYLE,
  classifySleepQuality,
  sleepDurationMinutes,
  toTimeInputValue,
} from '../sleep'
import { combineDuration, formatDuration, splitDuration } from '../duration'
import {
  HEALTH_ACTIVITY_CARDIO,
  HEALTH_CARDIO_WALKING_RUNNING,
} from '../constants/health'

function defaultGoalIdForTask(task) {
  if (!task?.goal_ids?.length) return ''
  if (task.goal_ids.length === 1) return String(task.goal_ids[0])
  return ''
}

function goalChoicesForTask(task) {
  if (!task?.goal_ids?.length) return []
  return task.goal_ids.map((id, index) => ({
    id,
    title: task.goal_titles?.[index] || `Goal ${id}`,
  }))
}

const emptyForm = () => ({
  task_id: '',
  goal_id: '',
  notes: '',
  activity_date: new Date().toISOString().slice(0, 10),
  duration_hours: 1,
  duration_minutes: 0,
  sleep_start_time: '23:00',
  sleep_end_time: '06:30',
  distance_km: '',
})

const emptyFilters = () => ({
  search: '',
  category: '',
  task_id: '',
  start_date: '',
  end_date: '',
})

function SleepQualityBadge({ quality }) {
  if (!quality) return null
  const style = SLEEP_QUALITY_STYLE[quality] || SLEEP_QUALITY_STYLE.bad
  return (
    <span
      className="sleep-quality-badge"
      style={{ background: style.bg, color: style.fg }}
    >
      {SLEEP_QUALITY_LABEL[quality] || quality}
    </span>
  )
}

export default function Activities() {
  const { token } = useAuth()
  const { categories, categoryLabel } = useCategories()
  const [items, setItems] = useState([])
  const [tasks, setTasks] = useState([])
  const [taskCatalog, setTaskCatalog] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [filters, setFilters] = useState(emptyFilters)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingCategory, setEditingCategory] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isEditing = editingId != null

  async function load({ preserveForm = false } = {}) {
    const [logs, boardTasks, allBoardTasks] = await Promise.all([
      api.listActivities(token),
      api.listTasks(token, { status: 'in_progress' }),
      api.listTasks(token),
    ])
    setItems(logs)
    setTasks(boardTasks)
    setTaskCatalog(allBoardTasks)
    if (preserveForm) return
    setForm((prev) => {
      const stillValid = boardTasks.some((t) => String(t.id) === String(prev.task_id))
      if (stillValid) return prev
      const nextTask = boardTasks[0]
      return {
        ...prev,
        task_id: nextTask ? String(nextTask.id) : '',
        goal_id: nextTask ? defaultGoalIdForTask(nextTask) : '',
      }
    })
  }

  useEffect(() => {
    if (!token) return
    load().catch((err) => setError(err.message))
  }, [token])

  const taskFilterOptions = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      if (!item.task_id) continue
      if (!map.has(item.task_id)) {
        map.set(item.task_id, item.title || `PT-${item.task_id}`)
      }
    }
    return [...map.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.id - b.id)
  }, [items])

  const filteredItems = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    return items.filter((item) => {
      if (filters.category && item.category !== filters.category) return false
      if (filters.task_id && String(item.task_id) !== filters.task_id) return false
      if (filters.start_date && item.activity_date < filters.start_date) return false
      if (filters.end_date && item.activity_date > filters.end_date) return false
      if (search) {
        const quality = item.sleep_quality || ''
        const haystack =
          `${item.title || ''} ${item.notes || ''} PT-${item.task_id || ''} ${quality}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      return true
    })
  }, [items, filters])

  const filteredMinutes = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (item.duration_minutes || 0), 0),
    [filteredItems],
  )

  const filtersActive = Boolean(
    filters.search ||
      filters.category ||
      filters.task_id ||
      filters.start_date ||
      filters.end_date,
  )

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters(emptyFilters())
  }

  function defaultTaskId(boardTasks = tasks) {
    return boardTasks.length > 0 ? String(boardTasks[0].id) : ''
  }

  function openCreate() {
    setEditingId(null)
    setEditingTitle('')
    setEditingCategory('')
    const tid = defaultTaskId()
    const task = tasks.find((t) => String(t.id) === tid)
    setForm({
      ...emptyForm(),
      task_id: tid,
      goal_id: defaultGoalIdForTask(task),
    })
    setError('')
    setDialogOpen(true)
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditingTitle(item.title || '')
    setEditingCategory(item.category || '')
    const parts = splitDuration(item.duration_minutes)
    setForm({
      task_id: item.task_id ? String(item.task_id) : '',
      goal_id: item.goal_id ? String(item.goal_id) : '',
      notes: item.notes || '',
      activity_date: item.activity_date,
      duration_hours: parts.hours,
      duration_minutes: parts.minutes,
      sleep_start_time: toTimeInputValue(item.sleep_start_time) || '23:00',
      sleep_end_time: toTimeInputValue(item.sleep_end_time) || '06:30',
      distance_km: item.distance_km != null ? String(item.distance_km) : '',
    })
    setError('')
    setDialogOpen(true)
  }

  function closeDialog() {
    if (busy) return
    setDialogOpen(false)
    setEditingId(null)
    setEditingTitle('')
    setEditingCategory('')
    setError('')
    const tid = defaultTaskId()
    const task = tasks.find((t) => String(t.id) === tid)
    setForm({
      ...emptyForm(),
      task_id: tid,
      goal_id: defaultGoalIdForTask(task),
    })
  }

  const selectedTask = tasks.find((t) => String(t.id) === String(form.task_id))
  const taskForGoals =
    taskCatalog.find((t) => String(t.id) === String(form.task_id)) || selectedTask
  const taskGoalChoices = useMemo(
    () => goalChoicesForTask(taskForGoals),
    [taskForGoals],
  )
  const formCategory = isEditing ? editingCategory : selectedTask?.category || ''
  const isSleepForm = formCategory === 'sleep'
  const sleepMinutes = isSleepForm
    ? sleepDurationMinutes(form.sleep_start_time, form.sleep_end_time)
    : null
  const sleepQuality = isSleepForm
    ? classifySleepQuality(form.sleep_start_time, form.sleep_end_time)
    : null
  const showDistance =
    !isSleepForm &&
    formCategory === 'health' &&
    ((selectedTask?.health_activity_type === HEALTH_ACTIVITY_CARDIO &&
      selectedTask?.health_cardio_type === HEALTH_CARDIO_WALKING_RUNNING) ||
      (isEditing && form.distance_km !== ''))

  async function onSubmit(e) {
    e.preventDefault()
    if (!isEditing && !form.task_id) {
      setError('Move a task to In Progress on the Board, then log time here.')
      return
    }
    if (isSleepForm) {
      if (!form.sleep_start_time || !form.sleep_end_time) {
        setError('Enter sleep start time and wake-up time.')
        return
      }
      if (form.sleep_start_time === form.sleep_end_time) {
        setError('Wake-up time must differ from sleep start time.')
        return
      }
      if (!sleepMinutes || sleepMinutes < 1) {
        setError('Could not calculate sleep duration from those times.')
        return
      }
    } else {
      const total = combineDuration(form.duration_hours, form.duration_minutes)
      if (total < 1) {
        setError('Enter a duration of at least 1 minute.')
        return
      }
      if (total > 24 * 60) {
        setError('Duration cannot exceed 24 hours.')
        return
      }
    }
    if (taskGoalChoices.length > 1 && !form.goal_id) {
      setError('Select which goal this time counts toward.')
      return
    }
    setBusy(true)
    setError('')
    const goalPayload =
      taskGoalChoices.length > 0
        ? { goal_id: form.goal_id ? Number(form.goal_id) : null }
        : {}
    try {
      if (isEditing) {
        const body = {
          notes: form.notes,
          activity_date: form.activity_date,
          ...goalPayload,
        }
        if (isSleepForm) {
          body.sleep_start_time = form.sleep_start_time
          body.sleep_end_time = form.sleep_end_time
          body.duration_minutes = sleepMinutes
        } else {
          body.duration_minutes = combineDuration(form.duration_hours, form.duration_minutes)
          if (showDistance && form.distance_km.trim()) {
            body.distance_km = Number(form.distance_km)
          }
        }
        await api.updateActivity(token, editingId, body)
      } else {
        const body = {
          task_id: Number(form.task_id),
          notes: form.notes,
          activity_date: form.activity_date,
          ...goalPayload,
        }
        if (isSleepForm) {
          body.sleep_start_time = form.sleep_start_time
          body.sleep_end_time = form.sleep_end_time
          body.duration_minutes = sleepMinutes
        } else {
          body.duration_minutes = combineDuration(form.duration_hours, form.duration_minutes)
          if (showDistance && form.distance_km.trim()) {
            body.distance_km = Number(form.distance_km)
          }
        }
        await api.createActivity(token, body)
      }
      setDialogOpen(false)
      setEditingId(null)
      setEditingTitle('')
      setEditingCategory('')
      setForm({
        ...emptyForm(),
        task_id: isEditing ? defaultTaskId() : form.task_id,
      })
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
      closeDialog()
    }
    await load({ preserveForm: editingId != null && editingId !== id })
  }

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

      <section className="panel stack activities-logs">
        <div className="activities-logs-head">
          <div>
            <h2>Activity logs</h2>
            <p className="muted">
              {filteredItems.length === items.length
                ? `${items.length} log${items.length === 1 ? '' : 's'}`
                : `${filteredItems.length} of ${items.length} logs`}
              {filteredItems.length > 0 ? ` · ${formatDuration(filteredMinutes)}` : ''}
            </p>
          </div>
          <div className="activities-logs-actions">
            {filtersActive && (
              <button type="button" className="ghost-btn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              New activity
            </Button>
          </div>
        </div>

        <div className="table-filters">
          <label>
            Search
            <input
              type="search"
              placeholder="Task, notes, PT-id…"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
          </label>
          <label>
            Category
            <select
              value={filters.category}
              onChange={(e) => setFilter('category', e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Task
            <select
              value={filters.task_id}
              onChange={(e) => setFilter('task_id', e.target.value)}
            >
              <option value="">All tasks</option>
              {taskFilterOptions.map((task) => (
                <option key={task.id} value={task.id}>
                  PT-{task.id} · {task.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilter('start_date', e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilter('end_date', e.target.value)}
            />
          </label>
        </div>

        {items.length === 0 ? (
          <p className="muted">No activity logs yet. Use New activity to log time.</p>
        ) : filteredItems.length === 0 ? (
          <p className="muted">No logs match these filters.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Task</th>
                  <th>Category</th>
                  <th>Goal</th>
                  <th className="num">Duration</th>
                  <th>Notes</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className={editingId === item.id ? 'is-editing' : undefined}>
                    <td className="nowrap">{item.activity_date}</td>
                    <td>
                      <div className="table-primary">{item.title || 'Untitled'}</div>
                      {item.task_id ? (
                        <div className="table-secondary">PT-{item.task_id}</div>
                      ) : null}
                    </td>
                    <td>
                      <div>{categoryLabel(item.category)}</div>
                      {item.category === 'sleep' && item.sleep_quality ? (
                        <div className="table-secondary" style={{ marginTop: 4 }}>
                          <SleepQualityBadge quality={item.sleep_quality} />
                        </div>
                      ) : null}
                    </td>
                    <td>{item.goal_title || '—'}</td>
                    <td className="num nowrap">
                      {formatDuration(item.duration_minutes)}
                      {item.category === 'sleep' && item.sleep_start_time && item.sleep_end_time ? (
                        <div className="table-secondary">
                          {toTimeInputValue(item.sleep_start_time)} →{' '}
                          {toTimeInputValue(item.sleep_end_time)}
                        </div>
                      ) : null}
                    </td>
                    <td className="notes-cell">{item.notes || '—'}</td>
                    <td className="actions">
                      <div className="table-actions">
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => startEdit(item)}
                          disabled={busy}
                        >
                          {editingId === item.id && dialogOpen ? 'Editing…' : 'Edit'}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(92vh, 720px)',
            overflow: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 3,
            py: 2,
            borderBottom: '1px solid rgba(34,211,238,0.08)',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '-0.02em',
              }}
            >
              {isEditing ? 'Edit activity' : 'New activity'}
            </Typography>
            {isEditing && (
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {form.task_id ? `PT-${form.task_id}` : '—'}
                {editingTitle ? ` · ${editingTitle}` : ''}
              </Typography>
            )}
          </Box>
          <IconButton onClick={closeDialog} disabled={busy} aria-label="Close" size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
        >
          <DialogContent sx={{ px: '24px !important', py: '20px !important', overflowY: 'auto' }}>
            <div className="stack">
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
                  No In Progress tasks. Move a task to In Progress on the{' '}
                  <Link to="/" onClick={closeDialog}>
                    Board
                  </Link>
                  , then come back to log time.
                </p>
              ) : (
                <label>
                  Task
                  <select
                    value={form.task_id}
                    onChange={(e) => {
                      const task = tasks.find((t) => String(t.id) === e.target.value)
                      setForm({
                        ...form,
                        task_id: e.target.value,
                        goal_id: defaultGoalIdForTask(task),
                      })
                    }}
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
                    ? ` · ${formatDuration(selectedTask.logged_minutes)} logged`
                    : ''}
                </p>
              )}
              {taskGoalChoices.length > 0 && (
                <label>
                  Goal
                  <select
                    value={form.goal_id}
                    onChange={(e) => setForm({ ...form, goal_id: e.target.value })}
                    required={taskGoalChoices.length > 1}
                  >
                    {taskGoalChoices.length > 1 && (
                      <option value="">Select a goal…</option>
                    )}
                    {taskGoalChoices.length === 1 && (
                      <option value="">Not attributed to a goal</option>
                    )}
                    {taskGoalChoices.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                  <span className="muted" style={{ display: 'block', marginTop: 6, fontSize: '0.85rem' }}>
                    {taskGoalChoices.length > 1
                      ? 'Required — this task is linked to multiple goals.'
                      : 'Optional — attribute this log to the linked goal.'}
                  </span>
                </label>
              )}
              <label>
                Date
                <input
                  type="date"
                  value={form.activity_date}
                  onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
                  required
                />
              </label>
              {isSleepForm ? (
                <>
                  <div className="row-2">
                    <label>
                      Sleep start
                      <input
                        type="time"
                        value={form.sleep_start_time}
                        onChange={(e) =>
                          setForm({ ...form, sleep_start_time: e.target.value })
                        }
                        required
                      />
                    </label>
                    <label>
                      Wake up
                      <input
                        type="time"
                        value={form.sleep_end_time}
                        onChange={(e) => setForm({ ...form, sleep_end_time: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <p className="muted">
                    Duration:{' '}
                    <strong>
                      {sleepMinutes != null ? formatDuration(sleepMinutes) : '—'}
                    </strong>
                    {sleepQuality ? (
                      <>
                        {' '}
                        · Quality: <SleepQualityBadge quality={sleepQuality} />
                      </>
                    ) : null}
                  </p>
                  <p className="muted" style={{ fontSize: '0.85rem' }}>
                    Ideal: wake 6:00–6:30 AM · Normal: wake 6:30–7:30 AM · both need ≥ 7 hrs
                    sleep · otherwise Bad
                  </p>
                </>
              ) : (
                <div className="row-2">
                  <label>
                    Hours
                    <input
                      type="number"
                      min={0}
                      max={24}
                      value={form.duration_hours}
                      onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Minutes
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                      required
                    />
                  </label>
                </div>
              )}
              {showDistance && (
                <label>
                  Distance (km){' '}
                  <span className="muted">optional — walking or running</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.distance_km}
                    onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
                  />
                </label>
              )}
              <label>
                Notes{isSleepForm ? ' (optional)' : ''}
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
              {error && <p className="error">{error}</p>}
            </div>
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              py: 2,
              borderTop: '1px solid rgba(34,211,238,0.08)',
              gap: 1,
            }}
          >
            <Button onClick={closeDialog} disabled={busy} sx={{ color: '#8BA3C7' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={busy || (!isEditing && tasks.length === 0)}
            >
              {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Save log'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </div>
  )
}
