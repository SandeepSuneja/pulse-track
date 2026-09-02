import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { categoryChartColor, categoryLabel } from '../constants'

function hours(mins) {
  return `${(mins / 60).toFixed(1)}h`
}

export default function Dashboard() {
  const { token } = useAuth()
  const [period, setPeriod] = useState('week')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    api
      .analytics(token, period)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token, period])

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Your pulse today</h1>
          <p className="muted">Watch time and goals move together.</p>
        </div>
        <div className="period-toggle">
          {['day', 'week', 'month', 'year'].map((p) => (
            <button
              key={p}
              type="button"
              className={period === p ? 'active' : ''}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="quick-actions">
        <Link className="action-link" to="/">
          <strong>Open board</strong>
          <span>Move tickets across status</span>
        </Link>
        <Link className="action-link" to="/activities">
          <strong>Log activity</strong>
          <span>Capture a timed work block</span>
        </Link>
        <Link className="action-link" to="/goals">
          <strong>Goals</strong>
          <span>Set targets, then log time on matching tasks</span>
        </Link>
      </section>

      {data && (
        <>
          <section className="stat-row">
            <article className="stat-tile cyan">
              <p className="stat-label">Logged time</p>
              <p className="stat-value">{hours(data.total_minutes)}</p>
              <p className="stat-hint">
                {data.start_date} → {data.end_date}
              </p>
            </article>
            <article className="stat-tile citrus">
              <p className="stat-label">Activities</p>
              <p className="stat-value">{data.activity_count}</p>
              <p className="stat-hint">Track record entries</p>
            </article>
            <article className="stat-tile mint">
              <p className="stat-label">Categories</p>
              <p className="stat-value">{data.category_breakdown.length}</p>
              <p className="stat-hint">Active this period</p>
            </article>
            <article className="stat-tile coral">
              <p className="stat-label">Goals</p>
              <p className="stat-value">{data.goal_progress.length}</p>
              <p className="stat-hint">Active targets</p>
            </article>
          </section>

          <section className="grid-2">
            <div className="panel">
              <h2>Time by day</h2>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.minutes_over_time}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.12)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Minutes" fill="#22D3EE" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="panel">
              <h2>Category mix</h2>
              {data.category_breakdown.length === 0 ? (
                <div className="empty-state">
                  <div className="illus" />
                  <p className="muted">
                    No activities yet. <Link to="/activities">Log your first block</Link>.
                  </p>
                </div>
              ) : (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.category_breakdown}
                        dataKey="minutes"
                        nameKey="category"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        label={({ category }) => categoryLabel(category)}
                      >
                        {data.category_breakdown.map((item) => (
                          <Cell
                            key={item.category}
                            fill={categoryChartColor(item.category)}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          `${value} min`,
                          categoryLabel(name),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>

          <section className="panel" style={{ marginTop: '1rem' }}>
            <h2>Goal progress ({period})</h2>
            {data.goal_progress.length === 0 ? (
              <div className="empty-state">
                <div className="illus" />
                <p className="muted">
                  No active goals. <Link to="/goals">Set a time target</Link>.
                </p>
              </div>
            ) : (
              <ul className="goal-list">
                {data.goal_progress.map((g) => (
                  <li key={g.goal_id}>
                    <div style={{ width: '100%' }}>
                      <div className="goal-meta">
                        <strong>{g.title}</strong>
                        <span>
                          {g.target_minutes
                            ? `${g.actual_minutes} / ${g.target_minutes} min · ${Math.round(g.completion_pct)}%`
                            : `${g.actual_minutes} min logged · due-date goal`}
                        </span>
                      </div>
                      {g.target_minutes > 0 && (
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(g.completion_pct, 100)}%`,
                              background: categoryChartColor(g.category),
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
