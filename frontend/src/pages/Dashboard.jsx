import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useCategories } from '../CategoryContext'
import GoalProgressBar from '../components/GoalProgressBar'
import {
  SLEEP_QUALITY_CHART_COLOR,
  SLEEP_QUALITY_LABEL,
  sleepQualityChartColor,
} from '../sleep'

function hours(mins) {
  return `${(mins / 60).toFixed(1)}h`
}

function sleepHoursLabel(mins) {
  if (!mins) return '0h'
  const h = mins / 60
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
}

export default function Dashboard() {
  const { token } = useAuth()
  const { categoryChartColor, categoryLabel } = useCategories()
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState(null)
  const [goals, setGoals] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    Promise.all([api.analytics(token, period), api.listGoals(token)])
      .then(([summary, goalList]) => {
        setData(summary)
        setGoals(goalList)
      })
      .catch((err) => setError(err.message))
  }, [token, period])

  const goalsById = useMemo(
    () => Object.fromEntries((goals || []).map((g) => [g.id, g])),
    [goals],
  )

  const sleepChartData = useMemo(() => {
    return (data?.sleep_over_time || []).map((point) => ({
      date: point.date,
      hours: Number(((point.minutes || 0) / 60).toFixed(2)),
      minutes: point.minutes || 0,
      quality: point.quality || null,
    }))
  }, [data])

  const hasSleepLogs = sleepChartData.some((row) => row.minutes > 0)

  const healthSeries = data?.health_over_time || []
  const healthChart = (pickMinutes) =>
    healthSeries.map((point) => ({
      date: point.date,
      minutes: pickMinutes(point),
    }))

  const weightLiftData = healthChart((p) => p.weight_lifting_minutes || 0)
  const walkRunData = healthSeries.map((p) => ({
    date: p.date,
    minutes: p.walking_running_minutes || 0,
    km: p.walking_running_distance_km || 0,
  }))
  const cyclingData = healthChart((p) => p.cycling_minutes || 0)
  const swimmingData = healthChart((p) => p.swimming_minutes || 0)

  const hasWeightLift = weightLiftData.some((r) => r.minutes > 0)
  const hasWalkRun =
    walkRunData.some((r) => r.minutes > 0) || walkRunData.some((r) => r.km > 0)
  const hasCycling = cyclingData.some((r) => r.minutes > 0)
  const hasSwimming = swimmingData.some((r) => r.minutes > 0)

  function HealthMinutesChart({ rows, title }) {
    if (!rows.some((r) => r.minutes > 0)) return null
    return (
      <div className="panel dashboard-panel">
        <h2>{title}</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.12)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8BA3C7' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8BA3C7' }} />
              <Tooltip formatter={(v) => [`${Math.round(v)} min`, 'Time']} />
              <Bar dataKey="minutes" fill="#34D399" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  function WalkRunChart({ rows }) {
    if (!rows.some((r) => r.minutes > 0 || r.km > 0)) return null
    return (
      <div className="panel dashboard-panel">
        <h2>Walking / running</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.12)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8BA3C7' }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#8BA3C7' }}
                tickFormatter={(v) => `${Math.round(v)}m`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#A5B4FC' }}
                tickFormatter={(v) => `${Number(v).toFixed(1)}km`}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Time (min)') return [`${Math.round(value)} min`, name]
                  if (name === 'Distance (km)') return [`${Number(value).toFixed(2)} km`, name]
                  return [value, name]
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="minutes"
                name="Time (min)"
                fill="#22D3EE"
                radius={[8, 8, 0, 0]}
                maxBarSize={28}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="km"
                name="Distance (km)"
                stroke="#818CF8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#818CF8', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

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

          <section className="dashboard-grid">
            <div className="panel dashboard-panel">
              <h2>Time by day</h2>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
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
            <div className="panel dashboard-panel">
              <div className="panel-head-row">
                <h2>Sleep by day</h2>
                {hasSleepLogs ? (
                  <ul className="sleep-quality-legend" aria-label="Sleep quality colors">
                    {(['ideal', 'normal', 'bad']).map((q) => (
                      <li key={q}>
                        <span
                          className="sleep-quality-swatch"
                          style={{ background: SLEEP_QUALITY_CHART_COLOR[q] }}
                        />
                        {SLEEP_QUALITY_LABEL[q]}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {!hasSleepLogs ? (
                <div className="empty-state">
                  <div className="illus" />
                  <p className="muted">
                    No sleep logs this period.{' '}
                    <Link to="/activities">Log sleep</Link> to see day-wise quality.
                  </p>
                </div>
              ) : (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sleepChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.12)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#8BA3C7' }}
                        tickFormatter={(v) => `${v}h`}
                      />
                      <Tooltip
                        formatter={(value, _name, item) => {
                          const quality = item?.payload?.quality
                          const label = quality
                            ? SLEEP_QUALITY_LABEL[quality] || quality
                            : 'No rating'
                          return [
                            `${sleepHoursLabel(item?.payload?.minutes || 0)} · ${label}`,
                            'Sleep',
                          ]
                        }}
                        labelFormatter={(label) => label}
                      />
                      <Bar dataKey="hours" name="Sleep" radius={[8, 8, 0, 0]}>
                        {sleepChartData.map((row) => (
                          <Cell key={row.date} fill={sleepQualityChartColor(row.quality)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>

          {(hasWeightLift || hasWalkRun || hasCycling || hasSwimming) && (
            <section className="dashboard-grid">
              {hasWeightLift && (
                <HealthMinutesChart rows={weightLiftData} title="Weight lifting · time" />
              )}
              {hasWalkRun && <WalkRunChart rows={walkRunData} />}
              {hasCycling && <HealthMinutesChart rows={cyclingData} title="Cycling · time" />}
              {hasSwimming && <HealthMinutesChart rows={swimmingData} title="Swimming · time" />}
            </section>
          )}

          <section className="dashboard-grid">
            <div className="panel dashboard-panel">
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
                  <ResponsiveContainer width="100%" height="100%">
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
            <div className="panel dashboard-panel">
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
                  {data.goal_progress.map((g) => {
                    const goal = goalsById[g.goal_id]
                    const pct = goal?.completion_pct ?? 0
                    return (
                      <li key={g.goal_id}>
                        <div className="goal-meta">
                          <strong>{g.title}</strong>
                        </div>
                        <GoalProgressBar
                          pct={pct}
                          accentColor={categoryChartColor(g.category)}
                          status={goal?.status || 'active'}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
