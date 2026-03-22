import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { POSITION_COLORS, type Player } from '../data/sampleData'
import { aggregateGpsData, aggregateCondData, type Period, formatPeriodLabel } from '../utils/aggregation'

interface Props { players: Player[]; dataTab: 'gps' | 'conditioning' }

const CHART = {
  grid: { stroke: '#f1f5f9', strokeDasharray: '3 3' },
  axis: { tick: { fill: '#94a3b8', fontSize: 11 }, axisLine: false, tickLine: false },
  tooltip: {
    contentStyle: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: '#475569', marginBottom: 4 },
    itemStyle: { color: '#334155' },
    cursor: { fill: 'rgba(0,0,0,0.03)' },
  },
}

const GPS_METRICS = [
  { key: 'totalDistance',    label: '総走行距離',          unit: 'm',     accent: '#3b82f6' },
  { key: 'hsr',              label: 'HSR（20km/h+）',       unit: 'm',     accent: '#ef4444' },
  { key: 'intensity',        label: '1分あたり走行距離',   unit: 'm/min', accent: '#0284c7' },
  { key: 'maxSpeed',         label: '最高速度',             unit: 'km/h',  accent: '#059669' },
  { key: 'explosiveEfforts', label: 'Explosive Effort',     unit: '回',    accent: '#d97706' },
  { key: 'accel_3ms2',       label: '加速',                 unit: '回',    accent: '#f97316' },
  { key: 'decel_3ms2',       label: '減速',                 unit: '回',    accent: '#be185d' },
]

const ZONE_COLS = [
  { key: 'dist_0_7',    label: '0–7km/h',   color: '#3b82f6' },
  { key: 'dist_7_15',   label: '7–15km/h',  color: '#10b981' },
  { key: 'dist_15_20',  label: '15–20km/h', color: '#f59e0b' },
  { key: 'dist_20_25',  label: '20–25km/h', color: '#f97316' },
  { key: 'dist_25plus', label: '25+km/h',   color: '#ef4444' },
]

const COND_METRICS = [
  { key: 'bodyFatPct',         label: '体脂肪率',   unit: '%',   accent: '#ef4444' },
  { key: 'muscleMass',         label: '筋肉量',     unit: 'kg',  accent: '#10b981' },
  { key: 'skeletalMuscleMass', label: '骨格筋量',   unit: 'kg',  accent: '#059669' },
  { key: 'weight',             label: '体重',       unit: 'kg',  accent: '#3b82f6' },
  { key: 'phaseAngleWhole',    label: '全身位相角', unit: '°',   accent: '#8b5cf6' },
  { key: 'hydrationRate',      label: '水和率',     unit: '%',   accent: '#0ea5e9' },
  { key: 'hrResting',          label: '安静時心拍', unit: 'bpm', accent: '#ef4444' },
  { key: 'hrv',                label: 'HRV',        unit: 'ms',  accent: '#6366f1' },
]

const DISPLAY_POSITIONS = ['GK', 'FP'] as const
type DisplayPos = typeof DISPLAY_POSITIONS[number]
const POS_GROUPS: Record<DisplayPos, string[]> = { GK: ['GK'], FP: ['DF', 'MF', 'FW'] }
const GROUP_COLORS: Record<DisplayPos, string> = { GK: '#f59e0b', FP: '#6366f1' }

const MATRIX_PERIODS = [
  { key: 'daily'   as const, label: '日別' },
  { key: 'weekly'  as const, label: '週別' },
  { key: 'monthly' as const, label: '月別' },
]

function getVal(obj: Record<string, unknown>, key: string): number {
  return (obj as unknown as Record<string, number>)[key] ?? 0
}

/* ── Ranking bar pair component ── */
function RankingPair({
  leftTitle, leftRanking, leftUnit, leftFpAvg, leftGkAvg,
  rightTitle, rightRanking, rightUnit, rightFpAvg, rightGkAvg,
}: {
  leftTitle: string; leftRanking: any[]; leftUnit: string; leftFpAvg: number; leftGkAvg: number
  rightTitle: string; rightRanking: any[]; rightUnit: string; rightFpAvg: number; rightGkAvg: number
}) {
  const renderRank = (ranking: any[], unit: string, fpAvg: number, gkAvg: number) => {
    const maxVal = ranking[0]?.value ?? 1
    const fpAvgPct = (fpAvg / maxVal) * 100
    const gkAvgPct = (gkAvg / maxVal) * 100
    return ranking.map((d: any, rank: number) => {
      const isGK = d.pos === 'GK'
      const groupAvg = isGK ? gkAvg : fpAvg
      const aboveAvg = d.value > groupAvg
      const highlightColor = isGK ? '#f59e0b' : '#6366f1'
      const barBg = aboveAvg ? highlightColor + '25' : '#e2e8f0'
      const barBorder = aboveAvg ? highlightColor : '#cbd5e1'
      const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0
      return (
        <div key={d.id} className="flex items-center gap-2">
          <span className="text-xs w-5 text-right flex-shrink-0 font-bold"
            style={{ color: rank < 3 ? '#f59e0b' : '#cbd5e1' }}>{rank + 1}</span>
          <img src={d.photo} alt={d.name}
            className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-slate-200"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span className="text-xs w-28 flex-shrink-0 truncate font-medium text-slate-800">{d.name}</span>
          <span className="text-[10px] w-6 flex-shrink-0 font-medium"
            style={{ color: aboveAvg ? highlightColor : '#94a3b8' }}>{d.pos}</span>
          <div className="flex-1 h-4 overflow-hidden bg-slate-100 relative" style={{ borderRadius: 2 }}>
            <div className="h-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: barBg, borderRight: `2px solid ${barBorder}` }} />
            <div className="absolute top-0 bottom-0 w-px"
              style={{ left: `${fpAvgPct}%`, backgroundColor: '#6366f1', opacity: 0.6 }} />
            <div className="absolute top-0 bottom-0 w-px"
              style={{ left: `${gkAvgPct}%`, backgroundColor: '#f59e0b', opacity: 0.6 }} />
          </div>
          <span className="text-xs w-16 text-right flex-shrink-0 font-bold"
            style={{ color: aboveAvg ? highlightColor : '#1e293b' }}>
            {d.value.toLocaleString()}
            <span className="font-normal text-slate-400 ml-0.5">{unit}</span>
          </span>
        </div>
      )
    })
  }

  const legendRow = (fpAvg: number, gkAvg: number, unit: string) => (
    <div className="flex gap-3 mb-3 text-[10px] px-5 pt-3">
      <span className="flex items-center gap-1 text-slate-500">
        <span className="inline-block w-4 h-px border-t-2 border-dashed" style={{ borderColor: '#6366f1' }} />
        FP平均 <span className="font-bold text-slate-800">{Math.round(fpAvg).toLocaleString()}</span> {unit}
      </span>
      <span className="flex items-center gap-1 text-slate-500">
        <span className="inline-block w-4 h-px border-t-2 border-dashed" style={{ borderColor: '#f59e0b' }} />
        GK平均 <span className="font-bold text-slate-800">{Math.round(gkAvg).toLocaleString()}</span> {unit}
      </span>
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>{leftTitle}</h3>
        </div>
        {legendRow(leftFpAvg, leftGkAvg, leftUnit)}
        <div className="space-y-1 max-h-80 overflow-y-auto pr-1 px-5 pb-4" style={{ scrollbarWidth: 'none' }}>
          {renderRank(leftRanking, leftUnit, leftFpAvg, leftGkAvg)}
        </div>
      </div>
      <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>{rightTitle}</h3>
        </div>
        {legendRow(rightFpAvg, rightGkAvg, rightUnit)}
        <div className="space-y-1 max-h-80 overflow-y-auto pr-1 px-5 pb-4" style={{ scrollbarWidth: 'none' }}>
          {renderRank(rightRanking, rightUnit, rightFpAvg, rightGkAvg)}
        </div>
      </div>
    </div>
  )
}

/* ── Session player cards ── */
function SessionDaySummary({ aggPlayers, selectedDate }: { aggPlayers: any[]; selectedDate: string }) {
  const playersOnDate = aggPlayers.map((p: any) => {
    const session = p.agg.find((d: any) => d.date === selectedDate) as any
    return { ...p, session }
  }).filter((p: any) => p.session)

  if (playersOnDate.length === 0) return null
  return (
    <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
      <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>選手別データ</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 p-3">
        {playersOnDate.map((p: any) => {
          const s = p.session
          return (
            <div key={p.id} className="border p-2.5 bg-slate-50 border-slate-200" style={{ borderRadius: 0 }}>
              <div className="flex items-center gap-1.5 mb-2">
                <img src={p.photo} alt={p.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200 flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold truncate text-slate-800">{p.name}</p>
                  <span className="text-[8px] font-bold px-1 py-0.5" style={{ background: '#1a1a1a', color: '#fff', borderRadius: 2 }}>{p.position}</span>
                </div>
              </div>
              <div className="space-y-0.5">
                {GPS_METRICS.map((m: any) => (
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

/* ══════════════════════════════════════════
   Main component
══════════════════════════════════════════ */
export default function ComparisonView({ players, dataTab }: Props) {
  const isGps = dataTab === 'gps'

  /* ── GPS internal view tab ── */
  const [compView, setCompView] = useState<'session' | 'matrix'>('matrix')

  /* ── GPS session state ── */
  const [selectedSessionDate, setSelectedSessionDate] = useState('')
  const [selectedSessionMonth, setSelectedSessionMonth] = useState('')

  /* ── GPS matrix state ── */
  const [matrixMetricKey, setMatrixMetricKey] = useState('totalDistance')
  const [matrixPeriod, setMatrixPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [selectedMatrixKeys, setSelectedMatrixKeys] = useState<Set<string>>(new Set())
  const [matrixMonthFilter, setMatrixMonthFilter] = useState<Set<string>>(new Set())
  // Reset key selection when period changes
  useEffect(() => {
    setSelectedMatrixKeys(new Set())
    setMatrixMonthFilter(new Set())
  }, [matrixPeriod])

  /* ── Conditioning internal state ── */
  const [condPeriod, setCondPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [condMetricKey, setCondMetricKey] = useState(COND_METRICS[0].key)

  /* ── Pre-compute GPS agg for all periods ── */
  const gpsAgg = useMemo(() => {
    const compute = (p: Period) => players.map(pl => ({
      ...pl,
      agg: aggregateGpsData(pl.gpsData, p).map((d: any) => ({
        ...d,
        hsr: (d.dist_20_25 ?? 0) + (d.dist_25plus ?? 0),
        intensity: d.running > 0 ? Math.round(d.totalDistance / d.running) : 0,
      }))
    }))
    return {
      session: compute('session'),
      daily:   compute('daily'),
      weekly:  compute('weekly'),
      monthly: compute('monthly'),
    }
  }, [players])

  /* ── Matrix time-series keys ── */
  const allMatrixKeys = useMemo(() => {
    const s = new Set<string>()
    gpsAgg[matrixPeriod].forEach((p: any) => p.agg.forEach((d: any) => s.add(d.date)))
    return [...s].sort()
  }, [gpsAgg, matrixPeriod])

  const allMatrixMonths = useMemo(() =>
    [...new Set(allMatrixKeys.map(k => k.slice(0, 7)))].sort(),
    [allMatrixKeys]
  )

  const filteredMatrixKeys = useMemo(() => {
    // For daily: month filter narrows visible dates
    if (matrixPeriod === 'daily' && matrixMonthFilter.size > 0) {
      const base = allMatrixKeys.filter(k => matrixMonthFilter.has(k.slice(0, 7)))
      return selectedMatrixKeys.size > 0 ? base.filter(k => selectedMatrixKeys.has(k)) : base
    }
    return selectedMatrixKeys.size > 0 ? allMatrixKeys.filter(k => selectedMatrixKeys.has(k)) : allMatrixKeys
  }, [allMatrixKeys, matrixPeriod, matrixMonthFilter, selectedMatrixKeys])

  const formatMatrixKey = (k: string) => {
    if (matrixPeriod === 'daily') {
      const [, m, d] = k.split('-')
      return `${parseInt(m)}/${parseInt(d)}`
    }
    if (matrixPeriod === 'weekly') return k.replace(/^\d{4}-/, '')  // "W01"
    if (matrixPeriod === 'monthly') return `${parseInt(k.slice(5))}月`
    return k
  }

  // Per-column group averages (for above-avg highlight)
  const matrixColGroupAvgs = useMemo(() => {
    const result: Record<string, Record<DisplayPos, number>> = {}
    filteredMatrixKeys.forEach(k => {
      result[k] = {} as Record<DisplayPos, number>
      DISPLAY_POSITIONS.forEach(pos => {
        const group = gpsAgg[matrixPeriod].filter((p: any) => POS_GROUPS[pos].includes(p.position))
        const vals = group.map((p: any) => {
          const d = p.agg.find((a: any) => a.date === k) as any
          return d ? getVal(d, matrixMetricKey) : null
        }).filter((v): v is number => v !== null)
        result[k][pos] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
      })
    })
    return result
  }, [filteredMatrixKeys, gpsAgg, matrixPeriod, matrixMetricKey])

  // All selectable metrics (GPS + Zone)
  const ALL_MATRIX_METRICS = [
    ...GPS_METRICS,
    ...ZONE_COLS.map(z => ({ key: z.key, label: z.label, unit: 'm', accent: z.color })),
  ]
  const matrixMetric = ALL_MATRIX_METRICS.find(m => m.key === matrixMetricKey) ?? GPS_METRICS[0]

  /* ── Session dates ── */
  const allSessionDates = useMemo(() =>
    [...new Set(gpsAgg.session.flatMap((p: any) => p.agg.map((d: any) => d.date)))].sort(),
    [gpsAgg.session]
  )
  const allSessionMonths = useMemo(() =>
    [...new Set(allSessionDates.map(d => d.slice(0, 7)))].sort(),
    [allSessionDates]
  )
  useEffect(() => {
    if (allSessionDates.length > 0) {
      const last = allSessionDates[allSessionDates.length - 1]
      setSelectedSessionDate(last)
      setSelectedSessionMonth(last.slice(0, 7))
    }
  }, [players]) // eslint-disable-line react-hooks/exhaustive-deps

  const monthSessionDates = useMemo(() =>
    allSessionDates.filter(d => d.startsWith(selectedSessionMonth)),
    [allSessionDates, selectedSessionMonth]
  )
  const sessionPlayersOnDate = useMemo(() =>
    gpsAgg.session.map((p: any) => ({
      ...p,
      session: p.agg.find((d: any) => d.date === selectedSessionDate)
    })).filter((p: any) => p.session),
    [gpsAgg.session, selectedSessionDate]
  )

  /* ── Session info ── */
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

  /* ── posMetricAvgs helper ── */
  const computePosAvgs = (aggPlayers: any[], isSession = false) => {
    const result: Record<string, Record<string, number>> = {}
    DISPLAY_POSITIONS.forEach(pos => {
      result[pos] = {}
      const posPlayers = aggPlayers.filter((p: any) => POS_GROUPS[pos].includes(p.position))
      const allCols = [...GPS_METRICS.map(m => m.key), ...ZONE_COLS.map(z => z.key)]
      allCols.forEach(key => {
        const sum = posPlayers.reduce((s: number, p: any) => {
          const val = isSession
            ? getVal(p.session ?? {}, key)
            : getVal((p.agg[p.agg.length - 1] ?? {}), key)
          return s + val
        }, 0)
        result[pos][key] = posPlayers.length ? +(sum / posPlayers.length).toFixed(1) : 0
      })
    })
    return result
  }

  const sessionPosAvgs = useMemo(() => computePosAvgs(sessionPlayersOnDate, true), [sessionPlayersOnDate])

  /* ── Rankings ── */
  const makeRanking = (aggPlayers: any[], key: string, fromSession = false) =>
    aggPlayers.map((p: any) => {
      const val = fromSession
        ? (p.session ? getVal(p.session, key) : 0)
        : (p.agg[p.agg.length - 1] ? getVal(p.agg[p.agg.length - 1], key) : 0)
      return { id: p.id, name: p.name, pos: p.position, photo: p.photo, value: val }
    }).sort((a: any, b: any) => b.value - a.value)

  const sessionDistRank = useMemo(() => makeRanking(sessionPlayersOnDate, 'totalDistance', true), [sessionPlayersOnDate])
  const sessionHsrRank  = useMemo(() => makeRanking(sessionPlayersOnDate, 'hsr', true), [sessionPlayersOnDate])

  const getGroupAvg = (ranking: any[], posGroup: DisplayPos) => {
    const group = ranking.filter((p: any) => POS_GROUPS[posGroup].includes(p.pos))
    return group.length ? group.reduce((s: number, p: any) => s + p.value, 0) / group.length : 0
  }

  /* ── FP/GK average cards ── */
  const renderPosCards = (posAvgs: Record<string, Record<string, number>>) => (
    <div className="grid grid-cols-2 gap-3">
      {(['FP', 'GK'] as DisplayPos[]).map(pos => (
        <div key={pos} className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
          <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: '#1a1a1a' }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>{pos}</span>
            <span className="text-xs font-normal" style={{ color: '#888' }}>平均</span>
            <span className="w-2 h-2 rounded-full ml-auto flex-shrink-0" style={{ backgroundColor: GROUP_COLORS[pos] }} />
          </div>
          <div className="flex gap-3 flex-wrap p-3">
            {GPS_METRICS.map(m => (
              <div key={m.key} className="text-center min-w-[60px]">
                <div className="text-[9px] text-slate-400 whitespace-nowrap leading-tight">{m.label}</div>
                <div className="text-sm font-bold text-slate-800">{(posAvgs[pos]?.[m.key] ?? 0).toLocaleString()}</div>
                <div className="text-[8px] text-slate-400">{m.unit}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  /* ── Players sorted by position for matrix rows ── */
  const matrixPlayerRows = useMemo(() => {
    const posOrder: Record<string, number> = { GK: 0, DF: 1, MF: 2, FW: 3 }
    return [...players].sort((a, b) => (posOrder[a.position] ?? 9) - (posOrder[b.position] ?? 9))
  }, [players])

  /* ── Conditioning ── */
  const condAggPlayers = useMemo(() =>
    players.map(p => ({ ...p, agg: aggregateCondData(p.conditioningData, condPeriod) })),
    [players, condPeriod]
  )
  const activeCondMetric = COND_METRICS.find(m => m.key === condMetricKey) ?? COND_METRICS[0]
  const condLatestVals = useMemo(() =>
    condAggPlayers.map(p => {
      const last = p.agg[p.agg.length - 1] as unknown as Record<string, number>
      return { id: p.id, name: p.name, pos: p.position, photo: p.photo, value: last ? getVal(last, condMetricKey) : 0 }
    }).sort((a, b) =>
      condMetricKey === 'bodyFatPct' || condMetricKey === 'hrResting' ? a.value - b.value : b.value - a.value
    ),
    [condAggPlayers, condMetricKey]
  )
  const condTrendData = useMemo(() => {
    const keys = [...new Set(condAggPlayers.flatMap(p => p.agg.map(d => d.date)))].sort()
    return keys.map(date => {
      const row: Record<string, unknown> = { date }
      condAggPlayers.forEach(p => {
        const d = p.agg.find(x => x.date === date) as unknown as Record<string, number> | undefined
        row[p.id] = d ? getVal(d, condMetricKey) : null
      })
      return row
    })
  }, [condAggPlayers, condMetricKey])

  /* ════════════════════
     CONDITIONING RENDER
  ════════════════════ */
  if (!isGps) {
    const periodLabel = MATRIX_PERIODS.find(p => p.key === condPeriod)?.label ?? ''
    return (
      <div className="space-y-4">
        {/* Header with period selector */}
        <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
          <div className="px-4 py-2 flex items-center gap-3" style={{ backgroundColor: '#1a1a1a' }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>コンディショニング比較</span>
            <div className="flex items-center gap-1 ml-auto">
              {MATRIX_PERIODS.map(p => (
                <button key={p.key} onClick={() => setCondPeriod(p.key)}
                  className="px-3 py-1 text-xs font-bold transition-all"
                  style={condPeriod === p.key
                    ? { color: '#fff', backgroundColor: '#2563eb', borderRadius: 2 }
                    : { color: '#999', backgroundColor: 'transparent', borderRadius: 2 }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Metric selector */}
        <div className="flex flex-wrap gap-2">
          {COND_METRICS.map(m => (
            <button key={m.key} onClick={() => setCondMetricKey(m.key)}
              className="px-3 py-1.5 text-xs font-medium border transition-all"
              style={condMetricKey === m.key
                ? { color: m.accent, background: m.accent + '12', borderColor: m.accent + '40', borderRadius: 4 }
                : { color: '#374151', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 4 }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Ranking */}
        <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
          <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>
              {activeCondMetric.label} ランキング {periodLabel}（全{players.length}名）
            </h3>
          </div>
          <div className="p-5">
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {condLatestVals.map((d, rank) => {
                const color = POSITION_COLORS[d.pos]
                const max = condLatestVals[0].value
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
                    <div className="flex-1 h-4 overflow-hidden bg-slate-100" style={{ borderRadius: 2 }}>
                      <div className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: color + '30', borderRight: `1.5px solid ${color}` }} />
                    </div>
                    <span className="text-xs w-16 text-right flex-shrink-0 font-bold text-slate-800">
                      {typeof d.value === 'number' ? d.value.toLocaleString() : d.value}
                      <span className="font-normal text-slate-400 ml-0.5">{activeCondMetric.unit}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Trend chart */}
        <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
          <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>
              {activeCondMetric.label} トレンド {periodLabel}
            </h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={condTrendData}>
                <CartesianGrid {...CHART.grid} />
                <XAxis dataKey="date" tickFormatter={v => formatPeriodLabel(v, condPeriod)} {...CHART.axis} />
                <YAxis {...CHART.axis} />
                <Tooltip
                  {...CHART.tooltip}
                  formatter={(v, name) => {
                    const p = players.find(p => p.id === name)
                    return [`${Number(v).toLocaleString()} ${activeCondMetric.unit}`, p?.name ?? name]
                  }}
                  labelFormatter={l => formatPeriodLabel(l, condPeriod)}
                />
                {players.map(p => (
                  <Line key={p.id} type="monotone" dataKey={p.id}
                    stroke={POSITION_COLORS[p.position] + '80'}
                    strokeWidth={1} dot={false}
                    activeDot={{ r: 3, fill: POSITION_COLORS[p.position], strokeWidth: 0 }}
                    connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  /* ════════════════════
     GPS RENDER
  ════════════════════ */
  return (
    <div className="space-y-4">

      {/* ── View tab: セッション | 比較マトリクス ── */}
      <div className="flex items-center gap-0" style={{ border: '1px solid #3a3a3a', borderRadius: 4, overflow: 'hidden', display: 'inline-flex' }}>
        {([
          { key: 'session' as const, label: 'セッション' },
          { key: 'matrix'  as const, label: '比較マトリクス' },
        ]).map(v => (
          <button key={v.key} onClick={() => setCompView(v.key)}
            className="px-4 py-1.5 text-xs font-bold transition-all"
            style={compView === v.key
              ? { backgroundColor: '#2563eb', color: '#fff' }
              : { backgroundColor: '#1a1a1a', color: '#aaa' }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ════════ SESSION VIEW ════════ */}
      {compView === 'session' && (
        <>
          {/* Session info (left) + Session selector (right) — side by side */}
          <div className="grid gap-3" style={{ gridTemplateColumns: '200px 1fr' }}>

            {/* Session info */}
            <div className="bg-white border border-slate-200 overflow-hidden flex flex-col" style={{ borderRadius: 0 }}>
              <div className="px-3 py-2" style={{ backgroundColor: '#1a1a1a' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>セッション情報</p>
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                <div>
                  <p className="text-[10px] text-slate-400">日時</p>
                  <p className="text-xs font-bold text-slate-800">{sessionInfoDate || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">種別</p>
                  {sessionIsMatch
                    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5" style={{ color: '#fff', background: '#2563eb', borderRadius: 2 }}>⚽ 試合</span>
                    : <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5" style={{ color: '#fff', background: '#1a1a1a', borderRadius: 2 }}>🏃 練習</span>
                  }
                </div>
                {sessionIsMatch && sessionOpponent && (
                  <>
                    <div>
                      <p className="text-[10px] text-slate-400">対戦相手</p>
                      <p className="text-xs font-bold text-slate-800">
                        {sessionVenue === 'H' ? '🏠' : '✈️'} {sessionOpponent}
                        <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5"
                          style={sessionVenue === 'H' ? { color: '#fff', background: '#1e6fad', borderRadius: 2 } : { color: '#fff', background: '#5b21b6', borderRadius: 2 }}>
                          {sessionVenue === 'H' ? 'HOME' : 'AWAY'}
                        </span>
                      </p>
                    </div>
                    {sessionScore && (
                      <div>
                        <p className="text-[10px] text-slate-400">スコア</p>
                        <p className="text-xs font-bold text-slate-800">{sessionScore}</p>
                      </div>
                    )}
                  </>
                )}
                <div className="mt-auto">
                  <p className="text-[10px] text-slate-400">データ</p>
                  <p className="text-sm font-bold text-slate-800">{sessionPlayersOnDate.length}<span className="text-xs font-normal text-slate-400 ml-0.5">名</span></p>
                </div>
              </div>
            </div>

            {/* Session selector */}
            <div className="bg-white border border-slate-200 overflow-hidden flex flex-col" style={{ borderRadius: 0 }}>
              <div className="px-3 py-2" style={{ backgroundColor: '#1a1a1a' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>セッション選択</p>
              </div>
              <div className="p-3 flex flex-col flex-1">
                {/* Month tabs */}
                <div className="flex gap-1 flex-wrap mb-2">
                  {allSessionMonths.map(m => {
                    const mNum = parseInt(m.slice(5))
                    const isSel = selectedSessionMonth === m
                    return (
                      <button key={m} onClick={() => setSelectedSessionMonth(m)}
                        className="px-4 py-1.5 text-sm font-bold border transition-all"
                        style={isSel
                          ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                          : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                        {mNum}月
                      </button>
                    )
                  })}
                </div>
                {/* Day pills */}
                <div className="grid grid-cols-7 gap-1 overflow-y-auto flex-1" style={{ maxHeight: 110, scrollbarWidth: 'none' }}>
                  {monthSessionDates.map(d => {
                    const dt = new Date(d)
                    const isMatch = gpsAgg.session.some((p: any) => p.agg.find((s: any) => s.date === d && s.sessionType === 'match'))
                    const isSel = selectedSessionDate === d
                    return (
                      <button key={d} onClick={() => setSelectedSessionDate(d)}
                        className="flex items-center justify-center gap-0.5 py-0.5 text-[9px] font-medium border transition-all"
                        style={isSel
                          ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                          : isMatch
                            ? { color: '#dc2626', borderColor: '#fca5a5', background: '#fff5f5', borderRadius: 3 }
                            : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                        {isMatch && <span style={{ fontSize: 9 }}>⚽</span>}
                        {dt.getDate()}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="inline-block w-2 h-2 rounded-sm bg-white border border-slate-200" />練習
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-red-400">
                    <span style={{ fontSize: 9 }}>⚽</span>試合
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FP/GK avg cards */}
          {renderPosCards(sessionPosAvgs)}

          {/* Rankings */}
          <RankingPair
            leftTitle="総走行距離 ランキング" leftRanking={sessionDistRank} leftUnit="m"
            leftFpAvg={getGroupAvg(sessionDistRank, 'FP')} leftGkAvg={getGroupAvg(sessionDistRank, 'GK')}
            rightTitle="HSR（20km/h+）ランキング" rightRanking={sessionHsrRank} rightUnit="m"
            rightFpAvg={getGroupAvg(sessionHsrRank, 'FP')} rightGkAvg={getGroupAvg(sessionHsrRank, 'GK')}
          />

          {/* Player cards */}
          <SessionDaySummary aggPlayers={gpsAgg.session} selectedDate={selectedSessionDate} />
        </>
      )}

      {/* ════════ MATRIX VIEW ════════ */}
      {compView === 'matrix' && (
        <>
          {/* Period selector in header */}
          <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
            <div className="px-4 py-2 flex items-center gap-3" style={{ backgroundColor: '#1a1a1a' }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>比較マトリクス</span>
              <div className="flex items-center gap-1 ml-auto">
                {MATRIX_PERIODS.map(p => (
                  <button key={p.key} onClick={() => setMatrixPeriod(p.key)}
                    className="px-3 py-1 text-xs font-bold transition-all"
                    style={matrixPeriod === p.key
                      ? { color: '#fff', backgroundColor: '#2563eb', borderRadius: 2 }
                      : { color: '#999', backgroundColor: 'transparent', borderRadius: 2 }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Metric selector: GPS metrics + Zone distance buttons */}
          <div className="bg-white border border-slate-200 p-3 space-y-2" style={{ borderRadius: 0 }}>
            <div className="flex flex-wrap gap-1.5">
              {GPS_METRICS.map(m => (
                <button key={m.key} onClick={() => setMatrixMetricKey(m.key)}
                  className="px-3 py-1.5 text-xs font-medium border transition-all"
                  style={matrixMetricKey === m.key
                    ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 4 }
                    : { color: '#374151', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 4 }}>
                  {m.label}
                </button>
              ))}
            </div>
            {/* Zone distance buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 self-center mr-1">ZONE別</span>
              {ZONE_COLS.map(z => (
                <button key={z.key} onClick={() => setMatrixMetricKey(z.key)}
                  className="px-2.5 py-1 text-xs font-medium border transition-all"
                  style={matrixMetricKey === z.key
                    ? { color: '#fff', background: z.color, borderColor: z.color, borderRadius: 4 }
                    : { color: z.color, borderColor: z.color + '60', background: z.color + '08', borderRadius: 4 }}>
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          {/* 表示期間 selector */}
          <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
            <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: '#1a1a1a' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>表示期間</span>
              {(selectedMatrixKeys.size > 0 || matrixMonthFilter.size > 0) && (
                <button onClick={() => { setSelectedMatrixKeys(new Set()); setMatrixMonthFilter(new Set()) }}
                  className="ml-auto text-[10px] px-2 py-0.5 font-bold"
                  style={{ color: '#60a5fa', borderRadius: 2, border: '1px solid #60a5fa33', background: 'transparent' }}>
                  全期間
                </button>
              )}
            </div>
            {matrixPeriod === 'daily' ? (
              <div className="p-2 space-y-2">
                {/* Month filter tabs for daily */}
                <div className="flex flex-wrap gap-1">
                  {allMatrixMonths.map(m => {
                    const mNum = parseInt(m.slice(5))
                    const sel = matrixMonthFilter.has(m)
                    return (
                      <button key={m}
                        onClick={() => setMatrixMonthFilter(prev => { const n = new Set(prev); sel ? n.delete(m) : n.add(m); return n })}
                        className="px-3 py-1 text-xs font-bold border transition-all"
                        style={sel
                          ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                          : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                        {mNum}月
                      </button>
                    )
                  })}
                </div>
                {/* Day pills for visible dates */}
                <div className="flex flex-wrap gap-1">
                  {(matrixMonthFilter.size > 0
                    ? allMatrixKeys.filter(k => matrixMonthFilter.has(k.slice(0, 7)))
                    : allMatrixKeys
                  ).map(k => {
                    const sel = selectedMatrixKeys.has(k)
                    const [, mo, dy] = k.split('-')
                    return (
                      <button key={k}
                        onClick={() => setSelectedMatrixKeys(prev => { const n = new Set(prev); sel ? n.delete(k) : n.add(k); return n })}
                        className="px-2 py-0.5 text-[10px] font-medium border transition-all"
                        style={sel
                          ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                          : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                        {parseInt(mo)}/{parseInt(dy)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="p-2 flex flex-wrap gap-1">
                {allMatrixKeys.map(k => {
                  const sel = selectedMatrixKeys.has(k)
                  return (
                    <button key={k}
                      onClick={() => setSelectedMatrixKeys(prev => { const n = new Set(prev); sel ? n.delete(k) : n.add(k); return n })}
                      className="px-2.5 py-1 text-[10px] font-bold border transition-all"
                      style={sel
                        ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                        : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                      {formatMatrixKey(k)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Time-series matrix table: player rows × date columns */}
          <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
            <div className="px-4 py-2 flex items-center gap-3" style={{ backgroundColor: '#1a1a1a' }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>
                {matrixMetric.label}（{matrixMetric.unit}）　推移比較
              </span>
              <span className="text-[10px]" style={{ color: '#888' }}>ポジション平均以上を強調</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse" style={{ tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2a2a2a' }}>
                    <th className="text-left py-2 px-3 font-bold sticky left-0 z-10"
                      style={{ color: '#ccc', backgroundColor: '#2a2a2a', fontSize: 11, minWidth: 130, whiteSpace: 'nowrap' }}>選手</th>
                    <th className="text-center py-2 px-2 font-bold"
                      style={{ color: '#ccc', fontSize: 11, width: 48, whiteSpace: 'nowrap' }}>POS</th>
                    {filteredMatrixKeys.map(k => (
                      <th key={k} className="text-right py-2 px-2 font-bold"
                        style={{ color: '#ccc', fontSize: 10, whiteSpace: 'nowrap', minWidth: 52 }}>
                        {formatMatrixKey(k)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* GK group header */}
                  <tr>
                    <td colSpan={2 + filteredMatrixKeys.length} className="py-1 px-3 text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: '#f59e0b15', color: '#f59e0b' }}>GK</td>
                  </tr>
                  {matrixPlayerRows.filter(p => POS_GROUPS.GK.includes(p.position)).map(pl => {
                    const aggP = gpsAgg[matrixPeriod].find((a: any) => a.id === pl.id)
                    return (
                      <tr key={pl.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-1.5 px-3 sticky left-0 bg-white z-10" style={{ whiteSpace: 'nowrap' }}>
                          <div className="flex items-center gap-1.5">
                            <img src={pl.photo} alt={pl.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            <span className="font-medium text-slate-800">{pl.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-1.5 px-2" style={{ whiteSpace: 'nowrap' }}>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">{pl.position}</span>
                        </td>
                        {filteredMatrixKeys.map(k => {
                          const d = aggP?.agg.find((a: any) => a.date === k) as any
                          const val = d ? getVal(d, matrixMetricKey) : null
                          const colAvg = matrixColGroupAvgs[k]?.GK ?? 0
                          const above = val !== null && colAvg > 0 && val > colAvg
                          return (
                            <td key={k} className="text-right py-1.5 px-2 tabular-nums font-semibold"
                              style={val === null ? { color: '#cbd5e1' } : above
                                ? { color: matrixMetric.accent, background: matrixMetric.accent + '12' }
                                : { color: '#1e293b' }}>
                              {val !== null ? val.toLocaleString() : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {/* FP group header */}
                  <tr>
                    <td colSpan={2 + filteredMatrixKeys.length} className="py-1 px-3 text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: '#6366f115', color: '#6366f1' }}>FP（DF / MF / FW）</td>
                  </tr>
                  {matrixPlayerRows.filter(p => POS_GROUPS.FP.includes(p.position)).map(pl => {
                    const aggP = gpsAgg[matrixPeriod].find((a: any) => a.id === pl.id)
                    return (
                      <tr key={pl.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-1.5 px-3 sticky left-0 bg-white z-10" style={{ whiteSpace: 'nowrap' }}>
                          <div className="flex items-center gap-1.5">
                            <img src={pl.photo} alt={pl.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            <span className="font-medium text-slate-800">{pl.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-1.5 px-2" style={{ whiteSpace: 'nowrap' }}>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">{pl.position}</span>
                        </td>
                        {filteredMatrixKeys.map(k => {
                          const d = aggP?.agg.find((a: any) => a.date === k) as any
                          const val = d ? getVal(d, matrixMetricKey) : null
                          const colAvg = matrixColGroupAvgs[k]?.FP ?? 0
                          const above = val !== null && colAvg > 0 && val > colAvg
                          return (
                            <td key={k} className="text-right py-1.5 px-2 tabular-nums font-semibold"
                              style={val === null ? { color: '#cbd5e1' } : above
                                ? { color: matrixMetric.accent, background: matrixMetric.accent + '12' }
                                : { color: '#1e293b' }}>
                              {val !== null ? val.toLocaleString() : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {/* Column averages footer */}
                  {(['GK', 'FP'] as DisplayPos[]).map(pos => (
                    <tr key={`avg-${pos}`} style={{ backgroundColor: pos === 'GK' ? '#f59e0b08' : '#6366f108' }}>
                      <td className="py-1 px-3 sticky left-0 z-10 text-[10px] font-bold"
                        style={{ backgroundColor: pos === 'GK' ? '#f59e0b08' : '#6366f108', color: pos === 'GK' ? '#f59e0b' : '#6366f1', whiteSpace: 'nowrap' }}>
                        {pos} 平均
                      </td>
                      <td />
                      {filteredMatrixKeys.map(k => {
                        const avg = matrixColGroupAvgs[k]?.[pos] ?? 0
                        return (
                          <td key={k} className="text-right py-1 px-2 tabular-nums text-[10px] font-bold"
                            style={{ color: pos === 'GK' ? '#f59e0b' : '#6366f1' }}>
                            {avg > 0 ? Math.round(avg).toLocaleString() : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
