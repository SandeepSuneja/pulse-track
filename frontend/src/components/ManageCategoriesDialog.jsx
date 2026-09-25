import { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useCategories } from '../CategoryContext'
import CategoryFormDialog from './CategoryFormDialog'

/**
 * List / create / edit / delete custom categories.
 * @param {{ open: boolean, onClose: () => void, onChanged?: () => void }} props
 */
export default function ManageCategoriesDialog({ open, onClose, onChanged }) {
  const { token } = useAuth()
  const { deleteCategory, refresh } = useCategories()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    if (!token) {
      setRows([])
      return
    }
    const list = await api.listCustomCategories(token)
    setRows(list || [])
  }, [token])

  useEffect(() => {
    if (!open) return
    setError('')
    load().catch((err) => setError(err.message))
  }, [open, load])

  function openCreate() {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row) {
    setFormMode('edit')
    setEditing(row)
    setFormOpen(true)
  }

  async function onDelete(row) {
    if (!window.confirm(`Delete “${row.label}”? Tasks using it must be reassigned first.`)) return
    setBusyId(row.id)
    setError('')
    try {
      await deleteCategory(row.id)
      await load()
      await refresh()
      onChanged?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, pr: 1.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ width: '100%' }}>
            Custom categories
            <IconButton
              aria-label="Create category"
              onClick={openCreate}
              size="small"
              edge="end"
              sx={{
                color: '#22D3EE',
                bgcolor: 'transparent',
                ml: 'auto',
                '&:hover': { bgcolor: 'rgba(34,211,238,0.08)' },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Create categories with your own color, then edit name or color anytime.
          </Typography>
          {error ? (
            <Typography color="error" variant="body2" sx={{ mb: 1.5 }}>
              {error}
            </Typography>
          ) : null}
          {rows.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No custom categories yet. Click + to add one.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {rows.map((row) => (
                <Box
                  key={row.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 1.25,
                    py: 1,
                    borderRadius: '12px',
                    border: '1px solid rgba(34,211,238,0.12)',
                    bgcolor: 'rgba(13,22,36,0.55)',
                  }}
                >
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      bgcolor: row.color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ flex: 1, minWidth: 0 }} noWrap>
                    {row.label}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={`Edit ${row.label}`}
                    onClick={() => openEdit(row)}
                    disabled={busyId === row.id}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Delete ${row.label}`}
                    onClick={() => onDelete(row)}
                    disabled={busyId === row.id}
                  >
                    <DeleteOutlinedIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <CategoryFormDialog
        open={formOpen}
        mode={formMode}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={async () => {
          await load()
          await refresh()
          onChanged?.()
        }}
      />
    </>
  )
}
