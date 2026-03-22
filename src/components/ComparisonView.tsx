import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { POSITION_COLORS, type Player } from '../data/sampleData'
import { aggregateGpsData, aggregateCondData, type Period, formatPeriodLabel } from '../utils/aggregation'

interface Props { players: Player[]; period: Period; dataTab: 'gps' | 'conditioning' }

const CHART = {
  grid: { stroke: '#f1f5f9', strokeDasharray: '3 3' },
  axis: { tick: { fill: '#94a3b8', fontSize: 11 }, axisLine: false, tickLine: false },
  tooltip: {
    contentStyle: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: '#475569', marginBottom: 4 },
    itemStyle: { color: '#334155' },
    cursor: { fill: 'rgba(0,0,0,0.03)' },
  },
  legend: { wrapperStyle: { fontSize: 11, color: '#94a3b8' } },
}

const GPS_METRICS = [
  { key: 'totalDistance',    label: '総走行距離',           unit: 'm',     accent: '#3b82f6' },
  { key: 'hsr',              label: 'HSR（20km/h+）',        unit: 'm',     accent: '#ef4444' },
  { key: 'intensity',        label: '１分あたりの走行距離',  unit: 'm/min', accent: '#0284c7' },
  { key: 'maxSpeed',         label: '最高速度',              unit: 'km/h',  accent: '#059669' },
  { key: 'explosiveEfforts', label: 'Explosive Effort',      unit: '回',    accent: '#d97706' },
  { key: 'accel_3ms2',       label: '加速',                  unit: '回',    accent: '#f97316' },
  { key: 'decel_3ms2',       label: '減速',                  unit: '回',    accent: '#be185d' },
]

const ZONE_COLS = [
  { key: 'dist_0_7',    label: '0–7km/h',    color: '#3b82f6' },
  { key: 'dist_7_15',   label: '7–15km/h',   color: '#10b981' },
  { key: 'dist_15_20',  label: '15–20km/h',  color: '#f59e0b' },
  { key: 'dist_20_25',  label: '20–25km/h',  color: '#f97316' },
  { key: 'dist_25plus', label: '25+km/h',    color: '#ef4444' },
]

const COND_METRICS = [
  { key: 'bodyFatPct',         label: '体脂肪率',   unit: '%',  accent: '#ef4444' },
  { key: 'muscleMass',         label: '筋肉量',     unit: 'kg', accent: '#10b981' },
  { key: 'skeletalMuscleMass', label: '骨格筋量',   unit: 'kg', accent: '#059669' },
  { key: 'weight',             label: '体重',       unit: 'kg', accent: '#3b82f6' },
  { key: 'phaseAngleWhole',    label: '全身位相角', unit: '°',  accent: '#8b5cf6' },
  { key: 'hydrationRate',      label: '水和率',     unit: '%',  accent: '#0ea5e9' },
  { key: 'hrResting',          label: '安静時心拍', unit: 'bpm',accent: '#ef4444' },
  { key: 'hrv',                label: 'HRV',        unit: 'ms', accent: '#6366f1' },
]

const DISPLAY_POSITIONS = ['GK', 'FP'] as const
type DisplayPos = typeof DISPLAY_POSITIONS[number]
const POS_GROUPS: Record<DisplayPos, string[]> = { GK: ['GK'], FP: ['DF', 'MF', 'FW'] }
const GROUP_COLORS: Record<DisplayPos, string> = { GK: '#f59e0b', FP: '#6366f1' }

function getVal(obj: Record<string, unknown>, key: string): number {
  return (obj as unknown as Record<string, number>)[key] ?? 0
}

function SessionDaySummary({ aggPlayers, metrics, selectedDate }: {
  aggPlayers: any[]
  metrics: { key: string; label: string; unit: string; accent: string }[]
  selectedDate: string
}) {
  const playersOnDate = aggPlayers.map((p: any) => {
    const session = p.agg.find((d: any) => d.date === selectedDate) as any
    return { ...p, session }
  }).filter((p: any) => p.session)

  if (playersOnDate.length === 0) return null

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {playersOnDate.map((p: any) => {
          const s = p.session
          return (
            <div key={p.id} className="rounded-xl border p-2.5 bg-slate-50 border-slate-200">
              <div className="flex items-center gap-1.5 mb-2">
                <img src={p.photo} alt={p.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200 flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold truncate text-slate-800">{p.name}</p>
                  <span className="text-[8px] font-bold px-1 py-0.5 rounded-full bg-slate-100 text-slate-700">{p.position}</span>
                </div>
              </div>
              <div className="space-y-0.5">
                {metrics.map((m: any) => (
                  <div key={m.key} className="flex items-center justify-between">
                    <span className="text-[8px] text-slate-400 truncate pr-1">{m.label}</span>
                    <span className="text-[10px] font-bold text-slate-800 flex-shrink-0 tabular-nums">
                      {(getVal(s, m.key) || 0).toLocaleString()}
                      <span className="text-[8px] font-normal text-slate-400 ml-0.5">{m.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ComparisonView({ players, period, dataTab }: Props) {
  const isGps = dataTab === 'gps'
  const metrics = isGps ? GPS_METRICS : COND_METRICS
  const [metricKey, setMetricKey] = useState(metrics[0].key)
  // activeM: fallback to first metric when switching tabs (metricKey may be from the other tab)
  const activeM = metrics.find(m => m.key === metricKey) ?? metrics[0]
  const effectiveKey = activeM.key   // always a valid key for the current tab

  const aggPlayers = useMemo(() => players.map(p => ({
    ...p,
    agg: isGps
      ? aggregateGpsData(p.gpsData, period).map((d: any) => ({
          ...d,
          hsr: (d.dist_20_25 ?? 0) + (d.dist_25plus ?? 0),
          intensity: d.running > 0 ? Math.round(d.totalDistance / d.running) : 0,
        }))
      : aggregateCondData(p.conditioningData, period),
  })), [players, period, isGps])

  const latestVals = useMemo(() =>
    aggPlayers.map(p => {
      const last = p.agg[p.agg.length - 1] as unknown as Record<string, number>
      return { id: p.id, name: p.name, pos: p.position, photo: p.photo, value: last ? getVal(last, effectiveKey) : 0 }
    }).sort((a, b) =>
      effectiveKey === 'bodyFatPct' || effectiveKey === 'hrResting' ? a.value - b.value : b.value - a.value
    ),
    [aggPlayers, effectiveKey]
  )

  const trendData = useMemo(() => {
    const keys = [...new Set(aggPlayers.flatMap(p => p.agg.map(d => d.date)))].sort()
    return keys.map(date => {
      const row: Record<string, unknown> = { date }
      aggPlayers.forEach(p => {
        const d = p.agg.find(x => x.date === date) as unknown as Record<string, number> | undefined
        row[p.id] = d ? getVal(d, effectiveKey) : null
      })
      return row
    })
  }, [aggPlayers, effectiveKey])

  // Per-metric averages for each position group (GPS only)
  const posMetricAvgs = useMemo(() => {
    const result: Record<string, Record<string, number>> = {}
    DISPLAY_POSITIONS.forEach(pos => {
      result[pos] = {}
      const posPlayers = aggPlayers.filter((p: any) => POS_GROUPS[pos].includes(p.position))
      GPS_METRICS.forEach(m => {
        const sum = posPlayers.reduce((s: number, p: any) => {
          const last = p.agg[p.agg.length - 1] as any
          return s + (last ? getVal(last, m.key) : 0)
        }, 0)
        result[pos][m.key] = posPlayers.length ? +(sum / posPlayers.length).toFixed(1) : 0
      })
    })
    return result
  }, [aggPlayers])

  // Fixed rankings for totalDistance and hsr
  const totalDistRanking = useMemo(() =>
    aggPlayers.map((p: any) => {
      const last = p.agg[p.agg.length - 1] as any
      return { id: p.id, name: p.name, pos: p.position, photo: p.photo, value: last ? getVal(last, 'totalDistance') : 0 }
    }).sort((a: any, b: any) => b.value - a.value),
    [aggPlayers]
  )
  const hsrRanking = useMemo(() =>
    aggPlayers.map((p: any) => {
      const last = p.agg[p.agg.length - 1] as any
      return { id: p.id, name: p.name, pos: p.position, photo: p.photo, value: last ? getVal(last, 'hsr') : 0 }
    }).sort((a: any, b: any) => b.value - a.value),
    [aggPlayers]
  )

  // Session date picker state (lifted from SessionDaySummary)
  const allSessionDates = useMemo(() => {
    if (!isGps) return []
    return [...new Set(aggPlayers.flatMap((p: any) => p.agg.map((d: any) => d.date)))].sort()
  }, [aggPlayers, isGps])

  const allSessionMonths = useMemo(() =>
    [...new Set(allSessionDates.map(d => d.slice(0, 7)))].sort(),
    [allSessionDates]
  )

  const [selectedSessionDate, setSelectedSessionDate] = useState(() =>
    allSessionDates.length > 0 ? allSessionDates[allSessionDates.length - 1] : ''
  )
  const [selectedSessionMonth, setSelectedSessionMonth] = useState(() =>
    allSessionMonths.length > 0 ? allSessionMonths[allSessionMonths.length - 1] : ''
  )

  useEffect(() => {
    if (allSessionDates.length > 0) {
      const last = allSessionDates[allSessionDates.length - 1]
      setSelectedSessionDate(last)
      setSelectedSessionMonth(last.slice(0, 7))
    }
  }, [players, period, isGps]) // eslint-disable-line react-hooks/exhaustive-deps

  const monthSessionDates = useMemo(() =>
    allSessionDates.filter(d => d.startsWith(selectedSessionMonth)),
    [allSessionDates, selectedSessionMonth]
  )

  const sessionPlayersOnDate = useMemo(() =>
    aggPlayers.map((p: any) => ({
      ...p,
      session: p.agg.find((d: any) => d.date === selectedSessionDate) as any
    })).filter((p: any) => p.session),
    [aggPlayers, selectedSessionDate]
  )

  const DOW_LABELS = ['日','月','火','水','木','金','土']
  const sessionInfoDate = selectedSessionDate ? (() => {
    const dt = new Date(selectedSessionDate)
    return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}(${DOW_LABELS[dt.getDay()]})`
  })() : ''
  const sessionSample = sessionPlayersOnDate[0]?.session as any
  const sessionIsMatch = sessionSample?.sessionType === 'match'
  const sessionOpponent = sessionSample?.opponent
  const sessionVenue = sessionSample?.venue
  const sessionScore = sessionSample?.score

  return (
    <div className="space-y-4">

      {/* === SESSION + GPS: date picker + session info ABOVE everything === */}
      {period === 'session' && isGps && (
        <>
          {/* Date picker: month tabs + day pills (oldest left) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {allSessionMonths.map(m => {
                const mNum = parseInt(m.slice(5))
                const isSel = selectedSessionMonth === m
                return (
                  <button key={m} onClick={() => setSelectedSessionMonth(m)}
                    className="px-4 py-1.5 rounded-lg text-sm font-bold border transition-all"
                    style={isSel
                      ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb' }
                      : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent' }}>
                    {mNum}月
                  </button>
                )
              })}
            </div>
            <div className="flex gap-1 flex-wrap">
              {monthSessionDates.map(d => {
                const dt = new Date(d)
                const isMatch = aggPlayers.some((p: any) => p.agg.find((s: any) => s.date === d && s.sessionType === 'match'))
                const isSel = selectedSessionDate === d
                return (
                  <button key={d} onClick={() => setSelectedSessionDate(d)}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold border transition-all flex items-center gap-0.5"
                    style={isSel
                      ? isMatch
                        ? { color: '#dc2626', background: '#fef2f2', borderColor: '#fca5a5' }
                        : { color: '#fff', background: '#2563eb', borderColor: '#2563eb' }
                      : isMatch
                        ? { color: '#f87171', borderColor: '#fecaca', background: '#fff5f5' }
                        : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent' }}>
                    {isMatch && <span style={{ fontSize: 9 }}>⚽</span>}
                    {dt.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Session info */}
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="flex items-start gap-4 flex-wrap">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">日時</p>
                <p className="text-sm font-bold text-slate-800">{sessionInfoDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">種別</p>
                {sessionIsMatch
                  ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">⚽ 試合</span>
                  : <span className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">🏃 練習</span>
                }
              </div>
              {sessionIsMatch && sessionOpponent && (
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">対戦相手</p>
                  <p className="text-xs font-bold text-slate-800">
                    {sessionVenue === 'H' ? '🏠' : '✈️'} {sessionOpponent}
                    <span className="ml-1 text-[10px] font-normal px-1 py-0.5 rounded"
                      style={sessionVenue === 'H' ? { color: '#2563eb', background: '#eff6ff' } : { color: '#7c3aed', background: '#f5f3ff' }}>
                      {sessionVenue === 'H' ? 'HOME' : 'AWAY'}
                    </span>
                  </p>
                </div>
              )}
              {sessionIsMatch && sessionScore && (
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">スコア</p>
                  <p className="text-xs font-bold text-slate-800">{sessionScore}</p>
                </div>
              )}
              <div className="ml-auto text-right">
                <p className="text-[10px] text-slate-400 mb-0.5">データ</p>
                <p className="text-sm font-bold text-slate-800">{sessionPlayersOnDate.length}<span className="text-xs font-normal text-slate-400 ml-0.5">名</span></p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Metric selector (hidden for session+GPS) */}
      {!(period === 'session' && isGps) && (
        <div className="flex flex-wrap gap-2">
          {metrics.map(m => (
            <button key={m.key} onClick={() => setMetricKey(m.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={effectiveKey === m.key
                ? { color: m.accent, background: m.accent + '12', borderColor: m.accent + '40' }
                : { color: '#374151', borderColor: '#e2e8f0', background: 'transparent' }}>
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* FP / GK average cards: 2-column, FP left GK right, ABOVE rankings */}
      {isGps && (
        <div className="grid grid-cols-2 gap-3">
          {(['FP', 'GK'] as DisplayPos[]).map(pos => (
            <div key={pos} className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: GROUP_COLORS[pos], background: GROUP_COLORS[pos] + '15' }}>{pos} 平均</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {GPS_METRICS.map(m => {
                  const val = posMetricAvgs[pos]?.[m.key] ?? 0
                  return (
                    <div key={m.key} className="text-center min-w-[60px]">
                      <div className="text-[9px] text-slate-400 whitespace-nowrap leading-tight">{m.label}</div>
                      <div className="text-sm font-bold text-slate-800">{val.toLocaleString()}</div>
                      <div className="text-[8px] text-slate-400">{m.unit}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dual ranking: totalDistance + HSR */}
      {isGps ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: '総走行距離 ランキング', ranking: totalDistRanking, unit: 'm', accent: '#3b82f6' },
            { title: 'HSR（20km/h+）ランキング', ranking: hsrRanking, unit: 'm', accent: '#ef4444' },
          ].map(({ title, ranking, unit }) => {
            const maxVal = ranking[0]?.value ?? 1
            const gkPlayers = ranking.filter((p: any) => p.pos === 'GK')
            const fpPlayers = ranking.filter((p: any) => p.pos !== 'GK')
            const gkAvg = gkPlayers.length ? gkPlayers.reduce((s: number, p: any) => s + p.value, 0) / gkPlayers.length : 0
            const fpAvg = fpPlayers.length ? fpPlayers.reduce((s: number, p: any) => s + p.value, 0) / fpPlayers.length : 0
            const gkAvgPct = (gkAvg / maxVal) * 100
            const fpAvgPct = (fpAvg / maxVal) * 100
            return (
              <div key={title} className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
                </div>
                {/* Average legend */}
                <div className="flex gap-3 mb-3 text-[10px]">
                  <span className="flex items-center gap-1 text-slate-500">
                    <span className="inline-block w-4 h-px border-t-2 border-dashed" style={{ borderColor: '#6366f1' }} />
                    FP平均 <span className="font-bold text-slate-800">{Math.round(fpAvg).toLocaleString()}</span> {unit}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <span className="inline-block w-4 h-px border-t-2 border-dashed" style={{ borderColor: '#f59e0b' }} />
                    GK平均 <span className="font-bold text-slate-800">{Math.round(gkAvg).toLocaleString()}</span> {unit}
                  </span>
                </div>
                <div className="space-y-1 max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                  {ranking.map((d: any, rank: number) => {
                    const color = POSITION_COLORS[d.pos]
                    const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0
                    return (
                      <div key={d.id} className="flex items-center gap-2">
                        <span className="text-xs w-5 text-right flex-shrink-0 font-bold"
                          style={{ color: rank < 3 ? '#f59e0b' : '#cbd5e1' }}>{rank + 1}</span>
                        <img src={d.photo} alt={d.name}
                          className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-slate-200"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <span className="text-xs w-32 flex-shrink-0 truncate font-medium text-slate-800">{d.name}</span>
                        <span className="text-[10px] w-6 flex-shrink-0 text-slate-600 font-medium">{d.pos}</span>
                        <div className="flex-1 h-4 rounded-sm overflow-hidden bg-slate-100 relative">
                          <div className="h-full rounded-sm"
                            style={{ width: `${pct}%`, backgroundColor: color + '30', borderRight: `1.5px solid ${color}` }} />
                          {/* FP average line */}
                          <div className="absolute top-0 bottom-0 w-px"
                            style={{ left: `${fpAvgPct}%`, backgroundColor: '#6366f1', opacity: 0.7 }} />
                          {/* GK average line */}
                          <div className="absolute top-0 bottom-0 w-px"
                            style={{ left: `${gkAvgPct}%`, backgroundColor: '#f59e0b', opacity: 0.7 }} />
                        </div>
                        <span className="text-xs w-16 text-right flex-shrink-0 font-bold text-slate-800">
                          {d.value.toLocaleString()}
                          <span className="font-normal text-slate-400 ml-0.5">{unit}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider text-slate-400">
            {activeM.label} ランキング（全{players.length}名）
          </h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {latestVals.map((d, rank) => {
              const color = POSITION_COLORS[d.pos]
              const max = latestVals[0].value
              const pct = max > 0 ? (d.value / max) * 100 : 0
              return (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="text-xs w-5 text-right flex-shrink-0"
                    style={{ color: rank < 3 ? '#f59e0b' : '#cbd5e1' }}>{rank + 1}</span>
                  <img src={d.photo} alt={d.name}
                    className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-slate-200"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <span className="text-xs w-32 flex-shrink-0 truncate font-medium text-slate-800">{d.name}</span>
                  <span className="text-xs w-6 flex-shrink-0 text-slate-600">{d.pos}</span>
                  <div className="flex-1 h-4 rounded-sm overflow-hidden bg-slate-100">
                    <div className="h-full rounded-sm"
                      style={{ width: `${pct}%`, backgroundColor: color + '30', borderRight: `1.5px solid ${color}` }} />
                  </div>
                  <span className="text-xs w-16 text-right flex-shrink-0 font-bold text-slate-800">
                    {typeof d.value === 'number' ? d.value.toLocaleString() : d.value}
                    <span className="font-normal text-slate-400 ml-0.5">{activeM.unit}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Trend chart (non-session periods) */}
      {period !== 'session' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider text-slate-400">
            {activeM.label} トレンド（全選手）
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={v => formatPeriodLabel(v, period)} {...CHART.axis} />
              <YAxis {...CHART.axis} />
              <Tooltip
                {...CHART.tooltip}
                formatter={(v, name) => {
                  const p = players.find(p => p.id === name)
                  return [`${Number(v).toLocaleString()} ${activeM.unit}`, p?.name ?? name]
                }}
                labelFormatter={l => formatPeriodLabel(l, period)}
              />
              {players.map(p => (
                <Line key={p.id} type="monotone" dataKey={p.id}
                  stroke={POSITION_COLORS[p.position] + '80'}
                  strokeWidth={1} dot={false}
                  activeDot={{ r: 3, fill: POSITION_COLORS[p.position], strokeWidth: 0 }}
                  connectNulls
                />
              ))}
              {DISPLAY_POSITIONS.map(pos => (
                <Line key={`leg-${pos}`} type="monotone" dataKey={`__${pos}__`}
                  stroke={GROUP_COLORS[pos]} strokeWidth={2} dot={false} name={pos} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-2 justify-center">
            {DISPLAY_POSITIONS.map(pos => (
              <div key={pos} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: GROUP_COLORS[pos] }} />
                <span className="text-xs text-slate-400">{pos}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session player cards (session+GPS only) */}
      {period === 'session' && isGps && (
        <SessionDaySummary aggPlayers={aggPlayers} metrics={GPS_METRICS} selectedDate={selectedSessionDate} />
      )}

      {/* All players data table (GPS only) */}
      {isGps && (
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="text-xs font-semibold mb-1 uppercase tracking-wider text-slate-400">
            全選手 GPS データ一覧
          </h3>
          <p className="text-[10px] text-slate-400 mb-4">ポジション平均以上のセルを強調表示</p>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ tableLayout: 'fixed', width: '100%', minWidth: 900 }}>
              <colgroup>
                <col style={{ width: 140 }} />
                <col style={{ width: 44 }} />
                {GPS_METRICS.map(m => <col key={m.key} style={{ width: 72 }} />)}
                {ZONE_COLS.map(z => <col key={z.key} style={{ width: 72 }} />)}
              </colgroup>
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="text-left py-2 pr-3 text-slate-700 font-semibold sticky left-0 bg-white">選手</th>
                  <th className="text-center py-2 px-1 text-slate-700 font-semibold">POS</th>
                  {GPS_METRICS.map(m => (
                    <th key={m.key} className="text-right py-2 px-1 text-slate-700 font-semibold leading-tight">
                      <div className="break-words hyphens-auto">{m.label}</div>
                      <div className="text-slate-400 font-normal text-[10px] mt-0.5">{m.unit}</div>
                    </th>
                  ))}
                  {ZONE_COLS.map(z => (
                    <th key={z.key} className="text-right py-2 px-1 text-slate-700 font-semibold leading-tight">
                      <div className="break-words">{z.label}</div>
                      <div className="font-normal text-[10px] text-slate-400 mt-0.5">m</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...aggPlayers].sort((a: any, b: any) => {
                  const aLast = a.agg[a.agg.length - 1] as any
                  const bLast = b.agg[b.agg.length - 1] as any
                  return getVal(bLast, 'totalDistance') - getVal(aLast, 'totalDistance')
                }).map((p: any) => {
                  const last = p.agg[p.agg.length - 1] as any
                  const posGroup = (POS_GROUPS['GK'] as string[]).includes(p.position) ? 'GK' : 'FP'
                  const groupAvgs = posMetricAvgs[posGroup] ?? {}
                  return (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-1.5 pr-2 sticky left-0 bg-white">
                        <div className="flex items-center gap-1.5">
                          <img src={p.photo} alt={p.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          <span className="font-medium text-slate-800 truncate">{p.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-1.5 px-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                          {p.position}
                        </span>
                      </td>
                      {GPS_METRICS.map(m => {
                        const val = last ? (getVal(last, m.key) || 0) : 0
                        const avg = groupAvgs[m.key] ?? 0
                        const aboveAvg = avg > 0 && val > avg
                        return (
                          <td key={m.key} className="text-right py-1.5 px-1 font-semibold tabular-nums"
                            style={aboveAvg
                              ? { color: m.accent, background: m.accent + '10' }
                              : { color: '#1e293b' }}>
                            {val.toLocaleString()}
                          </td>
                        )
                      })}
                      {ZONE_COLS.map(z => {
                        const val = last ? (getVal(last, z.key) || 0) : 0
                        return (
                          <td key={z.key} className="text-right py-1.5 px-1 tabular-nums text-slate-700">
                            {val.toLocaleString()}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
