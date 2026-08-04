import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api'
import { useAuth } from '../AuthContext'

const PARAM_COLORS = {
  focus: '#3B82F6',
  consistency: '#F59E0B',
  productivity: '#06B6D4',
  energy: '#EF4444',
  wellbeing: '#22C55E',
}

export default function Analytics() {
  const { token } = useAuth()
  const [period, setPeriod] = useState('month')
  const [selected, setSelected] = useState(['focus', 'productivity', 'energy'])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    api
      .analytics(token, period)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token, period])

  const chartData =
    data?.minutes_over_time.map((point) => {
      const row = { date: point.date, minutes: point.value }
      for (const param of Object.keys(PARAM_COLORS)) {
        const series = data.effort_over_time[param] || []
        const match = series.find((s) => s.date === point.date)
        row[param] = match?.value ?? 0
      }
      return row
    }) || []

  function toggleParam(param) {
    setSelected((prev) =>
      prev.includes(param) ? prev.filter((p) => p !== param) : [...prev, param],
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Compare parameters across time periods.</p>
        </div>
        <div className="period-toggle">
          {['week', 'month', 'year'].map((p) => (
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

      <div className="chip-row">
        {Object.keys(PARAM_COLORS).map((param) => (
          <button
            key={param}
            type="button"
            className={`chip ${selected.includes(param) ? 'active' : ''}`}
            onClick={() => toggleParam(param)}
          >
            {param}
          </button>
        ))}
      </div>

      {data && (
        <>
          <section className="panel">
            <h2>Effort trends</h2>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,55,70,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5b7280' }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#5b7280' }} />
                  <Tooltip />
                  <Legend />
                  {selected.map((param) => (
                    <Line
                      key={param}
                      type="monotone"
                      dataKey={param}
                      stroke={PARAM_COLORS[param]}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel">
            <h2>Logged minutes over time</h2>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,55,70,0.08)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#5b7280' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="minutes" stroke="#3B82F6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel">
            <h2>Parameter averages ({data.start_date} → {data.end_date})</h2>
            <ul className="avg-grid">
              {data.effort_averages.map((item) => (
                <li key={item.parameter}>
                  <span>{item.parameter}</span>
                  <strong>{item.average}</strong>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
