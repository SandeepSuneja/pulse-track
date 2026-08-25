import { useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { CATEGORIES, categoryColors, categoryLabel } from '../constants'

const TASK_SECTIONS = [
  { id: 'activities', label: 'Activities' },
  { id: 'details', label: 'Task information' },
]

export const COLUMNS = [
  { id: 'todo', label: 'To Do', accent: '#8BA3C7', soft: 'rgba(139,163,199,0.1)' },
  { id: 'in_progress', label: 'In Progress', accent: '#22D3EE', soft: 'rgba(34,211,238,0.1)' },
  { id: 'completed', label: 'Done', accent: '#34D399', soft: 'rgba(52,211,153,0.1)' },
]

function ticketKey(id) {
  return `PT-${id}`
}

function formatDue(dueDate) {
  if (!dueDate) return null
  return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'completed') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${dueDate}T00:00:00`) < today
}

const emptyForm = () => ({
  title: '',
  category: 'work',
  status: 'todo',
  notes: '',
  start_date: '',
  due_date: '',
  goal_id: '',
})

function taskToForm(task) {
  return {
    title: task.title || '',
    category: task.category || 'work',
    status: task.status || 'todo',
    notes: task.notes || '',
    start_date: task.start_date || '',
    due_date: task.due_date || '',
    goal_id: task.goal_id ? String(task.goal_id) : '',
  }
}

const labelSx = {
  display: 'block',
  mb: 0.75,
  fontSize: '0.8125rem',
  fontWeight: 650,
  color: '#C5D4E8',
  letterSpacing: '-0.01em',
}

const whiteCalendarIcon =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23E8F1FF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E\")"

const controlSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(5,10,18,0.55)',
    borderRadius: '10px',
    minHeight: 42,
  },
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    py: 1.1,
  },
  '& input[type="date"]': {
    colorScheme: 'dark',
  },
  '& input[type="date"]::-webkit-calendar-picker-indicator': {
    cursor: 'pointer',
    opacity: 1,
    width: '1.1rem',
    height: '1.1rem',
    backgroundColor: 'transparent',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: '1.1rem 1.1rem',
    backgroundImage: whiteCalendarIcon,
    filter: 'none',
  },
}

function FieldLabel({ children, htmlFor, id }) {
  return (
    <Typography component="label" htmlFor={htmlFor} id={id} sx={labelSx}>
      {children}
    </Typography>
  )
}

function Field({ children }) {
  return <Box sx={{ width: '100%', minWidth: 0 }}>{children}</Box>
}

export default function Board() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [goals, setGoals] = useState([])
  const [error, setError] = useState('')
  const [draggingId, setDraggingId] = useState(null)
  const [dropColumn, setDropColumn] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [taskActivities, setTaskActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [dialogSection, setDialogSection] = useState('details')
  const [categoryMenuWidth, setCategoryMenuWidth] = useState(null)
  const categoryFieldRef = useRef(null)
  const suppressClickRef = useRef(false)

  const isEditing = editingId != null
  const showActivitiesSection = isEditing && dialogSection === 'activities'
  const showDetailsSection = !isEditing || dialogSection === 'details'
  const activeGoals = useMemo(
    () => goals.filter((g) => (g.status || 'active') === 'active'),
    [goals],
  )
  const goalsForCategory = useMemo(
    () => activeGoals.filter((g) => g.category === form.category),
    [activeGoals, form.category],
  )

  async function load() {
    const [tasks, goalList] = await Promise.all([api.listTasks(token), api.listGoals(token)])
    setItems(tasks)
    setGoals(goalList)
  }

  useEffect(() => {
    if (!token) return
    load().catch((err) => setError(err.message))
  }, [token])

  const byStatus = useMemo(() => {
    const map = { todo: [], in_progress: [], completed: [] }
    for (const item of items) {
      const status = COLUMNS.some((c) => c.id === item.status) ? item.status : 'todo'
      map[status].push(item)
    }
    return map
  }, [items])

  function openCreate(status = 'todo') {
    setEditingId(null)
    setTaskActivities([])
    setDialogSection('details')
    setForm({ ...emptyForm(), status })
    setDialogOpen(true)
  }

  async function openEdit(task) {
    setEditingId(task.id)
    setForm(taskToForm(task))
    setTaskActivities([])
    setDialogSection((task.activity_count || 0) > 0 ? 'activities' : 'details')
    setDialogOpen(true)
    setActivitiesLoading(true)
    try {
      const logs = await api.listActivities(token, { task_id: task.id })
      setTaskActivities(logs)
      setDialogSection(logs.length > 0 ? 'activities' : 'details')
    } catch (err) {
      setError(err.message)
      setTaskActivities([])
      setDialogSection('details')
    } finally {
      setActivitiesLoading(false)
    }
  }

  function closeDialog() {
    if (busy) return
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm())
    setTaskActivities([])
    setDialogSection('details')
  }

  function resetDialog() {
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm())
    setTaskActivities([])
    setDialogSection('details')
  }

  async function moveTicket(id, status) {
    const prev = items
    setItems((list) => list.map((item) => (item.id === id ? { ...item, status } : item)))
    try {
      await api.updateTask(token, id, { status })
    } catch (err) {
      setItems(prev)
      setError(err.message)
    }
  }

  async function onSave(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const payload = {
      title: form.title.trim(),
      category: form.category,
      notes: form.notes,
      status: form.status || 'todo',
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      goal_id: form.goal_id ? Number(form.goal_id) : null,
    }
    try {
      if (isEditing) {
        await api.updateTask(token, editingId, payload)
      } else {
        await api.createTask(token, payload)
      }
      resetDialog()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function removeTicket(id) {
    const prev = items
    setItems((list) => list.filter((item) => item.id !== id))
    if (editingId === id) closeDialog()
    try {
      await api.deleteTask(token, id)
    } catch (err) {
      setItems(prev)
      setError(err.message)
    }
  }

  return (
    <Box sx={{ position: 'relative', pb: 2 }}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2.5, width: '100%' }}
      >
        <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
          <Typography variant="h1">Board</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 480 }}>
            Drag tasks between columns. Only <strong>In Progress</strong> tasks can be logged in
            Activities.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openCreate('todo')}
          sx={{ ml: 'auto', flexShrink: 0, alignSelf: 'flex-start' }}
        >
          New task
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 1.75,
          alignItems: 'stretch',
        }}
      >
        {COLUMNS.map((column) => {
          const count = byStatus[column.id].length
          const isDropTarget = dropColumn === column.id
          return (
            <Box
              key={column.id}
              onDragOver={(e) => {
                e.preventDefault()
                setDropColumn(column.id)
              }}
              onDragLeave={() => setDropColumn((current) => (current === column.id ? null : current))}
              onDrop={(e) => {
                e.preventDefault()
                const id = Number(e.dataTransfer.getData('text/ticket-id') || draggingId)
                setDropColumn(null)
                setDraggingId(null)
                if (!id) return
                const ticket = items.find((item) => item.id === id)
                if (!ticket || ticket.status === column.id) return
                void moveTicket(id, column.id)
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: { xs: 280, md: 'calc(100vh - 200px)' },
                maxHeight: { md: 'calc(100vh - 200px)' },
                borderRadius: '14px',
                bgcolor: isDropTarget ? column.soft : '#121C2E',
                border: '1px solid',
                borderColor: isDropTarget ? column.accent : 'rgba(34,211,238,0.12)',
                boxShadow: isDropTarget
                  ? `0 0 0 2px ${column.accent}22`
                  : '0 0 0 1px rgba(34,211,238,0.06)',
                transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
                overflow: 'hidden',
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 1.75,
                  py: 1.35,
                  borderBottom: '1px solid rgba(34,211,238,0.1)',
                  bgcolor: column.soft,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: column.accent,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      letterSpacing: '-0.01em',
                      color: '#E8F1FF',
                    }}
                  >
                    {column.label}
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      minWidth: 22,
                      height: 22,
                      px: 0.75,
                      borderRadius: '999px',
                      display: 'inline-grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(34,211,238,0.12)',
                      color: '#8BA3C7',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                    }}
                  >
                    {count}
                  </Box>
                </Stack>
                {column.id === 'todo' && (
                  <Tooltip title="Add to To Do">
                    <IconButton
                      size="small"
                      aria-label="Add task to To Do"
                      onClick={() => openCreate('todo')}
                      sx={{ color: '#8BA3C7' }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>

              <Stack
                spacing={1}
                sx={{
                  flex: 1,
                  p: 1.25,
                  overflowY: 'auto',
                  minHeight: 0,
                }}
              >
                <AnimatePresence initial={false}>
                  {byStatus[column.id].map((ticket) => {
                    const cat = categoryColors(ticket.category)
                    const dueLabel = formatDue(ticket.due_date)
                    const overdue = isOverdue(ticket.due_date, ticket.status)
                    const dragging = draggingId === ticket.id
                    return (
                      <motion.div
                        key={ticket.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: dragging ? 0.55 : 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.18 }}
                      >
                        <Box
                          draggable
                          onDragStart={(e) => {
                            suppressClickRef.current = false
                            setDraggingId(ticket.id)
                            e.dataTransfer.setData('text/ticket-id', String(ticket.id))
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDrag={() => {
                            suppressClickRef.current = true
                          }}
                          onDragEnd={() => {
                            setDraggingId(null)
                            setDropColumn(null)
                            window.setTimeout(() => {
                              suppressClickRef.current = false
                            }, 0)
                          }}
                          onClick={() => {
                            if (suppressClickRef.current) return
                            openEdit(ticket)
                          }}
                          sx={{
                            position: 'relative',
                            cursor: 'grab',
                            userSelect: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.25,
                            p: 1.5,
                            pl: 1.75,
                            borderRadius: '12px',
                            bgcolor: '#121C2E',
                            border: '1px solid rgba(34,211,238,0.07)',
                            boxShadow: dragging
                              ? '0 12px 28px rgba(0,0,0,0.45)'
                              : '0 0 0 1px rgba(34,211,238,0.05)',
                            transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
                            '&:hover': {
                              borderColor: 'rgba(34,211,238,0.2)',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                              transform: 'translateY(-1px)',
                              '& .ticket-actions': { opacity: 1 },
                            },
                            '&:active': { cursor: 'grabbing', transform: 'none' },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 3,
                              borderRadius: '12px 0 0 12px',
                              bgcolor: cat.fg,
                            },
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                sx={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  color: '#8BA3C7',
                                  mb: 0.45,
                                }}
                              >
                                {ticketKey(ticket.id)}
                              </Typography>
                              <Typography
                                sx={{
                                  fontFamily: 'Syne, sans-serif',
                                  fontWeight: 650,
                                  fontSize: '0.9rem',
                                  lineHeight: 1.35,
                                  letterSpacing: '-0.015em',
                                  color: '#E8F1FF',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {ticket.title}
                              </Typography>
                              {dueLabel && (
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={0.4}
                                  sx={{
                                    mt: 0.65,
                                    color: overdue ? '#DC2626' : '#8BA3C7',
                                    fontSize: '0.72rem',
                                    fontWeight: 650,
                                  }}
                                >
                                  <EventOutlinedIcon sx={{ fontSize: 14 }} />
                                  <Box component="span">{dueLabel}</Box>
                                </Stack>
                              )}
                              {ticket.goal_title && (
                                <Typography
                                  sx={{
                                    mt: 0.55,
                                    fontSize: '0.7rem',
                                    fontWeight: 650,
                                    color: '#67E8F9',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  Goal · {ticket.goal_title}
                                </Typography>
                              )}
                            </Box>
                            <Stack
                              className="ticket-actions"
                              direction="row"
                              spacing={0.15}
                              sx={{
                                flexShrink: 0,
                                opacity: { xs: 1, md: 0 },
                                transition: 'opacity 0.15s ease',
                                mt: -0.35,
                                mr: -0.5,
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  aria-label={`Edit ${ticketKey(ticket.id)}`}
                                  onClick={() => openEdit(ticket)}
                                  sx={{
                                    color: '#8BA3C7',
                                    '&:hover': { color: '#22D3EE', bgcolor: 'rgba(34,211,238,0.12)' },
                                  }}
                                >
                                  <EditOutlinedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  aria-label={`Delete ${ticketKey(ticket.id)}`}
                                  onClick={() => removeTicket(ticket.id)}
                                  sx={{
                                    color: '#8BA3C7',
                                    '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.08)' },
                                  }}
                                >
                                  <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>

                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            gap={1}
                          >
                            <Typography
                              sx={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#8BA3C7',
                              }}
                            >
                              {ticket.activity_count || 0}{' '}
                              {(ticket.activity_count || 0) === 1 ? 'activity' : 'activities'}
                              {(ticket.logged_minutes || 0) > 0
                                ? ` · ${ticket.logged_minutes} min`
                                : ''}
                            </Typography>
                            <Box
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                maxWidth: '55%',
                                px: 0.5,
                                py: 0.5,
                                borderRadius: '6px',
                                bgcolor: cat.bg,
                                color: cat.fg,
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                lineHeight: 1.2,
                                letterSpacing: '-0.01em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                right: 15,
                                position: 'absolute'
                              }}
                            >
                              {categoryLabel(ticket.category)}
                            </Box>
                          </Stack>
                        </Box>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {count === 0 && (
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 120,
                      display: 'grid',
                      placeItems: 'center',
                      border: '1px dashed rgba(34,211,238,0.12)',
                      borderRadius: '10px',
                      px: 2,
                      py: 3,
                      textAlign: 'center',
                      color: 'text.secondary',
                      bgcolor: 'rgba(248,250,252,0.8)',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                        {column.id === 'in_progress'
                          ? 'Drop tasks here to log time'
                          : column.id === 'todo'
                            ? 'No tasks yet'
                            : 'Drop tasks here'}
                      </Typography>
                      {column.id === 'todo' && (
                        <Button size="small" onClick={() => openCreate('todo')} sx={{ mt: 0.5 }}>
                          Add task
                        </Button>
                      )}
                    </Box>
                  </Box>
                )}
              </Stack>
            </Box>
          )
        })}
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(92vh, 860px)',
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
              {isEditing ? 'Edit task' : 'New task'}
            </Typography>
            {isEditing && (
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {ticketKey(editingId)}
              </Typography>
            )}
          </Box>
          <IconButton onClick={closeDialog} disabled={busy} aria-label="Close" size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box
          component="form"
          onSubmit={onSave}
          sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
        >
          <DialogContent sx={{ px: '24px !important', py: '20px !important', overflowY: 'auto' }}>
            <Stack spacing={2.25}>
              {isEditing && (
                <Box
                  role="tablist"
                  aria-label="Task sections"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 1,
                  }}
                >
                  {TASK_SECTIONS.map((section) => {
                    const selected = dialogSection === section.id
                    const count =
                      section.id === 'activities' && !activitiesLoading
                        ? taskActivities.length
                        : null
                    return (
                      <Button
                        key={section.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        fullWidth
                        onClick={() => setDialogSection(section.id)}
                        sx={{
                          minHeight: 40,
                          px: 1,
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                          border: '1.5px solid',
                          borderColor: selected ? '#22D3EE' : 'rgba(34,211,238,0.2)',
                          color: selected ? '#22D3EE' : '#8BA3C7',
                          bgcolor: selected ? 'rgba(34,211,238,0.1)' : 'rgba(5,10,18,0.55)',
                          '&:hover': {
                            borderColor: '#22D3EE',
                            bgcolor: 'rgba(34,211,238,0.1)',
                          },
                        }}
                      >
                        {section.label}
                        {count != null ? ` (${count})` : ''}
                      </Button>
                    )
                  })}
                </Box>
              )}

              {showActivitiesSection && (
                <Box>
                  {activitiesLoading ? (
                    <Typography sx={{ fontSize: '0.85rem', color: '#8BA3C7', py: 1.5 }}>
                      Loading activity logs…
                    </Typography>
                  ) : taskActivities.length === 0 ? (
                    <Box
                      sx={{
                        py: 2.5,
                        px: 1.75,
                        borderRadius: '12px',
                        bgcolor: 'rgba(5,10,18,0.55)',
                        border: '1px dashed rgba(34,211,238,0.12)',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.85rem', color: '#8BA3C7', fontWeight: 600 }}>
                        No activities logged for this task yet.
                      </Typography>
                      <Typography sx={{ mt: 0.5, fontSize: '0.78rem', color: '#8BA3C7' }}>
                        Log time from the{' '}
                        <Box
                          component={RouterLink}
                          to="/activities"
                          sx={{ color: '#22D3EE', fontWeight: 650, textDecoration: 'none' }}
                        >
                          Activities
                        </Box>{' '}
                        page, or switch to Task information to edit this task.
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1} sx={{ maxHeight: 'min(52vh, 420px)', overflowY: 'auto', pr: 0.5 }}>
                      {taskActivities.map((log) => (
                        <Box
                          key={log.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 1.5,
                            px: 1.5,
                            py: 1.2,
                            borderRadius: '12px',
                            bgcolor: 'rgba(5,10,18,0.55)',
                            border: '1px solid rgba(34,211,238,0.1)',
                          }}
                        >
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              sx={{
                                fontSize: '0.85rem',
                                fontWeight: 650,
                                color: '#E8F1FF',
                                lineHeight: 1.3,
                              }}
                            >
                              {new Date(`${log.activity_date}T00:00:00`).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Typography>
                            {log.notes ? (
                              <Typography
                                sx={{
                                  mt: 0.35,
                                  fontSize: '0.78rem',
                                  color: '#8BA3C7',
                                  lineHeight: 1.35,
                                  wordBreak: 'break-word',
                                }}
                              >
                                {log.notes}
                              </Typography>
                            ) : null}
                          </Box>
                          <Typography
                            sx={{
                              flexShrink: 0,
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: '#22D3EE',
                              bgcolor: 'rgba(34,211,238,0.12)',
                              px: 0.9,
                              py: 0.35,
                              borderRadius: '8px',
                            }}
                          >
                            {log.duration_minutes} min
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}

              {showDetailsSection && (
                <>
                  <Field>
                    <FieldLabel htmlFor="task-title">Title</FieldLabel>
                    <TextField
                      id="task-title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="What needs to move forward?"
                      required={showDetailsSection}
                      autoFocus={!isEditing || dialogSection === 'details'}
                      fullWidth
                      sx={controlSx}
                    />
                  </Field>

                  <Field>
                    <FieldLabel id="task-status-label">Status</FieldLabel>
                    <Box
                      role="group"
                      aria-labelledby="task-status-label"
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 1,
                      }}
                    >
                      {COLUMNS.map((column) => {
                        const selected = form.status === column.id
                        return (
                          <Button
                            key={column.id}
                            type="button"
                            fullWidth
                            onClick={() => setForm({ ...form, status: column.id })}
                            sx={{
                              minHeight: 40,
                              px: 0.5,
                              borderRadius: '10px',
                              fontWeight: 700,
                              fontSize: { xs: '0.72rem', sm: '0.8rem' },
                              border: '1.5px solid',
                              borderColor: selected ? column.accent : 'rgba(34,211,238,0.2)',
                              color: selected ? column.accent : '#8BA3C7',
                              bgcolor: selected ? column.soft : 'rgba(5,10,18,0.55)',
                              '&:hover': {
                                borderColor: column.accent,
                                bgcolor: column.soft,
                              },
                            }}
                          >
                            {column.label}
                          </Button>
                        )
                      })}
                    </Box>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="task-category">Category</FieldLabel>
                    <TextField
                      id="task-category"
                      select
                      value={form.category}
                      onChange={(e) => {
                        const category = e.target.value
                        const linked = activeGoals.find((g) => String(g.id) === String(form.goal_id))
                        const stillValid = linked && linked.category === category
                        setForm({
                          ...form,
                          category,
                          goal_id: stillValid ? form.goal_id : '',
                        })
                      }}
                      fullWidth
                      inputRef={categoryFieldRef}
                      sx={controlSx}
                      SelectProps={{
                        renderValue: (value) => {
                          const colors = categoryColors(value)
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: colors.fg,
                                  flexShrink: 0,
                                }}
                              />
                              <Box
                                component="span"
                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              >
                                {categoryLabel(value)}
                              </Box>
                            </Box>
                          )
                        },
                        MenuProps: {
                          anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                          transformOrigin: { vertical: 'top', horizontal: 'left' },
                          PaperProps: {
                            sx: {
                              mt: 0.75,
                              borderRadius: '12px',
                              border: '1px solid rgba(34,211,238,0.08)',
                              boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                              width: categoryMenuWidth ? `${categoryMenuWidth}px` : undefined,
                              maxWidth: categoryMenuWidth ? `${categoryMenuWidth}px` : undefined,
                              minWidth: categoryMenuWidth ? `${categoryMenuWidth}px !important` : undefined,
                            },
                          },
                        },
                        onOpen: () => {
                          const root = categoryFieldRef.current?.closest?.('.MuiOutlinedInput-root')
                          const width = root?.offsetWidth || categoryFieldRef.current?.offsetWidth
                          if (width) setCategoryMenuWidth(width)
                        },
                      }}
                    >
                      {CATEGORIES.map((c) => {
                        const colors = categoryColors(c.id)
                        return (
                          <MenuItem key={c.id} value={c.id} sx={{ gap: 1.25, borderRadius: '8px', mx: 0.5 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: colors.fg,
                                flexShrink: 0,
                              }}
                            />
                            {c.label}
                          </MenuItem>
                        )
                      })}
                    </TextField>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="task-goal">Goal</FieldLabel>
                    <TextField
                      id="task-goal"
                      select
                      value={form.goal_id}
                      onChange={(e) => setForm({ ...form, goal_id: e.target.value })}
                      fullWidth
                      sx={controlSx}
                      SelectProps={{
                        displayEmpty: true,
                      }}
                    >
                      <MenuItem value="">
                        <em>No goal</em>
                      </MenuItem>
                      {goalsForCategory.map((g) => (
                        <MenuItem key={g.id} value={String(g.id)}>
                          {g.title}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Typography sx={{ mt: 0.6, fontSize: '0.75rem', color: '#8BA3C7' }}>
                      {goalsForCategory.length === 0
                        ? 'No active goals in this category yet.'
                        : 'Link this task to an active goal.'}
                    </Typography>
                  </Field>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <Field>
                      <FieldLabel htmlFor="task-start">Start date</FieldLabel>
                      <TextField
                        id="task-start"
                        type="date"
                        value={form.start_date}
                        onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                        fullWidth
                        sx={controlSx}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="task-due">Due date</FieldLabel>
                      <TextField
                        id="task-due"
                        type="date"
                        value={form.due_date}
                        onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                        fullWidth
                        sx={controlSx}
                      />
                      <Typography sx={{ mt: 0.6, fontSize: '0.75rem', color: '#8BA3C7' }}>
                        Leave blank if ongoing
                      </Typography>
                    </Field>
                  </Box>

                  <Field>
                    <FieldLabel htmlFor="task-notes">Description</FieldLabel>
                    <TextField
                      id="task-notes"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Context, links, notes…"
                      fullWidth
                      multiline
                      minRows={3}
                      sx={controlSx}
                    />
                  </Field>
                </>
              )}
            </Stack>
          </DialogContent>

          <DialogActions
            sx={{
              flexShrink: 0,
              px: 3,
              py: 2,
              gap: 1,
              m: 0,
              borderTop: '1px solid rgba(34,211,238,0.08)',
              bgcolor: 'rgba(5,10,18,0.55)',
              justifyContent: isEditing ? 'space-between' : 'flex-end',
            }}
          >
            {isEditing ? (
              <Button
                color="error"
                disabled={busy}
                onClick={() => {
                  void removeTicket(editingId)
                }}
                startIcon={<DeleteOutlinedIcon />}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Stack direction="row" spacing={1}>
              <Button onClick={closeDialog} disabled={busy} sx={{ color: '#8BA3C7' }}>
                Cancel
              </Button>
              {showDetailsSection ? (
                <Button
                  key="save-task"
                  type="submit"
                  variant="contained"
                  disabled={busy || !form.title.trim()}
                >
                  {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Create task'}
                </Button>
              ) : (
                <Button
                  key="goto-details"
                  type="button"
                  variant="contained"
                  onClick={(e) => {
                    // Defer section switch so this click cannot land on the
                    // Save submit button that replaces this control.
                    e.preventDefault()
                    e.stopPropagation()
                    queueMicrotask(() => setDialogSection('details'))
                  }}
                >
                  Task information
                </Button>
              )}
            </Stack>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
