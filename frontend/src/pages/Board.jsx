import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import AllInclusiveOutlinedIcon from '@mui/icons-material/AllInclusiveOutlined'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { CATEGORIES, categoryColors, categoryLabel } from '../constants'

export const COLUMNS = [
  { id: 'todo', label: 'To Do', accent: '#94A3B8', glow: 'rgba(148,163,184,0.16)' },
  { id: 'in_progress', label: 'In Progress', accent: '#3B82F6', glow: 'rgba(59,130,246,0.16)' },
  { id: 'completed', label: 'Done', accent: '#22C55E', glow: 'rgba(34,197,94,0.16)' },
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
  notes: '',
  duration_minutes: 60,
  hasDueDate: false,
  due_date: new Date().toISOString().slice(0, 10),
})

export default function Board() {
  const { token } = useAuth()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [draggingId, setDraggingId] = useState(null)
  const [dropColumn, setDropColumn] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm)

  async function load() {
    const data = await api.listActivities(token)
    setItems(data)
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

  async function moveTicket(id, status) {
    const prev = items
    setItems((list) => list.map((item) => (item.id === id ? { ...item, status } : item)))
    try {
      await api.updateActivity(token, id, { status })
    } catch (err) {
      setItems(prev)
      setError(err.message)
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.createActivity(token, {
        title: form.title,
        category: form.category,
        notes: form.notes,
        status: 'todo',
        activity_date: new Date().toISOString().slice(0, 10),
        due_date: form.hasDueDate ? form.due_date : null,
        duration_minutes: Number(form.duration_minutes) || 60,
      })
      setForm(emptyForm())
      setShowCreate(false)
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
    try {
      await api.deleteActivity(token, id)
    } catch (err) {
      setItems(prev)
      setError(err.message)
    }
  }

  return (
    <Box className="page" sx={{ position: 'relative', pb: 8 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h1">Board</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Drag tickets across lanes — status updates instantly.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        {COLUMNS.map((column, columnIndex) => (
          <motion.div
            key={column.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: columnIndex * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Box
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
                minHeight: 440,
                height: '100%',
                p: 1.5,
                borderRadius: '18px',
                border: '1px solid',
                borderColor: dropColumn === column.id ? column.accent : 'rgba(11,18,32,0.06)',
                bgcolor: dropColumn === column.id ? column.glow : 'rgba(255,255,255,0.55)',
                backgroundImage:
                  dropColumn === column.id
                    ? 'none'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.8), rgba(241,245,249,0.9))',
                boxShadow:
                  dropColumn === column.id
                    ? `0 0 0 3px ${column.glow}, 0 12px 28px rgba(11,18,32,0.08)`
                    : '0 8px 24px rgba(11,18,32,0.04)',
                transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5, px: 0.25 }}>
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
                      fontFamily: 'Sora, sans-serif',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {column.label}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    minWidth: 26,
                    height: 26,
                    px: 0.75,
                    borderRadius: '8px',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'rgba(15,23,42,0.06)',
                    fontWeight: 700,
                    fontSize: 0.75,
                  }}
                >
                  {byStatus[column.id].length}
                </Box>
              </Stack>

              <Stack spacing={1.25} sx={{ minHeight: 120 }}>
                <AnimatePresence initial={false}>
                  {byStatus[column.id].map((ticket) => {
                    const cat = categoryColors(ticket.category)
                    const dueLabel = formatDue(ticket.due_date)
                    const overdue = isOverdue(ticket.due_date, ticket.status)
                    return (
                      <motion.div
                        key={ticket.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{
                          opacity: draggingId === ticket.id ? 0.7 : 1,
                          scale: draggingId === ticket.id ? 1.03 : 1,
                          y: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        whileHover={{ y: -3 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                      >
                        <Box
                          draggable
                          onDragStart={(e) => {
                            setDraggingId(ticket.id)
                            e.dataTransfer.setData('text/ticket-id', String(ticket.id))
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={() => {
                            setDraggingId(null)
                            setDropColumn(null)
                          }}
                          sx={{
                            position: 'relative',
                            cursor: 'grab',
                            userSelect: 'none',
                            p: 1.5,
                            pl: 1.75,
                            borderRadius: '14px',
                            bgcolor: '#fff',
                            border: '1px solid rgba(11,18,32,0.06)',
                            overflow: 'hidden',
                            boxShadow:
                              draggingId === ticket.id
                                ? '0 16px 36px rgba(11,18,32,0.16)'
                                : '0 4px 14px rgba(11,18,32,0.05)',
                            '&:active': { cursor: 'grabbing' },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 3,
                              bgcolor: column.accent,
                            },
                            transition: 'box-shadow 0.2s ease',
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.45 }} />
                              <Typography variant="caption" fontWeight={700} color="text.secondary">
                                {ticketKey(ticket.id)}
                              </Typography>
                            </Stack>
                            <IconButton
                              size="small"
                              aria-label={`Delete ${ticketKey(ticket.id)}`}
                              onClick={() => removeTicket(ticket.id)}
                              sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'error.main', bgcolor: 'rgba(239,68,68,0.08)' },
                              }}
                            >
                              <DeleteOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Stack>

                          <Typography fontWeight={650} sx={{ mb: 1.25, lineHeight: 1.35, pr: 0.5 }}>
                            {ticket.title}
                          </Typography>

                          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                            <Chip
                              size="small"
                              label={categoryLabel(ticket.category)}
                              sx={{
                                bgcolor: cat.bg,
                                color: cat.fg,
                                fontWeight: 700,
                                fontSize: 0.7,
                                height: 24,
                              }}
                            />
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                              {dueLabel ? (
                                <Chip
                                  size="small"
                                  icon={<EventOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                                  label={dueLabel}
                                  color={overdue ? 'error' : 'default'}
                                  variant={overdue ? 'filled' : 'outlined'}
                                  sx={{ height: 24, fontSize: 0.68, fontWeight: 700 }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  icon={<AllInclusiveOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                                  label="Ongoing"
                                  variant="outlined"
                                  sx={{ height: 24, fontSize: 0.68, fontWeight: 700 }}
                                />
                              )}
                            </Stack>
                          </Stack>
                        </Box>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {byStatus[column.id].length === 0 && (
                  <Box
                    sx={{
                      border: '1px dashed rgba(15,23,42,0.16)',
                      borderRadius: '16px',
                      p: 3.5,
                      textAlign: 'center',
                      color: 'text.secondary',
                      bgcolor: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      Drop tickets here
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </motion.div>
        ))}
      </Box>

      <Fab
        color="primary"
        aria-label="Create ticket"
        onClick={() => setShowCreate(true)}
        sx={{ position: 'fixed', right: 28, bottom: 28 }}
      >
        <AddIcon />
      </Fab>

      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundImage:
              'radial-gradient(520px 180px at 0% 0%, rgba(59,130,246,0.1), transparent 55%)',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              New work item
            </Typography>
            <Typography sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>Create ticket</Typography>
          </Box>
          <IconButton onClick={() => setShowCreate(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Box component="form" onSubmit={onCreate}>
          <DialogContent dividers sx={{ borderColor: 'rgba(15,23,42,0.06)' }}>
            <Stack spacing={2.2}>
              <TextField
                label="Summary"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What needs to move forward?"
                required
                autoFocus
                fullWidth
              />
              <TextField
                select
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                fullWidth
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.hasDueDate}
                    onChange={(e) => setForm({ ...form, hasDueDate: e.target.checked })}
                  />
                }
                label={form.hasDueDate ? 'Has due date' : 'Indefinite (no due date)'}
              />
              {form.hasDueDate && (
                <TextField
                  label="Due date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
              )}
              <TextField
                label="Estimate (min)"
                type="number"
                inputProps={{ min: 1 }}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                fullWidth
              />
              <TextField
                label="Description"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Context, links, acceptance notes…"
                fullWidth
                multiline
                minRows={3}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2.2 }}>
            <Button onClick={() => setShowCreate(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? 'Creating…' : 'Create ticket'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
