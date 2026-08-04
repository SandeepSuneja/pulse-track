import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'

export default function Profile() {
  const { token, user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ display_name: '', bio: '', timezone: 'UTC' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
  }, [token])

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
    </div>
  )
}
