import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useCategories } from '../CategoryContext'
import CategoryFormDialog from '../components/CategoryFormDialog'

export default function Profile() {
  const { token, user } = useAuth()
  const { deleteCategory, refresh } = useCategories()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ display_name: '', bio: '', timezone: 'UTC' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [customRows, setCustomRows] = useState([])
  const [catError, setCatError] = useState('')
  const [catMessage, setCatMessage] = useState('')
  const [catBusyId, setCatBusyId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editing, setEditing] = useState(null)

  const loadCustom = useCallback(async () => {
    if (!token) {
      setCustomRows([])
      return
    }
    const rows = await api.listCustomCategories(token)
    setCustomRows(rows || [])
  }, [token])

  useEffect(() => {
    if (!token) return
    api
      .me(token)
      .then((data) => {
        setProfile(data)
        setForm({
          display_name: data.display_name || '',
          bio: data.bio || '',
          timezone: data.timezone || 'UTC',
        })
      })
      .catch((err) => setError(err.message))
    loadCustom().catch((err) => setCatError(err.message))
  }, [token, loadCustom])

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const updated = await api.updateMe(token, form)
      setProfile(updated)
      setMessage('Profile saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function openCreate() {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
    setCatError('')
    setCatMessage('')
  }

  function openEdit(row) {
    setFormMode('edit')
    setEditing(row)
    setFormOpen(true)
    setCatError('')
    setCatMessage('')
  }

  async function removeCategory(row) {
    if (!window.confirm(`Delete “${row.label}”? Tasks using it must be reassigned first.`)) {
      return
    }
    setCatBusyId(row.id)
    setCatError('')
    setCatMessage('')
    try {
      await deleteCategory(row.id)
      setCatMessage('Category deleted.')
      await loadCustom()
      await refresh()
    } catch (err) {
      setCatError(err.message)
    } finally {
      setCatBusyId(null)
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Profile</h1>
          <p className="muted">Your identity in Pulse Track — separate from other users.</p>
        </div>
      </header>

      <form className="panel stack narrow" onSubmit={onSubmit}>
        <label>
          Email
          <input value={profile?.email || user?.email || ''} disabled />
        </label>
        <label>
          Display name
          <input
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          />
        </label>
        <label>
          Timezone
          <input
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            placeholder="e.g. Asia/Kolkata"
          />
        </label>
        <label>
          Bio
          <textarea
            rows={4}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </label>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <section className="panel stack narrow" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Custom categories</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Pick a color with the color picker when you create a category. Edit name or color anytime.
            </p>
          </div>
          <button type="button" onClick={openCreate}>
            New category
          </button>
        </div>

        {catError && <p className="error">{catError}</p>}
        {catMessage && <p className="success">{catMessage}</p>}

        {customRows.length === 0 ? (
          <p className="muted">No custom categories yet.</p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 10 }}>
            {customRows.map((row) => (
              <li
                key={row.id}
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  justifyContent: 'space-between',
                  borderRadius: 12,
                  border: '1px solid rgba(34,211,238,0.12)',
                  background: 'rgba(13,22,36,0.6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: row.color,
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  />
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.label}</strong>
                </div>
                <div className="chip-row">
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={catBusyId === row.id}
                    onClick={() => openEdit(row)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={catBusyId === row.id}
                    onClick={() => removeCategory(row)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CategoryFormDialog
        open={formOpen}
        mode={formMode}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={async () => {
          setCatMessage(formMode === 'edit' ? 'Category updated.' : 'Category created.')
          await loadCustom()
          await refresh()
        }}
      />
    </div>
  )
}
