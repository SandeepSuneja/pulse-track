import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { categoryLabel } from '../constants'

const COLORS = ['#22D3EE', '#34D399', '#FBBF24', '#FB7185', '#38BDF8', '#8BA3C7', '#A78BFA', '#F472B6']

function hoursLabel(mins) {
  if (mins >= 60) {
    const h = mins / 60
    return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
  }
  return `${mins}m`
}

export default function Analytics() {
  const { token } = useAuth()
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    api
      .analytics(token, period)
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token, period])

  const rangeLabel =
    data && data.start_date === data.end_date
      ? data.start_date
      : data
        ? `${data.start_date} → ${data.end_date}`
        : ''

  const chartData =
    data?.minutes_over_time.map((point) => ({
      date: point.date,
      minutes: point.value,
    })) || []

  const categoryChart =
    data?.category_breakdown.map((item) => ({
      name: categoryLabel(item.category),
      minutes: item.minutes,
      percentage: item.percentage,
      category: item.category,
    })) || []

  const taskChart =
    data?.task_breakdown?.map((item) => ({
      name: item.title,
      shortName:
        item.title.length > 28 ? `${item.title.slice(0, 26)}…` : item.title,
      minutes: item.minutes,
      percentage: item.percentage,
      category: categoryLabel(item.category),
    })) || []

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Time spent by category and by task across periods.</p>
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

      {data && (
        <>
          <section className="panel">
            <h2>Logged minutes over time</h2>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                {period === 'day' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.12)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                    <Tooltip />
                    <Bar dataKey="minutes" name="Minutes" fill="#22D3EE" radius={[8, 8, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.12)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="minutes"
                      stroke="#22D3EE"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid-2" style={{ marginTop: '1rem' }}>
            <div className="panel">
              <h2>By category</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                {rangeLabel}
              </p>
              {categoryChart.length === 0 ? (
                <p className="muted">No activity in this period yet.</p>
              ) : (
                <>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={categoryChart}
                          dataKey="minutes"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          {categoryChart.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, _name, props) => [
                            `${value} min (${props.payload.percentage}%)`,
                            props.payload.name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="avg-grid">
                    {categoryChart.map((item) => (
                      <li key={item.category}>
                        <span>{item.name}</span>
                        <strong>
                          {hoursLabel(item.minutes)} · {item.percentage}%
                        </strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="panel">
              <h2>By task</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                {rangeLabel}
              </p>
              {taskChart.length === 0 ? (
                <p className="muted">No task logs in this period yet.</p>
              ) : (
                <>
                  <div className="chart-wrap" style={{ height: Math.max(240, taskChart.length * 36) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={taskChart}
                        layout="vertical"
                        margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.12)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                        <YAxis
                          type="category"
                          dataKey="shortName"
                          width={140}
                          tick={{ fontSize: 11, fill: '#8BA3C7' }}
                        />
                        <Tooltip
                          formatter={(value, _name, props) => [
                            `${value} min (${props.payload.percentage}%)`,
                            props.payload.name,
                          ]}
                          labelFormatter={() => ''}
                        />
                        <Bar dataKey="minutes" radius={[0, 8, 8, 0]}>
                          {taskChart.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="avg-grid">
                    {taskChart.map((item) => (
                      <li key={item.name}>
                        <span>
                          {item.name}
                          <span className="muted" style={{ display: 'block', fontSize: '0.75rem' }}>
                            {item.category}
                          </span>
                        </span>
                        <strong>
                          {hoursLabel(item.minutes)} · {item.percentage}%
                        </strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
