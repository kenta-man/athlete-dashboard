import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, Cell, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { GpsData, Player } from '../data/sampleData'
import { type Period, formatPeriodLabel, aggregateGpsData, PERIOD_LABELS } from '../utils/aggregation'

interface Props { rawData: GpsData[]; player: Player }

const CHART = {
  grid: { stroke: '#f1f5f9', strokeDasharray: '3 3' },
  axis: { tick: { fill: '#374151', fontSize: 11 }, axisLine: false, tickLine: false },
  tooltip: {
    contentStyle: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' },
    labelStyle: { color: '#111827', marginBottom: 4, fontWeight: 600 },
    itemStyle: { color: '#111827' },
    cursor: { fill: 'rgba(59,130,246,0.03)' },
  },
  legend: { wrapperStyle: { fontSize: 11, color: '#111827' } },
}
const AUTO_Y = { domain: ['auto' as const, 'auto' as const] }

const ZONE_COLORS = ['#3b82f6','#10b981','#f59e0b','#f97316','#ef4444']

interface KpiStats {
  totalDistance: number; hsr: number; hsrRatio: number; intensity: number
  maxSpeed: number; ee: number; running: number; accel: number; decel: number
}

function toKpiStats(s: GpsData): KpiStats {
  const hsr = s.dist_20_25 + s.dist_25plus
  return {
    totalDistance: s.totalDistance,
    hsr,
    hsrRatio: s.totalDistance > 0 ? +((hsr / s.totalDistance) * 100).toFixed(1) : 0,
    intensity: s.running > 0 ? Math.round(s.totalDistance / s.running) : 0,
    maxSpeed: s.maxSpeed,
    ee: s.explosiveEfforts,
    running: s.running,
    accel: s.accel_3ms2,
    decel: s.decel_3ms2,
  }
}

function avgKpiStats(data: GpsData[]): KpiStats {
  const n = data.length
  if (n === 0) return { totalDistance: 0, hsr: 0, hsrRatio: 0, intensity: 0, maxSpeed: 0, ee: 0, running: 0, accel: 0, decel: 0 }
  return {
    totalDistance: Math.round(data.reduce((s, d) => s + d.totalDistance, 0) / n),
    hsr: Math.round(data.reduce((s, d) => s + d.dist_20_25 + d.dist_25plus, 0) / n),
    hsrRatio: +(data.reduce((s, d) => s + (d.totalDistance > 0 ? (d.dist_20_25 + d.dist_25plus) / d.totalDistance * 100 : 0), 0) / n).toFixed(1),
    intensity: Math.round(data.reduce((s, d) => s + (d.running > 0 ? d.totalDistance / d.running : 0), 0) / n),
    maxSpeed: +(data.reduce((s, d) => s + d.maxSpeed, 0) / n).toFixed(1),
    ee: +(data.reduce((s, d) => s + d.explosiveEfforts, 0) / n).toFixed(1),
    running: +(data.reduce((s, d) => s + d.running, 0) / n).toFixed(1),
    accel: +(data.reduce((s, d) => s + d.accel_3ms2, 0) / n).toFixed(1),
    decel: +(data.reduce((s, d) => s + d.decel_3ms2, 0) / n).toFixed(1),
  }
}

// ─── KPI Row ─────────────────────────────────────────────────────────────────
function KpiRow({ stats, label, period }: { stats: KpiStats; label?: string; period?: Period }) {
  const items = [
    { label: '総走行距離',           value: stats.totalDistance.toLocaleString(), unit: 'm',     accent: '#2563eb' },
    { label: '１分あたり走行距離',   value: String(stats.intensity),              unit: 'm/min', accent: '#0284c7' },
    { label: 'HSR（20km/h+）',       value: stats.hsr.toLocaleString(),           unit: 'm',     accent: '#ef4444' },
    { label: 'HSR割合',              value: `${stats.hsrRatio}`,                  unit: '%',     accent: '#fb923c' },
    { label: '最高速度',             value: `${stats.maxSpeed}`,                  unit: 'km/h',  accent: '#059669' },
    { label: 'Explosive Effort',      value: `${stats.ee}`,                        unit: '回',    accent: '#d97706' },
    { label: '3m/s² 加速',          value: `${stats.accel}`,                     unit: '回',    accent: '#c2410c' },
    { label: '3m/s² 減速',          value: `${stats.decel}`,                     unit: '回',    accent: '#be185d' },
  ]
  const badgeText = period === 'weekly' ? '週セッション平均' : period === 'monthly' ? '月セッション平均' : '表示期間の平均'
  return (
    <div>
      {label && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-slate-500">{label}</span>
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{badgeText}</span>
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {items.map(k => <KpiC key={k.label} label={k.label} value={k.value} unit={k.unit} accent={k.accent} />)}
      </div>
    </div>
  )
}

// ─── Session Summary ─────────────────────────────────────────────────────────
function SessionSummary({
  data, selectedDate, onSelectDate,
}: { data: GpsData[]; selectedDate: string; onSelectDate: (d: string) => void }) {

  // Derive active session from selectedDate (fall back to last entry)
  const s = useMemo(() => {
    return data.find(d => d.date === selectedDate) ?? data[data.length - 1]
  }, [data, selectedDate])

  const months = useMemo(() => [...new Set(data.map(d => d.date.slice(0, 7)))].sort(), [data])

  // Keep selected months in sync: always show the month of the active session
  const activeMonth = s?.date.slice(0, 7) ?? ''
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(
    new Set(activeMonth ? [activeMonth] : [])
  )
  // When active session's month changes (e.g. player switch), ensure that month is visible
  useEffect(() => {
    if (activeMonth) setSelectedMonths(prev => new Set([...prev, activeMonth]))
  }, [activeMonth])

  const monthSessions = useMemo(() =>
    data.filter(d => selectedMonths.size === 0 || [...selectedMonths].some(m => d.date.startsWith(m))),
    [data, selectedMonths]
  )

  if (!s) return (
    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">データがありません</div>
  )
  const pct25plus = +(100 - s.ratio_0_7 - s.ratio_7_15 - s.ratio_15_20 - s.ratio_20_25).toFixed(1)
  const isMatch = s.sessionType === 'match'

  const zones = [
    { label: '0–7 km/h',   dist: s.dist_0_7,   pct: s.ratio_0_7,   count: null,          color: ZONE_COLORS[0] },
    { label: '7–15 km/h',  dist: s.dist_7_15,  pct: s.ratio_7_15,  count: null,          color: ZONE_COLORS[1] },
    { label: '15–20 km/h', dist: s.dist_15_20, pct: s.ratio_15_20, count: s.count_15_20, color: ZONE_COLORS[2] },
    { label: '20–25 km/h', dist: s.dist_20_25, pct: s.ratio_20_25, count: s.count_20_25, color: ZONE_COLORS[3] },
    { label: '25+ km/h',   dist: s.dist_25plus,pct: pct25plus,     count: s.count_25plus,color: ZONE_COLORS[4] },
  ]

  const DOW = ['日','月','火','水','木','金','土']
  const dow = DOW[new Date(s.date).getDay()]

  return (
    <div className="space-y-4">
      {/* Session Info (left) + Session selector (right) */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '300px 1fr' }}>

        {/* Session Info */}
        <div className="bg-white border border-slate-200 overflow-hidden flex flex-col" style={{ borderRadius: 0 }}>
          <div className="px-3 py-2" style={{ backgroundColor: '#1a1a1a' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>セッション情報</p>
          </div>
          <div className="p-3 flex flex-col gap-2 flex-1">
            <div>
              <p className="text-[10px] text-slate-400">日時</p>
              <p className="text-xs font-bold text-slate-800">{s.date}（{dow}）</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 mb-0.5">種別</p>
              {isMatch
                ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5" style={{ color: '#fff', background: '#2563eb', borderRadius: 2 }}>⚽ 試合</span>
                : <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5" style={{ color: '#fff', background: '#1a1a1a', borderRadius: 2 }}>🏃 練習</span>
              }
            </div>
            {isMatch && s.opponent && (
              <>
                <div>
                  <p className="text-[10px] text-slate-400">対戦相手</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-xs font-bold text-slate-800">
                      {s.venue === 'H' ? '🏠' : '✈️'} {s.opponent}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5"
                      style={s.venue === 'H' ? { color: '#fff', background: '#1e6fad', borderRadius: 2 } : { color: '#fff', background: '#5b21b6', borderRadius: 2 }}>
                      {s.venue === 'H' ? 'HOME' : 'AWAY'}
                    </span>
                    {s.score && <span className="text-sm font-bold text-slate-800">{s.score}</span>}
                  </div>
                </div>
                {s.weather && (
                  <div className="pt-1 border-t border-slate-100 mt-1">
                    <p className="text-[10px] text-slate-400">天候 / 気温 / 湿度</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {s.weather === '晴' ? '☀️ 晴' : s.weather === '曇' ? '☁️ 曇' : '🌧 雨'}
                      {s.temperature != null && <span className="ml-1.5 text-slate-700">{s.temperature}°C</span>}
                      {s.humidity != null && <span className="ml-1.5 text-slate-500">{s.humidity}%</span>}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Session Selector */}
        <div className="bg-white border border-slate-200 overflow-hidden flex flex-col" style={{ borderRadius: 0 }}>
          <div className="px-3 py-2" style={{ backgroundColor: '#1a1a1a' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>セッション選択</p>
          </div>
          <div className="p-3 flex flex-col flex-1">
            {/* Month tabs */}
            <div className="flex gap-1.5 flex-wrap mb-2">
              {months.map(m => {
                const monthNum = parseInt(m.slice(5))
                const isSel = selectedMonths.has(m)
                const hasCurrentSession = s.date.startsWith(m)
                return (
                  <button key={m} onClick={() => setSelectedMonths(new Set([m]))}
                    className="px-5 py-2 text-base font-bold border transition-all"
                    style={isSel
                      ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 4 }
                      : hasCurrentSession
                        ? { color: '#2563eb', background: '#eff6ff', borderColor: '#93c5fd', borderRadius: 4 }
                        : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 4 }}>
                    {monthNum}月
                  </button>
                )
              })}
            </div>
            {/* Date pills grid */}
            <div className="grid grid-cols-7 gap-1 overflow-y-auto flex-1" style={{ maxHeight: 120, scrollbarWidth: 'none' }}>
              {monthSessions.map(d => {
                const match    = d.sessionType === 'match'
                const selected = selectedDate === d.date
                return (
                  <button key={d.date} onClick={() => onSelectDate(d.date)}
                    className="flex items-center justify-center gap-0.5 py-1 text-xs font-semibold border transition-all leading-none"
                    style={selected
                      ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 4 }
                      : match
                        ? { color: '#dc2626', borderColor: '#fca5a5', background: '#fff5f5', borderRadius: 4 }
                        : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 4 }}>
                    {match && <span style={{ fontSize: 10 }}>⚽</span>}
                    {d.date.slice(8)}
                  </button>
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className="inline-block w-2 h-2 rounded-sm bg-white border border-slate-200" />練習
              </span>
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <span style={{ fontSize: 10 }}>⚽</span>試合
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <KpiRow stats={toKpiStats(s)} />

      {/* Speed Zone */}
      <Card title="速度帯分析">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={zones.map(z => ({ label: z.label, dist: z.dist, pct: +z.pct.toFixed(1), color: z.color, count: z.count }))}>
            <CartesianGrid {...CHART.grid} />
            <XAxis dataKey="label" {...CHART.axis} />
            <YAxis yAxisId="left" {...CHART.axis} unit="m" width={55} />
            <YAxis yAxisId="right" orientation="right" {...CHART.axis} unit="%" domain={[0, 100]} width={38} />
            <Tooltip
              contentStyle={CHART.tooltip.contentStyle}
              formatter={(val: unknown, name: unknown) => {
                const v = val as number; const n = name as string
                return n === '割合 (%)' ? [`${v}%`, n] : [`${v.toLocaleString()} m`, n]
              }}
            />
            <Bar yAxisId="left" dataKey="dist" name="走行距離 (m)" radius={[3, 3, 0, 0]} maxBarSize={60}>
              {zones.map(z => <Cell key={z.label} fill={z.color} />)}
            </Bar>
            <Line yAxisId="right" dataKey="pct" name="割合 (%)" type="monotone"
              stroke="#1e293b" strokeWidth={2}
              dot={({ cx, cy, index }: any) => (
                <circle key={index} cx={cx} cy={cy} r={4} fill={zones[index]?.color ?? '#1e293b'} stroke="#fff" strokeWidth={1.5} />
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Acceleration/Deceleration */}
        <Card title="加減速">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '加速 3m/s²', value: s.accel_3ms2, color: '#f97316' },
              { label: '減速 3m/s²', value: s.decel_3ms2, color: '#ef4444' },
              { label: '加速 2m/s³', value: s.accel_2ms3, color: '#f59e0b' },
              { label: '減速 2m/s³', value: s.decel_2ms3, color: '#f87171' },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-3 border border-slate-100 bg-slate-50 text-center">
                <div className="flex items-center justify-center gap-1 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: k.color }} />
                  <p className="text-xs text-slate-600 leading-tight">{k.label}</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {k.value}<span className="text-xs font-normal text-slate-500 ml-0.5">回</span>
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* High-speed count */}
        <Card title="高速走行回数">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '15–20 km/h', value: s.count_15_20, color: ZONE_COLORS[2] },
              { label: '20–25 km/h', value: s.count_20_25, color: ZONE_COLORS[3] },
              { label: '25+ km/h',   value: s.count_25plus,color: ZONE_COLORS[4] },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-4 text-center border border-slate-100 bg-slate-50">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: k.color }} />
                  <p className="text-xs font-medium text-slate-600">{k.label}</p>
                </div>
                <p className="text-3xl font-bold text-slate-900">{k.value}</p>
                <p className="text-xs text-slate-400 mt-1">回</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Trend View ──────────────────────────────────────────────────────────────
function TrendView({ data, period }: { data: GpsData[]; period: Period }) {
  if (data.length === 0) return (
    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
      この期間のデータがありません
    </div>
  )
  const fmt = (k: string) => formatPeriodLabel(k, period)
  const allKeys = useMemo(() => data.map(d => d.date), [data])

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [selectedDailyMonths, setSelectedDailyMonths] = useState<Set<string>>(new Set())
  const [daysOpen, setDaysOpen] = useState(false)
  useEffect(() => {
    setSelectedKeys(new Set())
    setSelectedDailyMonths(new Set())
    setDaysOpen(false)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  const dailyMonths = useMemo(() =>
    period === 'daily' ? [...new Set(allKeys.map(k => k.slice(0, 7)))].sort() : [],
    [allKeys, period]
  )
  const dailyMonthKeys = useMemo(() =>
    selectedDailyMonths.size === 0 ? allKeys : allKeys.filter(k => [...selectedDailyMonths].some(m => k.startsWith(m))),
    [allKeys, selectedDailyMonths]
  )

  // Derive range from selectedKeys (empty = full range)
  const range = useMemo(() => {
    if (selectedKeys.size === 0) return { start: allKeys[0], end: allKeys[allKeys.length - 1] }
    const sorted = [...selectedKeys].filter(k => allKeys.includes(k)).sort()
    if (sorted.length === 0) return { start: allKeys[0], end: allKeys[allKeys.length - 1] }
    return { start: sorted[0], end: sorted[sorted.length - 1] }
  }, [selectedKeys, allKeys])

  function toggleKey(k: string) {
    setSelectedKeys(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  }
  function applyRange(start: string, end: string) {
    setSelectedKeys(new Set(allKeys.filter(k => k >= start && k <= end)))
  }

  const filtered = useMemo(
    () => selectedKeys.size === 0 ? data : data.filter(d => selectedKeys.has(d.date)),
    [data, selectedKeys]
  )
  const avgStats = useMemo(() => avgKpiStats(filtered), [filtered])

  const trendWithHsr = filtered.map(d => ({
    ...d,
    hsr: d.dist_20_25 + d.dist_25plus,
    intensity: d.running > 0 ? Math.round(d.totalDistance / d.running) : 0,
  }))

  const periodUnit = period === 'daily' ? '日' : period === 'weekly' ? '週' : '月'

  // Table column definitions: [header line1, header line2, dataKey accessor]
  const TABLE_COLS: { h1: string; h2: string; render: (d: GpsData) => React.ReactNode }[] = [
    { h1: '期間', h2: '',             render: d => <span className="font-medium text-blue-600">{formatPeriodLabel(d.date, period)}</span> },
    { h1: '種別', h2: '対戦相手',      render: d => d.sessionType === 'match'
        ? <span className="text-red-500 font-medium whitespace-nowrap">⚽ {d.opponent ?? '試合'}{d.venue ? ` (${d.venue})` : ''}</span>
        : <span className="text-slate-400">練習</span> },
    { h1: '総走行', h2: '距離(m)',    render: d => <span className="font-semibold text-slate-700">{d.totalDistance.toLocaleString()}</span> },
    { h1: 'HSR', h2: '20+(m)',        render: d => <span className="font-semibold text-red-500">{(d.dist_20_25 + d.dist_25plus).toLocaleString()}</span> },
    { h1: '走行強度', h2: '(m/min)',  render: d => <span className="font-semibold text-cyan-600">{d.running > 0 ? Math.round(d.totalDistance / d.running) : 0}</span> },
    { h1: '最高速度', h2: '(km/h)',   render: d => <span className="text-emerald-600 font-medium">{d.maxSpeed}</span> },
    { h1: '0–7', h2: '距離(m)',       render: d => <span className="text-slate-500">{d.dist_0_7.toLocaleString()}</span> },
    { h1: '7–15', h2: '距離(m)',      render: d => <span className="text-slate-500">{d.dist_7_15.toLocaleString()}</span> },
    { h1: '15–20', h2: '距離(m)',     render: d => <span className="text-slate-500">{d.dist_15_20.toLocaleString()}</span> },
    { h1: '20–25', h2: '距離(m)',     render: d => <span className="text-slate-500">{d.dist_20_25.toLocaleString()}</span> },
    { h1: '25+', h2: '距離(m)',       render: d => <span className="text-slate-500">{d.dist_25plus.toLocaleString()}</span> },
    { h1: '0–7', h2: '比率(%)',       render: d => <span className="text-slate-400">{d.ratio_0_7}</span> },
    { h1: '7–15', h2: '比率(%)',      render: d => <span className="text-slate-400">{d.ratio_7_15}</span> },
    { h1: '15–20', h2: '比率(%)',     render: d => <span className="text-slate-400">{d.ratio_15_20}</span> },
    { h1: '20–25', h2: '比率(%)',     render: d => <span className="text-slate-400">{d.ratio_20_25}</span> },
    { h1: '15–20', h2: '回数(回)',    render: d => <span style={{ color: ZONE_COLORS[2] }} className="font-medium">{d.count_15_20}</span> },
    { h1: '20–25', h2: '回数(回)',    render: d => <span style={{ color: ZONE_COLORS[3] }} className="font-medium">{d.count_20_25}</span> },
    { h1: '25+', h2: '回数(回)',      render: d => <span style={{ color: ZONE_COLORS[4] }} className="font-medium">{d.count_25plus}</span> },
    { h1: '加速3m/s²', h2: '(回)',   render: d => <span className="text-orange-500">{d.accel_3ms2}</span> },
    { h1: '減速3m/s²', h2: '(回)',   render: d => <span className="text-red-400">{d.decel_3ms2}</span> },
    { h1: '加速2m/s³', h2: '(回)',   render: d => <span className="text-amber-500">{d.accel_2ms3}</span> },
    { h1: '減速2m/s³', h2: '(回)',   render: d => <span className="text-red-300">{d.decel_2ms3}</span> },
    { h1: 'Explosive', h2: 'Effort(回)', render: d => <span className="text-amber-600 font-medium">{d.explosiveEfforts}</span> },
    { h1: '走行時間', h2: '(min)',    render: d => <span className="text-slate-400">{d.running}</span> },
  ]
  const VISIBLE_COLS = period === 'daily' ? TABLE_COLS : TABLE_COLS.filter(col => col.h1 !== '種別')

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>表示期間</p>
        </div>
        <div className="p-3 space-y-2">
        {/* Header row: 全期間 + count */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedKeys(new Set()); setSelectedDailyMonths(new Set()) }}
            className="px-2 py-0.5 rounded text-[11px] font-semibold border transition-all"
            style={selectedKeys.size === 0
              ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb' }
              : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent' }}>
            全期間
          </button>
          <span className="text-[10px] text-slate-400 ml-auto">{filtered.length} {period === 'daily' ? 'セッション' : periodUnit}</span>
        </div>

        {/* Range dropdowns */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">範囲</span>
          <select value={range.start}
            onChange={e => applyRange(e.target.value, range.end)}
            className="text-[11px] border border-slate-200 rounded px-1.5 py-1 text-slate-700 bg-white outline-none focus:border-blue-400">
            {allKeys.map(k => <option key={k} value={k}>{formatPeriodLabel(k, period)}</option>)}
          </select>
          <span className="text-[10px] text-slate-400">〜</span>
          <select value={range.end}
            onChange={e => applyRange(range.start, e.target.value)}
            className="text-[11px] border border-slate-200 rounded px-1.5 py-1 text-slate-700 bg-white outline-none focus:border-blue-400">
            {allKeys.map(k => <option key={k} value={k}>{formatPeriodLabel(k, period)}</option>)}
          </select>
        </div>

        {/* Daily: month tabs + collapsible day section */}
        {period === 'daily' && (
          <>
            <div className="flex items-center gap-1.5 flex-wrap">
              {dailyMonths.map(m => {
                const monthNum = parseInt(m.slice(5))
                const isSel = selectedDailyMonths.has(m)
                return (
                  <button key={m}
                    onClick={() => setSelectedDailyMonths(prev => { const n = new Set(prev); n.has(m) ? n.delete(m) : n.add(m); return n })}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold border transition-all"
                    style={isSel
                      ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb' }
                      : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent' }}>
                    {monthNum}月
                  </button>
                )
              })}
            </div>
            {/* Collapsible day section */}
            <div>
              <button
                onClick={() => setDaysOpen(o => !o)}
                className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 mb-1 hover:text-slate-600 transition-colors">
                <svg className="w-3 h-3 transition-transform" style={{ transform: daysOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
                日を選択 {selectedKeys.size > 0 && `(${selectedKeys.size}件選択中)`}
              </button>
              {daysOpen && (
                <div className="grid grid-cols-7 gap-1">
                  {dailyMonthKeys.map(d => {
                    const isSel = selectedKeys.has(d)
                    const inRange = d >= range.start && d <= range.end && selectedKeys.size > 0
                    const mNum = parseInt(d.slice(5, 7))
                    const dayNum = parseInt(d.slice(8))
                    return (
                      <button key={d} onClick={() => toggleKey(d)}
                        className="py-0.5 rounded text-[9px] font-medium border transition-all text-center leading-tight"
                        style={isSel
                          ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', fontWeight: 700 }
                          : inRange
                            ? { color: '#2563eb', background: '#eff6ff', borderColor: '#93c5fd' }
                            : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent' }}>
                        {`${mNum}月${dayNum}日`}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Weekly: week buttons (multi-select) */}
        {period === 'weekly' && (
          <div className="flex gap-1 flex-wrap">
            {allKeys.map(k => {
              const isSel = selectedKeys.has(k)
              const inRange = k >= range.start && k <= range.end && selectedKeys.size > 0
              return (
                <button key={k} onClick={() => toggleKey(k)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold border transition-all"
                  style={isSel
                    ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb' }
                    : inRange
                      ? { color: '#2563eb', background: '#eff6ff', borderColor: '#93c5fd' }
                      : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent' }}>
                  {fmt(k)}
                </button>
              )
            })}
          </div>
        )}

        {/* Monthly: month buttons (multi-select) */}
        {period === 'monthly' && (
          <div className="flex gap-1 flex-wrap">
            {allKeys.map(k => {
              const isSel = selectedKeys.has(k)
              const inRange = k >= range.start && k <= range.end && selectedKeys.size > 0
              return (
                <button key={k} onClick={() => toggleKey(k)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold border transition-all"
                  style={isSel
                    ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb' }
                    : inRange
                      ? { color: '#2563eb', background: '#eff6ff', borderColor: '#93c5fd' }
                      : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent' }}>
                  {fmt(k)}
                </button>
              )
            })}
          </div>
        )}
        </div>
      </div>

      {/* KPI Row — averages */}
      <KpiRow stats={avgStats} label="統計" period={period} />

      {/* ── Row 1: 走行距離 ／ １分あたりの走行距離 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="走行距離">
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={trendWithHsr}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis {...CHART.axis} {...AUTO_Y} tickFormatter={(v: number) => v.toLocaleString()} />
              <Tooltip {...CHART.tooltip}
                formatter={(v) => [`${Number(v).toLocaleString()} m`]}
                labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line type="monotone" dataKey="totalDistance" name="総走行距離 (m)"
                stroke="#3b82f6" strokeWidth={2}
                dot={{ r: 2, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="１分あたりの走行距離">
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={trendWithHsr}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis {...CHART.axis} {...AUTO_Y} tickFormatter={(v: number) => v.toLocaleString()} />
              <Tooltip {...CHART.tooltip}
                formatter={(v) => [`${Number(v).toLocaleString()} m/min`]}
                labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line type="monotone" dataKey="intensity" name="１分あたり走行距離 (m/min)"
                stroke="#0284c7" strokeWidth={2}
                dot={{ r: 2, fill: '#0284c7', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Row 2: HSR ／ 高速走行回数 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="HSR（20km/h 以上）">
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={trendWithHsr}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis {...CHART.axis} {...AUTO_Y} tickFormatter={(v: number) => v.toLocaleString()} />
              <Tooltip {...CHART.tooltip}
                formatter={(v) => [`${Number(v).toLocaleString()} m`]}
                labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line type="monotone" dataKey="hsr"         name="HSR 20+ (m)"    stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="dist_20_25"  name="20–25km/h (m)"  stroke="#f97316" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="dist_25plus" name="25+km/h (m)"    stroke="#dc2626" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 2, fill: '#dc2626', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="高速走行回数">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={filtered.map(d => ({
              date: d.date,
              '15–20km/h': d.count_15_20,
              '20–25km/h': d.count_20_25,
              '25+km/h':   d.count_25plus,
            }))} barSize={period === 'monthly' ? 36 : 8}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis {...CHART.axis} tickFormatter={(v: number) => v.toLocaleString()} />
              <Tooltip {...CHART.tooltip} formatter={(v) => [Number(v).toLocaleString() + ' 回']} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Bar dataKey="15–20km/h" stackId="a" fill={ZONE_COLORS[2]} />
              <Bar dataKey="20–25km/h" stackId="a" fill={ZONE_COLORS[3]} />
              <Bar dataKey="25+km/h"   stackId="a" fill={ZONE_COLORS[4]} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Row 3: 加減速 ／ Explosive Effort ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="加減速">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={filtered}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis {...CHART.axis} {...AUTO_Y} tickFormatter={(v: number) => v.toLocaleString()} />
              <Tooltip {...CHART.tooltip} formatter={(v) => [Number(v).toLocaleString() + ' 回']} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line type="monotone" dataKey="accel_3ms2" name="加速 3m/s²" stroke="#f97316" strokeWidth={2}   dot={{ r: 2, fill: '#f97316', strokeWidth: 0 }} />
              <Line type="monotone" dataKey="accel_2ms3" name="加速 2m/s³" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2, fill: '#fbbf24', strokeWidth: 0 }} />
              <Line type="monotone" dataKey="decel_3ms2" name="減速 3m/s²" stroke="#3b82f6" strokeWidth={2}   dot={{ r: 2, fill: '#3b82f6', strokeWidth: 0 }} />
              <Line type="monotone" dataKey="decel_2ms3" name="減速 2m/s³" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2, fill: '#06b6d4', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Explosive Effort">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={filtered}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis {...CHART.axis} {...AUTO_Y} tickFormatter={(v: number) => v.toLocaleString()} />
              <Tooltip {...CHART.tooltip} formatter={(v) => [Number(v).toLocaleString() + ' 回']} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line type="monotone" dataKey="explosiveEfforts" name="Explosive Effort (回)"
                stroke="#d97706" strokeWidth={2}
                dot={{ r: 2, fill: '#d97706', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Records table */}
      <Card title="記録一覧">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100">
                {VISIBLE_COLS.map((col, i) => (
                  <th key={i} className="px-2 py-2 font-semibold text-slate-500 text-center whitespace-nowrap leading-tight">
                    <div>{col.h1}</div>
                    {col.h2 && <div className="text-slate-400 font-normal">{col.h2}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filtered].reverse().map(d => (
                <tr key={d.date} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  {VISIBLE_COLS.map((col, i) => (
                    <td key={i} className="px-2 py-2 text-center whitespace-nowrap">{col.render(d)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── nearest date helper ─────────────────────────────────────────────────────
function nearestDate(dates: string[], target: string): string {
  if (!target) return dates[dates.length - 1]
  return dates.reduce((best, d) => {
    const dDiff = Math.abs(new Date(d).getTime() - new Date(target).getTime())
    const bDiff = Math.abs(new Date(best).getTime() - new Date(target).getTime())
    return dDiff < bDiff ? d : best
  })
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function GpsView({ rawData }: Props) {
  const [period, setPeriod] = useState<Period>('session')
  const data = useMemo(() => aggregateGpsData(rawData, period), [rawData, period])

  // selectedDate is shared between session/trend; persists across player switches
  const [selectedDate, setSelectedDate] = useState<string>(
    rawData.length > 0 ? rawData[rawData.length - 1].date : ''
  )

  // When rawData changes (player switch), snap to nearest available date
  useEffect(() => {
    if (rawData.length === 0) return
    const dates = rawData.map(d => d.date)
    const snapped = dates.includes(selectedDate) ? selectedDate : nearestDate(dates, selectedDate)
    setSelectedDate(snapped)
  }, [rawData]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!rawData || rawData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-medium">GPSデータがありません</p>
        <p className="text-xs text-slate-300">この選手のGPSデータは登録されていません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── 表示期間タブ ── */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded gap-0.5 p-0.5" style={{ backgroundColor: '#1a1a1a' }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-4 py-1.5 rounded text-xs font-bold transition-all"
              style={period === p
                ? { backgroundColor: '#2563eb', color: '#fff' }
                : { color: '#888', background: 'transparent' }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {period === 'session'
        ? <SessionSummary data={data} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        : <TrendView data={data} period={period} />}
    </div>
  )
}

// ─── Compact KPI card ────────────────────────────────────────────────────────
function KpiC({ label, value, unit, accent }: { label: string; value: string; unit: string; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex-shrink-0" style={{ minWidth: 110 }}>
      <div className="flex items-center gap-1 mb-1.5">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
        <p className="text-xs text-slate-500 leading-tight truncate">{label}</p>
      </div>
      <p className="text-xl font-bold leading-none text-slate-900">
        {value}<span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>
      </p>
    </div>
  )
}

function Kpi({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900">
        {value}<span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>
      </p>
    </div>
  )
}

export { Kpi }

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
      <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
