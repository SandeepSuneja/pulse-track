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
import { CATEGORIES, categoryLabel } from '../constants'
import {
  SLEEP_QUALITY_LABEL,
  SLEEP_QUALITY_STYLE,
  classifySleepQuality,
  sleepDurationMinutes,
  toTimeInputValue,
} from '../sleep'
import { combineDuration, formatDuration, splitDuration } from '../duration'

const emptyForm = () => ({
  task_id: '',
  notes: '',
  activity_date: new Date().toISOString().slice(0, 10),
  duration_hours: 1,
  duration_minutes: 0,
  sleep_start_time: '23:00',
  sleep_end_time: '06:30',
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
  const [items, setItems] = useState([])
  const [tasks, setTasks] = useState([])
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
    setForm({
      ...emptyForm(),
      task_id: defaultTaskId(),
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
      notes: item.notes || '',
      activity_date: item.activity_date,
      duration_hours: parts.hours,
      duration_minutes: parts.minutes,
      sleep_start_time: toTimeInputValue(item.sleep_start_time) || '23:00',
      sleep_end_time: toTimeInputValue(item.sleep_end_time) || '06:30',
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
    setForm({
      ...emptyForm(),
      task_id: defaultTaskId(),
    })
  }

  const selectedTask = tasks.find((t) => String(t.id) === String(form.task_id))
  const formCategory = isEditing ? editingCategory : selectedTask?.category || ''
  const isSleepForm = formCategory === 'sleep'
  const sleepMinutes = isSleepForm
    ? sleepDurationMinutes(form.sleep_start_time, form.sleep_end_time)
    : null
  const sleepQuality = isSleepForm
    ? classifySleepQuality(form.sleep_start_time, form.sleep_end_time)
    : null

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
    setBusy(true)
    setError('')
    try {
      if (isEditing) {
        const body = {
          notes: form.notes,
          activity_date: form.activity_date,
        }
        if (isSleepForm) {
          body.sleep_start_time = form.sleep_start_time
          body.sleep_end_time = form.sleep_end_time
          body.duration_minutes = sleepMinutes
        } else {
          body.duration_minutes = combineDuration(form.duration_hours, form.duration_minutes)
        }
        await api.updateActivity(token, editingId, body)
      } else {
        const body = {
          task_id: Number(form.task_id),
          notes: form.notes,
          activity_date: form.activity_date,
        }
        if (isSleepForm) {
          body.sleep_start_time = form.sleep_start_time
          body.sleep_end_time = form.sleep_end_time
          body.duration_minutes = sleepMinutes
        } else {
          body.duration_minutes = combineDuration(form.duration_hours, form.duration_minutes)
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
              {CATEGORIES.map((cat) => (
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
                    ? ` · ${formatDuration(selectedTask.logged_minutes)} logged`
                    : ''}
                </p>
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
                    Ideal: 11:00–11:30 PM → 6:00–6:30 AM · Normal: 11:30 PM–12:30 AM → 6:30–7:30
                    AM · otherwise Bad
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
