import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { CATEGORIES, categoryChartColor, categoryLabel } from '../constants'
import { formatDuration } from '../duration'

function hoursLabel(mins) {
  if (mins >= 60) {
    const h = mins / 60
    return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
  }
  return `${mins}m`
}

function sortCategoryIds(ids) {
  const order = CATEGORIES.map((c) => c.id)
  return [...ids].sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    if (ia === -1 && ib === -1) return String(a).localeCompare(String(b))
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

/** Normalize API point → flat { date, [categoryId]: minutes, total } */
function flattenSeriesPoint(point) {
  const row = { date: point.date }
  const source =
    point.values && typeof point.values === 'object' && !Array.isArray(point.values)
      ? point.values
      : point
  let total = 0
  for (const [key, value] of Object.entries(source)) {
    if (key === 'date' || key === 'values' || key === 'total') continue
    const minutes = Number(value)
    if (!Number.isFinite(minutes)) continue
    row[key] = minutes
    total += minutes
  }
  row.total = total
  return row
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

  const chartData = useMemo(() => {
    const series = data?.category_minutes_over_time
    if (Array.isArray(series) && series.length > 0) {
      return series.map(flattenSeriesPoint)
    }
    return (data?.minutes_over_time || []).map((point) => ({
      date: point.date,
      total: Number(point.value || 0),
    }))
  }, [data])

  const categoryKeys = useMemo(() => {
    const keys = new Set()
    for (const row of chartData) {
      for (const key of Object.keys(row)) {
        if (key === 'date' || key === 'total') continue
        keys.add(key)
      }
    }
    if (keys.size === 0) {
      for (const item of data?.category_breakdown || []) {
        keys.add(item.category)
      }
    }
    return sortCategoryIds([...keys]).filter((key) =>
      chartData.some((row) => Object.prototype.hasOwnProperty.call(row, key)),
    )
  }, [chartData, data])

  const useCategoryLines = categoryKeys.length > 0
  const chartHasData = chartData.some((row) => {
    if (useCategoryLines) {
      return categoryKeys.some((key) => Number(row[key]) > 0)
    }
    return Number(row.total) > 0
  })

  const taskChart =
    data?.task_breakdown?.map((item) => ({
      name: item.title,
      shortName: item.title.length > 28 ? `${item.title.slice(0, 26)}…` : item.title,
      minutes: item.minutes,
      percentage: item.percentage,
      category: categoryLabel(item.category),
      categoryId: item.category,
    })) || []

  const lineSeries = useCategoryLines ? categoryKeys : ['total']

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
            <h2>Logged time by category</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              {rangeLabel}
            </p>
            {!chartHasData ? (
              <p className="muted">No activity in this period yet.</p>
            ) : (
              <div className="chart-wrap chart-wrap--tall">
                <ResponsiveContainer width="100%" height={320} minHeight={320}>
                  {period === 'day' ? (
                    <BarChart
                      key={`bar-${period}-${lineSeries.join('-')}`}
                      data={chartData}
                      margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.12)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#8BA3C7' }}
                        tickFormatter={(v) => hoursLabel(v)}
                        width={48}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatDuration(value),
                          name === 'total' ? 'Total' : categoryLabel(name),
                        ]}
                      />
                      <Legend
                        formatter={(value) =>
                          value === 'total' ? 'Total' : categoryLabel(value)
                        }
                      />
                      {lineSeries.map((key, i) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          name={key}
                          stackId={useCategoryLines ? 'categories' : undefined}
                          fill={categoryChartColor(key)}
                          radius={
                            i === lineSeries.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]
                          }
                        />
                      ))}
                    </BarChart>
                  ) : (
                    <LineChart
                      key={`line-${period}-${lineSeries.join('-')}`}
                      data={chartData}
                      margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.12)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#8BA3C7' }}
                        tickFormatter={(v) => hoursLabel(v)}
                        width={48}
                        domain={[0, 'auto']}
                        allowDecimals={false}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatDuration(value),
                          name === 'total' ? 'Total' : categoryLabel(name),
                        ]}
                      />
                      <Legend
                        formatter={(value) =>
                          value === 'total' ? 'Total' : categoryLabel(value)
                        }
                      />
                      {lineSeries.map((key) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          name={key}
                          stroke={categoryChartColor(key)}
                          strokeWidth={2.5}
                          dot={{
                            r: 4,
                            strokeWidth: 0,
                            fill: categoryChartColor(key),
                          }}
                          activeDot={{ r: 6 }}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="panel" style={{ marginTop: '1rem' }}>
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
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(34,211,238,0.12)"
                        horizontal={false}
                      />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#8BA3C7' }} />
                      <YAxis
                        type="category"
                        dataKey="shortName"
                        width={140}
                        tick={{ fontSize: 11, fill: '#8BA3C7' }}
                      />
                      <Tooltip
                        formatter={(value, _name, props) => [
                          `${formatDuration(value)} (${props.payload.percentage}%)`,
                          props.payload.name,
                        ]}
                        labelFormatter={() => ''}
                      />
                      <Bar dataKey="minutes" radius={[0, 8, 8, 0]}>
                        {taskChart.map((item) => (
                          <Cell
                            key={item.name}
                            fill={categoryChartColor(item.categoryId)}
                          />
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
          </section>
        </>
      )}
    </div>
  )
}
