import { useMemo } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function ApiDocs() {
  const docsUrl = useMemo(() => `${API_URL.replace(/\/$/, '')}/docs`, [])
  const openApiUrl = useMemo(() => `${API_URL.replace(/\/$/, '')}/openapi.json`, [])
  const redocUrl = useMemo(() => `${API_URL.replace(/\/$/, '')}/redoc`, [])

  return (
    <div className="page api-docs-page">
      <header className="page-head">
        <div>
          <h1>API docs</h1>
          <p className="muted">
            Interactive Swagger UI for the Pulse Track REST API. Use Authorize with a Firebase
            ID token (or <code>dev:&lt;uid&gt;</code> when local skip-auth is on).
          </p>
        </div>
        <div className="api-docs-links">
          <a className="action-link" href={docsUrl} target="_blank" rel="noreferrer">
            <strong>Open Swagger</strong>
            <span>Full page</span>
          </a>
          <a className="action-link" href={redocUrl} target="_blank" rel="noreferrer">
            <strong>Open ReDoc</strong>
            <span>Readable reference</span>
          </a>
          <a className="action-link" href={openApiUrl} target="_blank" rel="noreferrer">
            <strong>OpenAPI JSON</strong>
            <span>Machine-readable</span>
          </a>
        </div>
      </header>

      <section className="panel api-docs-frame-wrap">
        <iframe
          title="Pulse Track Swagger UI"
          src={docsUrl}
          className="api-docs-frame"
          allow="clipboard-write"
        />
      </section>
    </div>
  )
}
