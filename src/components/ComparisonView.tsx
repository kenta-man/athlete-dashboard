import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell,
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
  { key: 'totalDistance',    label: '総走行距離',      unit: 'm',    accent: '#3b82f6' },
  { key: 'maxSpeed',         label: '最高速度',        unit: 'km/h', accent: '#10b981' },
  { key: 'explosiveEfforts', label: 'EE',              unit: '回',   accent: '#f59e0b' },
  { key: 'dist_25plus',      label: '25km/h< 走行',    unit: 'm',    accent: '#ef4444' },
  { key: 'accel_3ms2',       label: '3m/s² 加速',      unit: '回',   accent: '#8b5cf6' },
  { key: 'running',          label: 'ランニング時間',   unit: 'min',  accent: '#0ea5e9' },
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

const GPS_RADAR_KEYS   = ['totalDistance','maxSpeed','explosiveEfforts','accel_3ms2','dist_20_25','running'] as const
const GPS_RADAR_LABELS = ['走行距離','最高速度','EE','加速','高速走行','走行時間']
const GPS_RADAR_MAX    = [13000, 35, 20, 30, 1500, 90]
const COND_RADAR_KEYS  = ['muscleMass','skeletalMuscleMass','phaseAngleWhole','hydrationRate','bmr'] as const
const COND_RADAR_LABELS= ['筋肉量','骨格筋量','位相角','水和率','基礎代謝']
const COND_RADAR_MAX   = [75, 45, 10, 80, 2200]

const POSITIONS = ['GK','DF','MF','FW']

function getVal(obj: Record<string, unknown>, key: string): number {
  return (obj as unknown as Record<string, number>)[key] ?? 0
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
      ? aggregateGpsData(p.gpsData, period)
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

  const posAvgData = useMemo(() =>
    POSITIONS.map(pos => {
      const posPlayers = aggPlayers.filter(p => p.position === pos)
      const vals = posPlayers.map(p => {
        const last = p.agg[p.agg.length - 1] as unknown as Record<string, number>
        return last ? getVal(last, effectiveKey) : 0
      })
      const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
      return { pos, avg: +avg.toFixed(1), color: POSITION_COLORS[pos], count: posPlayers.length }
    }),
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

  const radarKeys    = isGps ? GPS_RADAR_KEYS    : COND_RADAR_KEYS
  const radarLabels  = isGps ? GPS_RADAR_LABELS  : COND_RADAR_LABELS
  const radarMax     = isGps ? GPS_RADAR_MAX     : COND_RADAR_MAX

  const radarData = radarLabels.map((label, i) => {
    const row: Record<string, unknown> = { label }
    POSITIONS.forEach(pos => {
      const posP = aggPlayers.filter(p => p.position === pos)
      if (!posP.length) { row[pos] = 0; return }
      const avg = posP.reduce((s, p) => {
        const last = p.agg[p.agg.length - 1] as unknown as Record<string, number>
        return s + (last ? getVal(last, radarKeys[i] as string) : 0)
      }, 0) / posP.length
      row[pos] = Math.min(100, Math.round(avg / radarMax[i] * 100))
    })
    return row
  })

  return (
    <div className="space-y-4">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-2">
        {metrics.map(m => (
          <button key={m.key} onClick={() => setMetricKey(m.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={effectiveKey === m.key
              ? { color: m.accent, background: m.accent + '12', borderColor: m.accent + '40' }
              : { color: '#94a3b8', borderColor: '#e2e8f0', background: 'transparent' }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Ranking + Position avg */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Ranking */}
        <div className="md:col-span-2 bg-white rounded-xl p-5 border border-slate-200">
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
                    className="w-5 h-5 rounded-full object-cover flex-shrink-0 border"
                    style={{ borderColor: color + '50' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <span className="text-xs w-20 flex-shrink-0 truncate font-medium" style={{ color }}>
                    {d.name.split(' ').pop()}
                  </span>
                  <span className="text-xs w-6 flex-shrink-0 text-slate-400">{d.pos}</span>
                  <div className="flex-1 h-4 rounded-sm overflow-hidden bg-slate-100">
                    <div className="h-full rounded-sm"
                      style={{ width: `${pct}%`, backgroundColor: color + '30', borderRight: `1.5px solid ${color}` }} />
                  </div>
                  <span className="text-xs w-14 text-right flex-shrink-0 font-bold" style={{ color }}>
                    {typeof d.value === 'number' ? d.value.toLocaleString() : d.value}
                    <span className="font-normal text-slate-400 ml-0.5">{activeM.unit}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Position average */}
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider text-slate-400">
            ポジション別平均
          </h3>
          <div className="space-y-4">
            {posAvgData.map(p => (
              <div key={p.pos}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: p.color }}>{p.pos}</span>
                  <span className="text-xs font-bold" style={{ color: p.color }}>
                    {p.avg.toLocaleString()} <span className="font-normal text-slate-400">{activeM.unit}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-slate-100">
                  <div className="h-full rounded-full"
                    style={{
                      width: `${Math.max(...posAvgData.map(x => x.avg)) > 0 ? (p.avg / Math.max(...posAvgData.map(x => x.avg))) * 100 : 0}%`,
                      backgroundColor: p.color + '60',
                    }} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{p.count}名の平均</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend + Radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
                  strokeWidth={1}
                  dot={false}
                  activeDot={{ r: 3, fill: POSITION_COLORS[p.position], strokeWidth: 0 }}
                  connectNulls
                />
              ))}
              {POSITIONS.map(pos => (
                <Line key={`leg-${pos}`} type="monotone" dataKey={`__${pos}__`}
                  stroke={POSITION_COLORS[pos]} strokeWidth={2} dot={false} name={pos} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-2 justify-center">
            {POSITIONS.map(pos => (
              <div key={pos} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: POSITION_COLORS[pos] }} />
                <span className="text-xs text-slate-400">{pos}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider text-slate-400">
            ポジション別 総合比較（最新・正規化）
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              {POSITIONS.map(pos => (
                <Radar key={pos} name={pos} dataKey={pos}
                  stroke={POSITION_COLORS[pos]} fill={POSITION_COLORS[pos]}
                  fillOpacity={0.08} strokeWidth={1.5} />
              ))}
              <Legend {...CHART.legend} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* All-metrics cross comparison */}
      <div className="bg-white rounded-xl p-5 border border-slate-200">
        <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider text-slate-400">
          全指標 ポジション別比較（最新・最大値比%）
        </h3>
        {(() => {
          const barData = metrics.map(m => {
            const row: Record<string, unknown> = { metric: m.label }
            POSITIONS.forEach(pos => {
              const posP = aggPlayers.filter(p => p.position === pos)
              if (!posP.length) { row[pos] = 0; return }
              const avg = posP.reduce((s, p) => {
                const last = p.agg[p.agg.length - 1] as unknown as Record<string, number>
                return s + (last ? getVal(last, m.key) : 0)
              }, 0) / posP.length
              const allAvg = aggPlayers.reduce((s, p) => {
                const last = p.agg[p.agg.length - 1] as unknown as Record<string, number>
                return s + (last ? getVal(last, m.key) : 0)
              }, 0) / aggPlayers.length
              row[pos] = m.key === 'bodyFatPct' || m.key === 'hrResting'
                ? +((allAvg / Math.max(avg, 0.01)) * 60).toFixed(1)
                : +(avg / Math.max(allAvg, 0.01) * 60).toFixed(1)
            })
            return row
          })
          return (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" barGap={2} barCategoryGap="20%">
                <CartesianGrid {...CHART.grid} />
                <XAxis type="number" {...CHART.axis} domain={[0, 90]} tick={false} />
                <YAxis dataKey="metric" type="category" width={100} {...CHART.axis}
                  tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  {...CHART.tooltip}
                  formatter={(v, name) => [`${Number(v).toFixed(0)} (チーム平均比)`, name]}
                />
                <Legend {...CHART.legend} />
                {POSITIONS.map(pos => (
                  <Bar key={pos} dataKey={pos} name={pos} barSize={10} radius={[0,3,3,0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={POSITION_COLORS[pos]} fillOpacity={0.65} />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          )
        })()}
      </div>

      {/* Top 5 */}
      <div className="bg-white rounded-xl p-5 border border-slate-200">
        <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider text-slate-400">
          {activeM.label} TOP 5
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {latestVals.slice(0, 5).map((d, rank) => {
            const color = POSITION_COLORS[d.pos]
            const rankColors = ['#f59e0b','#94a3b8','#b45309','#64748b','#64748b']
            return (
              <div key={d.id} className="rounded-xl p-4 text-center border bg-slate-50"
                style={{ borderColor: color + '30' }}>
                <div className="text-xs font-bold mb-2" style={{ color: rankColors[rank] }}>#{rank + 1}</div>
                <img src={d.photo} alt={d.name}
                  className="w-10 h-10 rounded-full object-cover mx-auto mb-2 border-2"
                  style={{ borderColor: color + '50' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full mb-2 inline-block"
                  style={{ color, background: color + '15' }}>{d.pos}</span>
                <p className="text-xs font-medium mb-1 truncate" style={{ color }}>
                  {d.name.split(' ').pop()}
                </p>
                <p className="text-lg font-bold" style={{ color }}>
                  {d.value.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">{activeM.unit}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
