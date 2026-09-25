import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCategories } from '../CategoryContext'
import { PRESET_CATEGORY_COLORS } from '../constants'
import CategoryColorPicker, { normalizeHex } from './CategoryColorPicker'

/**
 * Create or edit a custom category (name + color picker).
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   mode?: 'create' | 'edit',
 *   initial?: { id: number, label: string, color: string, slug?: string } | null,
 *   onSaved?: (slug: string) => void,
 * }} props
 */
export default function CategoryFormDialog({
  open,
  onClose,
  mode = 'create',
  initial = null,
  onSaved,
}) {
  const { createCategory, updateCategory } = useCategories()
  const isEdit = mode === 'edit' && initial?.id != null
  const [label, setLabel] = useState('')
  const [color, setColor] = useState(PRESET_CATEGORY_COLORS[6])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      setLabel(initial.label || '')
      setColor(normalizeHex(initial.color) || PRESET_CATEGORY_COLORS[6])
    } else {
      setLabel('')
      setColor(PRESET_CATEGORY_COLORS[6])
    }
    setError('')
    setBusy(false)
  }, [open, isEdit, initial])

  function handleClose() {
    if (busy) return
    onClose()
  }

  async function onSubmit(e) {
    e.preventDefault()
    const name = label.trim()
    if (!name) {
      setError('Enter a category name.')
      return
    }
    const hex = normalizeHex(color)
    if (!hex) {
      setError('Pick a valid color (e.g. #22D3EE).')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (isEdit) {
        const updated = await updateCategory(initial.id, { label: name, color: hex })
        onClose()
        onSaved?.(updated.slug || initial.slug)
      } else {
        const created = await createCategory({ label: name, color: hex })
        onClose()
        onSaved?.(created.slug)
      }
    } catch (err) {
      setError(err.message || (isEdit ? 'Could not update category' : 'Could not create category'))
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={onSubmit}>
        <DialogTitle sx={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
          {isEdit ? 'Edit category' : 'New category'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Name"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
              required
              placeholder="e.g. Side projects"
            />
            <CategoryColorPicker value={color} onChange={setColor} disabled={busy} />
            {error ? (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
