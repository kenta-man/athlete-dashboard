import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { type Player } from '../data/sampleData'
import { aggregateGpsData, aggregateCondData, type Period } from '../utils/aggregation'

interface Props { players: Player[]; dataTab: 'gps' | 'conditioning'; compView?: 'session' | 'matrix' }

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

// All conditioning metrics for matrix (same groups as ConditioningView)
type CondMetricDef = { key: string; label: string; unit: string; color: string; decimals: number }
const COND_ALL_GROUPS: { title: string; color: string; metrics: CondMetricDef[] }[] = [
  { title: '体組成指標', color: '#3b82f6', metrics: [
    { key: 'weight',             label: '体重',     unit: 'kg', color: '#3b82f6', decimals: 1 },
    { key: 'bmi',                label: 'BMI',      unit: '',   color: '#93c5fd', decimals: 1 },
    { key: 'bodyFatPct',         label: '体脂肪率', unit: '%',  color: '#ef4444', decimals: 1 },
    { key: 'bodyFatMass',        label: '体脂肪量', unit: 'kg', color: '#fca5a5', decimals: 1 },
    { key: 'muscleMass',         label: '筋肉量',   unit: 'kg', color: '#10b981', decimals: 1 },
    { key: 'skeletalMuscleMass', label: '骨格筋量', unit: 'kg', color: '#059669', decimals: 1 },
    { key: 'leanBodyMass',       label: '除脂肪量', unit: 'kg', color: '#0ea5e9', decimals: 1 },
  ]},
  { title: '体成分・細胞健康', color: '#0ea5e9', metrics: [
    { key: 'bodyWater',          label: '体水分量',     unit: 'L',  color: '#0ea5e9', decimals: 1 },
    { key: 'intracellularWater', label: '細胞内水分量', unit: 'L',  color: '#38bdf8', decimals: 1 },
    { key: 'extracellularWater', label: '細胞外水分量', unit: 'L',  color: '#7dd3fc', decimals: 1 },
    { key: 'protein',            label: 'タンパク質量', unit: 'kg', color: '#a78bfa', decimals: 1 },
    { key: 'mineral',            label: 'ミネラル量',   unit: 'kg', color: '#f59e0b', decimals: 2 },
    { key: 'bodyCellMass',       label: '体細胞量',     unit: 'kg', color: '#34d399', decimals: 1 },
    { key: 'boneMineralMass',    label: '骨ミネラル量', unit: 'kg', color: '#fbbf24', decimals: 2 },
  ]},
  { title: '代謝・水分バランス', color: '#8b5cf6', metrics: [
    { key: 'bmr',          label: '基礎代謝量',       unit: 'kcal', color: '#8b5cf6', decimals: 0 },
    { key: 'hydrationRate', label: '水和率',          unit: '%',    color: '#0284c7', decimals: 1 },
    { key: 'ecwRatio',     label: '細胞外水分比',     unit: '',     color: '#818cf8', decimals: 3 },
    { key: 'ffmi',         label: '除脂肪指数',       unit: '',     color: '#6366f1', decimals: 1 },
    { key: 'fmi',          label: '体脂肪指数',       unit: '',     color: '#f87171', decimals: 1 },
    { key: 'whr',          label: 'ウエストヒップ比', unit: '',     color: '#fb923c', decimals: 2 },
  ]},
  { title: '部位別筋肉量', color: '#10b981', metrics: [
    { key: 'muscleRightArm', label: '右腕', unit: 'kg', color: '#10b981', decimals: 2 },
    { key: 'muscleLeftArm',  label: '左腕', unit: 'kg', color: '#34d399', decimals: 2 },
    { key: 'muscleTrunk',    label: '体幹', unit: 'kg', color: '#059669', decimals: 1 },
    { key: 'muscleRightLeg', label: '右脚', unit: 'kg', color: '#6ee7b7', decimals: 2 },
    { key: 'muscleLeftLeg',  label: '左脚', unit: 'kg', color: '#a7f3d0', decimals: 2 },
  ]},
  { title: '部位別発達率', color: '#059669', metrics: [
    { key: 'devRightArm', label: '右腕', unit: '%', color: '#059669', decimals: 0 },
    { key: 'devLeftArm',  label: '左腕', unit: '%', color: '#10b981', decimals: 0 },
    { key: 'devTrunk',    label: '体幹', unit: '%', color: '#047857', decimals: 0 },
    { key: 'devRightLeg', label: '右脚', unit: '%', color: '#34d399', decimals: 0 },
    { key: 'devLeftLeg',  label: '左脚', unit: '%', color: '#6ee7b7', decimals: 0 },
  ]},
  { title: '位相角（50kHz）', color: '#7c3aed', metrics: [
    { key: 'phaseAngleRightArm', label: '右腕', unit: '°', color: '#7c3aed', decimals: 1 },
    { key: 'phaseAngleLeftArm',  label: '左腕', unit: '°', color: '#8b5cf6', decimals: 1 },
    { key: 'phaseAngleTrunk',    label: '体幹', unit: '°', color: '#6d28d9', decimals: 1 },
    { key: 'phaseAngleRightLeg', label: '右脚', unit: '°', color: '#a78bfa', decimals: 1 },
    { key: 'phaseAngleLeftLeg',  label: '左脚', unit: '°', color: '#c4b5fd', decimals: 1 },
    { key: 'phaseAngleWhole',    label: '全身', unit: '°', color: '#5b21b6', decimals: 1 },
  ]},
  { title: '身体周囲径', color: '#f59e0b', metrics: [
    { key: 'circumNeck',       label: '首',       unit: 'cm', color: '#f59e0b', decimals: 1 },
    { key: 'circumChest',      label: '胸部',     unit: 'cm', color: '#fbbf24', decimals: 1 },
    { key: 'circumAbdomen',    label: '腹部',     unit: 'cm', color: '#d97706', decimals: 1 },
    { key: 'circumHip',        label: '臀部',     unit: 'cm', color: '#f97316', decimals: 1 },
    { key: 'circumRightArm',   label: '右腕',     unit: 'cm', color: '#fb923c', decimals: 1 },
    { key: 'circumLeftArm',    label: '左腕',     unit: 'cm', color: '#fdba74', decimals: 1 },
    { key: 'circumRightThigh', label: '右太もも', unit: 'cm', color: '#c2410c', decimals: 1 },
    { key: 'circumLeftThigh',  label: '左太もも', unit: 'cm', color: '#ea580c', decimals: 1 },
  ]},
  { title: 'バイオメトリクス', color: '#ef4444', metrics: [
    { key: 'hrResting',   label: '安静時心拍数', unit: 'bpm',  color: '#ef4444', decimals: 0 },
    { key: 'hrv',         label: 'HRV',          unit: 'ms',   color: '#6366f1', decimals: 0 },
    { key: 'systolicBP',  label: '収縮期血圧',   unit: 'mmHg', color: '#fb7185', decimals: 0 },
    { key: 'diastolicBP', label: '拡張期血圧',   unit: 'mmHg', color: '#fda4af', decimals: 0 },
  ]},
  { title: '栄養摂取', color: '#f97316', metrics: [
    { key: 'calorieIntake', label: 'カロリー',   unit: 'kcal', color: '#f97316', decimals: 0 },
    { key: 'proteinIntake', label: 'タンパク質', unit: 'g',    color: '#3b82f6', decimals: 0 },
    { key: 'carbIntake',    label: '炭水化物',   unit: 'g',    color: '#f59e0b', decimals: 0 },
    { key: 'fatIntakeG',    label: '脂質',       unit: 'g',    color: '#f87171', decimals: 0 },
    { key: 'waterIntake',   label: '水分摂取',   unit: 'L',    color: '#0ea5e9', decimals: 1 },
  ]},
]
const COND_FLAT_METRICS = COND_ALL_GROUPS.flatMap(g => g.metrics)
const COND_KPI_METRICS: CondMetricDef[] = [
  { key: 'weight',             label: '体重',       unit: 'kg',   color: '#3b82f6', decimals: 1 },
  { key: 'bodyFatPct',         label: '体脂肪率',   unit: '%',    color: '#ef4444', decimals: 1 },
  { key: 'skeletalMuscleMass', label: '骨格筋量',   unit: 'kg',   color: '#059669', decimals: 1 },
  { key: 'muscleMass',         label: '筋肉量',     unit: 'kg',   color: '#10b981', decimals: 1 },
  { key: 'leanBodyMass',       label: '除脂肪量',   unit: 'kg',   color: '#0ea5e9', decimals: 1 },
  { key: 'bodyWater',          label: '体水分量',   unit: 'L',    color: '#06b6d4', decimals: 1 },
  { key: 'bmr',                label: '基礎代謝',   unit: 'kcal', color: '#8b5cf6', decimals: 0 },
  { key: 'hydrationRate',      label: '水和率',     unit: '%',    color: '#0284c7', decimals: 1 },
  { key: 'phaseAngleWhole',    label: '全身位相角', unit: '°',    color: '#5b21b6', decimals: 1 },
  { key: 'hrResting',          label: '安静時心拍', unit: 'bpm',  color: '#ef4444', decimals: 0 },
  { key: 'hrv',                label: 'HRV',        unit: 'ms',   color: '#6366f1', decimals: 0 },
]

// Distinct palette for multi-player charts (12 colors, assigned by selection order)
const PLAYER_PALETTE = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
  '#14b8a6', '#e11d48',
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

const TABLE_HEADER: Record<string, [string, string]> = {
  totalDistance:    ['総走行', '距離'],
  hsr:              ['HSR', '20km/h+'],
  intensity:        ['1分/走行', '距離'],
  maxSpeed:         ['最高', '速度'],
  explosiveEfforts: ['Explosive', 'Effort'],
  accel_3ms2:       ['加速', ''],
  decel_3ms2:       ['減速', ''],
  dist_0_7:         ['0–7', 'km/h'],
  dist_7_15:        ['7–15', 'km/h'],
  dist_15_20:       ['15–20', 'km/h'],
  dist_20_25:       ['20–25', 'km/h'],
  dist_25plus:      ['25+', 'km/h'],
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
                  <p className="text-xs font-bold truncate text-slate-800">{p.name}</p>
                  <span className="text-[8px] font-bold px-1 py-0.5" style={{ background: '#1a1a1a', color: '#fff', borderRadius: 2 }}>{p.position}</span>
                </div>
              </div>
              <div className="space-y-0.5">
                {GPS_METRICS.map((m: any) => (
                  <div key={m.key} className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-700 truncate pr-1">{m.label}</span>
                    <span className="text-xs font-bold text-slate-800 flex-shrink-0 tabular-nums">
                      {(getVal(s, m.key) || 0).toLocaleString()}
                      <span className="text-[9px] font-normal text-slate-500 ml-0.5">{m.unit}</span>
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
export default function ComparisonView({ players, dataTab, compView = 'matrix' }: Props) {
  const isGps = dataTab === 'gps'

  /* ── GPS session state ── */
  const [selectedSessionDate, setSelectedSessionDate] = useState('')
  const [selectedSessionMonth, setSelectedSessionMonth] = useState('')
  const [sessionTableSort, setSessionTableSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'totalDistance', dir: 'desc' })

  /* ── GPS matrix state ── */
  const [matrixMetricKey, setMatrixMetricKey] = useState('totalDistance')
  const [matrixPeriod, setMatrixPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [selectedMatrixKeys, setSelectedMatrixKeys] = useState<Set<string>>(new Set())
  const [matrixMonthFilter, setMatrixMonthFilter] = useState<Set<string>>(new Set())
  const [selectedMatrixPlayers, setSelectedMatrixPlayers] = useState<Set<string>>(new Set())
  // Reset key selection when period changes
  useEffect(() => {
    setSelectedMatrixKeys(new Set())
    setMatrixMonthFilter(new Set())
  }, [matrixPeriod])

  /* ── Conditioning internal state ── */
  const [condPeriod, setCondPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  /* ── Conditioning matrix state ── */
  const [condMatrixMetricKey, setCondMatrixMetricKey] = useState('weight')
  const [condSelectedMatrixKeys, setCondSelectedMatrixKeys] = useState<Set<string>>(new Set())
  const [condMatrixMonthFilter, setCondMatrixMonthFilter] = useState<Set<string>>(new Set())
  const [condSelectedCondPlayers, setCondSelectedCondPlayers] = useState<Set<string>>(new Set())
  useEffect(() => {
    setCondSelectedMatrixKeys(new Set())
    setCondMatrixMonthFilter(new Set())
  }, [condPeriod])
  const [gpsMetricSelectorOpen, setGpsMetricSelectorOpen] = useState(true)
  const [gpsPeriodOpen, setGpsPeriodOpen] = useState(true)
  const [condMetricSelectorOpen, setCondMetricSelectorOpen] = useState(true)
  const [condPeriodOpen, setCondPeriodOpen] = useState(true)
  /* ── GPS matrix range state ── */
  const [matrixRangeStart, setMatrixRangeStart] = useState<string>('')
  const [matrixRangeEnd, setMatrixRangeEnd] = useState<string>('')
  /* ── Conditioning matrix range state ── */
  const [condMatrixRangeStart, setCondMatrixRangeStart] = useState<string>('')
  const [condMatrixRangeEnd, setCondMatrixRangeEnd] = useState<string>('')

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

  // Chart data for selected players in matrix
  const matrixChartData = useMemo(() =>
    filteredMatrixKeys.map(k => {
      const row: Record<string, any> = { date: k, label: formatMatrixKey(k) }
      selectedMatrixPlayers.forEach(id => {
        const aggP = gpsAgg[matrixPeriod].find((a: any) => a.id === id)
        const d = aggP?.agg.find((a: any) => a.date === k) as any
        row[id] = d ? getVal(d, matrixMetricKey) : null
      })
      return row
    }),
    [filteredMatrixKeys, selectedMatrixPlayers, gpsAgg, matrixPeriod, matrixMetricKey]
  )

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

  const sessionTablePlayers = useMemo(() =>
    [...sessionPlayersOnDate].sort((a: any, b: any) => {
      const av = getVal(a.session ?? {}, sessionTableSort.key)
      const bv = getVal(b.session ?? {}, sessionTableSort.key)
      return sessionTableSort.dir === 'desc' ? bv - av : av - bv
    }),
    [sessionPlayersOnDate, sessionTableSort]
  )
  const handleSessionTableSort = (key: string) =>
    setSessionTableSort(prev => prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })

  const sessionTableColAvgs = useMemo(() => {
    const allCols = [...GPS_METRICS.map(m => m.key), ...ZONE_COLS.map(z => z.key)]
    const result: Record<DisplayPos, Record<string, number>> = { GK: {}, FP: {} }
    DISPLAY_POSITIONS.forEach(pos => {
      const posPlayers = sessionPlayersOnDate.filter((p: any) => POS_GROUPS[pos].includes(p.position))
      allCols.forEach(key => {
        const vals = posPlayers.map((p: any) => getVal(p.session ?? {}, key)).filter((v: number) => v > 0)
        result[pos][key] = vals.length ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : 0
      })
    })
    return result
  }, [sessionPlayersOnDate])

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

  /* ── Conditioning matrix computed ── */
  const condAllMatrixKeys = useMemo(() => {
    const s = new Set<string>()
    condAggPlayers.forEach(p => p.agg.forEach(d => s.add(d.date)))
    return [...s].sort()
  }, [condAggPlayers])
  const condAllMatrixMonths = useMemo(() =>
    [...new Set(condAllMatrixKeys.map(k => k.slice(0, 7)))].sort(),
    [condAllMatrixKeys]
  )
  const condFilteredMatrixKeys = useMemo(() => {
    if (condPeriod === 'daily' && condMatrixMonthFilter.size > 0) {
      const base = condAllMatrixKeys.filter(k => condMatrixMonthFilter.has(k.slice(0, 7)))
      return condSelectedMatrixKeys.size > 0 ? base.filter(k => condSelectedMatrixKeys.has(k)) : base
    }
    return condSelectedMatrixKeys.size > 0
      ? condAllMatrixKeys.filter(k => condSelectedMatrixKeys.has(k))
      : condAllMatrixKeys
  }, [condAllMatrixKeys, condPeriod, condMatrixMonthFilter, condSelectedMatrixKeys])
  const formatCondKey = (k: string) => {
    if (condPeriod === 'daily') { const [, m, d] = k.split('-'); return `${parseInt(m)}/${parseInt(d)}` }
    if (condPeriod === 'weekly') return k.replace(/^\d{4}-/, '')
    return `${parseInt(k.slice(5))}月`
  }
  const condMatrixColGroupAvgs = useMemo(() => {
    const result: Record<string, Record<DisplayPos, number>> = {}
    condFilteredMatrixKeys.forEach(k => {
      result[k] = {} as Record<DisplayPos, number>
      DISPLAY_POSITIONS.forEach(pos => {
        const group = condAggPlayers.filter(p => POS_GROUPS[pos].includes(p.position))
        const vals = group.map(p => {
          const d = p.agg.find(a => a.date === k) as unknown as Record<string, number> | undefined
          return d != null ? (d[condMatrixMetricKey] ?? null) : null
        }).filter((v): v is number => v !== null)
        result[k][pos] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
      })
    })
    return result
  }, [condFilteredMatrixKeys, condAggPlayers, condMatrixMetricKey])
  const condActiveMetricDef = COND_FLAT_METRICS.find(m => m.key === condMatrixMetricKey) ?? COND_FLAT_METRICS[0]
  const fmtCondVal = (v: number | null, decimals: number) => {
    if (v === null) return '—'
    return decimals === 0 ? Math.round(v).toLocaleString() : v.toFixed(decimals)
  }
  // Initialize GPS matrix range when keys change
  useEffect(() => {
    if (allMatrixKeys.length > 0) {
      setMatrixRangeStart(prev => prev || allMatrixKeys[0])
      setMatrixRangeEnd(prev => prev || allMatrixKeys[allMatrixKeys.length - 1])
    }
  }, [allMatrixKeys])
  useEffect(() => {
    if (condAllMatrixKeys.length > 0) {
      setCondMatrixRangeStart(prev => prev || condAllMatrixKeys[0])
      setCondMatrixRangeEnd(prev => prev || condAllMatrixKeys[condAllMatrixKeys.length - 1])
    }
  }, [condAllMatrixKeys])
  const applyGpsRange = (start: string, end: string) => {
    const keys = allMatrixKeys.filter(k => k >= start && k <= end)
    const isAll = keys.length === allMatrixKeys.length
    setSelectedMatrixKeys(isAll ? new Set() : new Set(keys))
    setMatrixMonthFilter(new Set())
  }
  const applyCondRange = (start: string, end: string) => {
    const keys = condAllMatrixKeys.filter(k => k >= start && k <= end)
    const isAll = keys.length === condAllMatrixKeys.length
    setCondSelectedMatrixKeys(isAll ? new Set() : new Set(keys))
    setCondMatrixMonthFilter(new Set())
  }

  /* ════════════════════
     CONDITIONING RENDER
  ════════════════════ */
  if (!isGps) {
    return (
      <div className="space-y-4">
        {/* Period selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded gap-0.5 p-0.5" style={{ backgroundColor: '#1a1a1a' }}>
            {MATRIX_PERIODS.map(p => (
              <button key={p.key} onClick={() => setCondPeriod(p.key)}
                className="px-4 py-1.5 rounded text-xs font-bold transition-all"
                style={condPeriod === p.key
                  ? { backgroundColor: '#2563eb', color: '#fff' }
                  : { color: '#888', background: 'transparent' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 表示期間 selector */}
        <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
          <button className="w-full px-3 py-2 flex items-center gap-2 text-left"
            style={{ backgroundColor: '#1a1a1a' }}
            onClick={() => setCondPeriodOpen(o => !o)}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>表示期間</span>
            {(condSelectedMatrixKeys.size > 0 || condMatrixMonthFilter.size > 0) && (
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5"
                style={{ color: '#60a5fa', borderRadius: 2, border: '1px solid #60a5fa33', background: 'transparent' }}>
                {condFilteredMatrixKeys.length}件選択中
              </span>
            )}
            <span className="ml-auto text-[10px]" style={{ color: '#666' }}>{condPeriodOpen ? '▲' : '▼'}</span>
          </button>
          {condPeriodOpen && <div className="px-3 pt-2 pb-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <button
                onClick={() => {
                  setCondSelectedMatrixKeys(new Set()); setCondMatrixMonthFilter(new Set())
                  setCondMatrixRangeStart(condAllMatrixKeys[0] ?? '')
                  setCondMatrixRangeEnd(condAllMatrixKeys[condAllMatrixKeys.length - 1] ?? '')
                }}
                className="px-3 py-1 text-xs font-bold border transition-all"
                style={condSelectedMatrixKeys.size === 0 && condMatrixMonthFilter.size === 0
                  ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                  : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                全期間
              </button>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="font-medium">範囲</span>
                <select value={condMatrixRangeStart}
                  onChange={e => { setCondMatrixRangeStart(e.target.value); applyCondRange(e.target.value, condMatrixRangeEnd) }}
                  className="border border-slate-200 text-[10px] font-bold px-1 py-0.5 text-slate-700"
                  style={{ borderRadius: 3, outline: 'none', cursor: 'pointer' }}>
                  {condAllMatrixKeys.map(k => <option key={k} value={k}>{formatCondKey(k)}</option>)}
                </select>
                <span>〜</span>
                <select value={condMatrixRangeEnd}
                  onChange={e => { setCondMatrixRangeEnd(e.target.value); applyCondRange(condMatrixRangeStart, e.target.value) }}
                  className="border border-slate-200 text-[10px] font-bold px-1 py-0.5 text-slate-700"
                  style={{ borderRadius: 3, outline: 'none', cursor: 'pointer' }}>
                  {condAllMatrixKeys.map(k => <option key={k} value={k}>{formatCondKey(k)}</option>)}
                </select>
              </div>
              <span className="text-[10px] text-slate-400 ml-auto">{condFilteredMatrixKeys.length}件</span>
            </div>
            {condPeriod === 'daily' ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {condAllMatrixMonths.map(m => {
                    const mNum = parseInt(m.slice(5))
                    const sel = condMatrixMonthFilter.has(m)
                    return (
                      <button key={m}
                        onClick={() => setCondMatrixMonthFilter(prev => { const n = new Set(prev); sel ? n.delete(m) : n.add(m); return n })}
                        className="px-3 py-1 text-xs font-bold border transition-all"
                        style={sel
                          ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                          : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                        {mNum}月
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-1 pb-1">
                  {(condMatrixMonthFilter.size > 0
                    ? condAllMatrixKeys.filter(k => condMatrixMonthFilter.has(k.slice(0, 7)))
                    : condAllMatrixKeys
                  ).map(k => {
                    const sel = condSelectedMatrixKeys.has(k)
                    const [, mo, dy] = k.split('-')
                    return (
                      <button key={k}
                        onClick={() => setCondSelectedMatrixKeys(prev => { const n = new Set(prev); sel ? n.delete(k) : n.add(k); return n })}
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
              <div className="flex flex-wrap gap-1 pb-1">
                {condAllMatrixKeys.map(k => {
                  const sel = condSelectedMatrixKeys.has(k)
                  return (
                    <button key={k}
                      onClick={() => setCondSelectedMatrixKeys(prev => { const n = new Set(prev); sel ? n.delete(k) : n.add(k); return n })}
                      className="px-2.5 py-1 text-[10px] font-bold border transition-all"
                      style={sel
                        ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                        : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                      {formatCondKey(k)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>}
        </div>

        {/* Metric selector — 11 KPI metrics, collapsible */}
        <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
          <button className="w-full px-4 py-2 flex items-center gap-2 text-left"
            style={{ backgroundColor: '#1a1a1a' }}
            onClick={() => setCondMetricSelectorOpen(o => !o)}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>項目選択</span>
            <span className="text-xs font-bold ml-2" style={{ color: '#60a5fa' }}>
              {COND_KPI_METRICS.find(m => m.key === condMatrixMetricKey)?.label ?? ''}
            </span>
            <span className="ml-auto text-[10px]" style={{ color: '#666' }}>{condMetricSelectorOpen ? '▲' : '▼'}</span>
          </button>
          {condMetricSelectorOpen && (
            <div className="p-3 flex flex-wrap gap-2">
              {COND_KPI_METRICS.map(m => (
                <button key={m.key}
                  onClick={() => setCondMatrixMetricKey(m.key)}
                  className="px-3 py-1.5 text-xs font-medium border transition-all"
                  style={condMatrixMetricKey === m.key
                    ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 4 }
                    : { color: '#374151', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 4 }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chart for selected players — ABOVE the table */}
        {condSelectedCondPlayers.size > 0 && (() => {
          const metDef = condActiveMetricDef
          const chartData = condFilteredMatrixKeys.map(k => {
            const row: Record<string, any> = { date: k, label: formatCondKey(k) }
            condSelectedCondPlayers.forEach(id => {
              const p = condAggPlayers.find(a => a.id === id)
              const d = p?.agg.find(a => a.date === k) as unknown as Record<string, number> | undefined
              row[id] = d != null ? (d[condMatrixMetricKey] ?? null) : null
            })
            return row
          })
          return (
            <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
              <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: metDef.color }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>
                  {metDef.label}{metDef.unit ? ` (${metDef.unit})` : ''} 推移グラフ
                </span>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  {[...condSelectedCondPlayers].map((id, idx) => {
                    const pl = players.find(p => p.id === id)
                    const color = PLAYER_PALETTE[idx % PLAYER_PALETTE.length]
                    return pl ? (
                      <span key={id} className="flex items-center gap-1 text-[10px] font-medium"
                        style={{ color }}>
                        <span className="inline-block w-3 h-0.5" style={{ backgroundColor: color }} />
                        {pl.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']}
                      tickFormatter={(v: number) => fmtCondVal(v, metDef.decimals)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                      formatter={(v, name) => {
                        const pl = players.find(p => p.id === name)
                        return [fmtCondVal(Number(v), metDef.decimals) + (metDef.unit ? ` ${metDef.unit}` : ''), pl?.name ?? name]
                      }}
                    />
                    {[...condSelectedCondPlayers].map((id, idx) => {
                      const color = PLAYER_PALETTE[idx % PLAYER_PALETTE.length]
                      return (
                        <Line key={id} type="monotone" dataKey={id}
                          stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                          connectNulls />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        })()}

        {/* Matrix table (shows primary metric) */}
        <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
          <div className="px-4 py-2 flex items-center gap-3" style={{ backgroundColor: '#1a1a1a' }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>
              {condActiveMetricDef.label}{condActiveMetricDef.unit ? `（${condActiveMetricDef.unit}）` : ''}　推移比較
            </span>
            <span className="text-[10px]" style={{ color: '#888' }}>ポジション平均以上を強調　／　選手名クリックでグラフ追加</span>
            {condSelectedCondPlayers.size > 0 && (
              <button onClick={() => setCondSelectedCondPlayers(new Set())}
                className="ml-auto text-[10px] px-2 py-0.5 font-bold"
                style={{ color: '#60a5fa', borderRadius: 2, border: '1px solid #60a5fa33', background: 'transparent' }}>
                選択解除
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr style={{ backgroundColor: '#2a2a2a' }}>
                  <th className="text-left py-2 px-3 font-bold sticky left-0 z-10"
                    style={{ color: '#ccc', backgroundColor: '#2a2a2a', fontSize: 11, minWidth: 130, whiteSpace: 'nowrap' }}>選手</th>
                  <th className="text-center py-2 px-2 font-bold"
                    style={{ color: '#ccc', fontSize: 11, width: 48, whiteSpace: 'nowrap' }}>POS</th>
                  {condFilteredMatrixKeys.map(k => (
                    <th key={k} className="text-right py-2 px-2 font-bold"
                      style={{ color: '#ccc', fontSize: 10, whiteSpace: 'nowrap', minWidth: 56 }}>
                      {formatCondKey(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['GK', 'FP'] as DisplayPos[]).map(pos => {
                  const groupColor = pos === 'GK' ? '#f59e0b' : '#6366f1'
                  const groupLabel = pos === 'GK' ? 'GK' : 'FP（DF / MF / FW）'
                  const groupBg    = pos === 'GK' ? '#f59e0b15' : '#6366f115'
                  const posPlayers = matrixPlayerRows.filter(p => POS_GROUPS[pos].includes(p.position))
                  return (
                    <>
                      <tr key={`ch-${pos}`}>
                        <td colSpan={2 + condFilteredMatrixKeys.length} className="py-1 px-3 text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: groupBg, color: groupColor }}>{groupLabel}</td>
                      </tr>
                      <tr key={`ca-${pos}`} style={{ backgroundColor: groupBg }}>
                        <td className="py-1 px-3 sticky left-0 z-10 text-[10px] font-bold"
                          style={{ backgroundColor: groupBg, color: groupColor, whiteSpace: 'nowrap' }}>
                          {pos} 平均
                        </td>
                        <td />
                        {condFilteredMatrixKeys.map(k => {
                          const avg = condMatrixColGroupAvgs[k]?.[pos] ?? 0
                          return (
                            <td key={k} className="text-right py-1 px-2 tabular-nums text-[10px] font-bold"
                              style={{ color: groupColor }}>
                              {avg > 0 ? fmtCondVal(avg, condActiveMetricDef.decimals) : '—'}
                            </td>
                          )
                        })}
                      </tr>
                      {posPlayers.map(pl => {
                        const aggP = condAggPlayers.find(a => a.id === pl.id)
                        const isSelected = condSelectedCondPlayers.has(pl.id)
                        return (
                          <tr key={pl.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                            style={isSelected ? { backgroundColor: '#2563eb12' } : {}}>
                            <td className="py-1.5 px-3 sticky left-0 z-10 cursor-pointer"
                              style={{ whiteSpace: 'nowrap', backgroundColor: isSelected ? '#2563eb18' : '#fff' }}
                              onClick={() => setCondSelectedCondPlayers(prev => { const n = new Set(prev); isSelected ? n.delete(pl.id) : n.add(pl.id); return n })}>
                              <div className="flex items-center gap-1.5">
                                <img src={pl.photo} alt={pl.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                                  style={isSelected ? { outline: '2px solid #2563eb', outlineOffset: 1 } : {}}
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                <span className="font-medium" style={{ color: isSelected ? '#2563eb' : '#1e293b' }}>{pl.name}</span>
                              </div>
                            </td>
                            <td className="text-center py-1.5 px-2" style={{ whiteSpace: 'nowrap' }}>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">{pl.position}</span>
                            </td>
                            {condFilteredMatrixKeys.map(k => {
                              const d = aggP?.agg.find(a => a.date === k) as unknown as Record<string, number> | undefined
                              const val = d != null ? (d[condMatrixMetricKey] ?? null) : null
                              const colAvg = condMatrixColGroupAvgs[k]?.[pos] ?? 0
                              const above = val !== null && colAvg > 0 && val > colAvg
                              const hColor = pos === 'GK' ? '#f59e0b' : '#2563eb'
                              const hBg    = pos === 'GK' ? '#f59e0b18' : '#2563eb18'
                              return (
                                <td key={k} className="text-right py-1.5 px-2 tabular-nums font-semibold"
                                  style={val === null ? { color: '#cbd5e1' } : above
                                    ? { color: hColor, background: hBg }
                                    : { color: '#1e293b' }}>
                                  {fmtCondVal(val, condActiveMetricDef.decimals)}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </>
                  )
                })}
              </tbody>
            </table>
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

      {/* ════════ SESSION VIEW ════════ */}
      {compView === 'session' && (
        <>
          {/* Session info (left) + Session selector (right) — side by side */}
          <div className="grid gap-3" style={{ gridTemplateColumns: '300px 1fr' }}>

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
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-xs font-bold text-slate-800">
                          {sessionVenue === 'H' ? '🏠' : '✈️'} {sessionOpponent}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5"
                          style={sessionVenue === 'H' ? { color: '#fff', background: '#1e6fad', borderRadius: 2 } : { color: '#fff', background: '#5b21b6', borderRadius: 2 }}>
                          {sessionVenue === 'H' ? 'HOME' : 'AWAY'}
                        </span>
                        {sessionScore && (
                          <span className="text-sm font-bold text-slate-800">{sessionScore}</span>
                        )}
                      </div>
                    </div>
                    {sessionSample?.weather && (
                      <div className="pt-1 border-t border-slate-100 mt-1">
                        <p className="text-[10px] text-slate-400">天候 / 気温 / 湿度</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">
                          {sessionSample.weather === '晴' ? '☀️ 晴' : sessionSample.weather === '曇' ? '☁️ 曇' : '🌧 雨'}
                          {sessionSample?.temperature != null && (
                            <span className="ml-1.5 text-slate-700">{sessionSample.temperature}°C</span>
                          )}
                          {sessionSample?.humidity != null && (
                            <span className="ml-1.5 text-slate-500">{sessionSample.humidity}%</span>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Session selector */}
            <div className="bg-white border border-slate-200 overflow-hidden flex flex-col" style={{ borderRadius: 0 }}>
              <div className="px-3 py-2" style={{ backgroundColor: '#1a1a1a' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>セッション選択</p>
              </div>
              <div className="p-3 flex flex-col flex-1">
                {/* Month tabs */}
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {allSessionMonths.map(m => {
                    const mNum = parseInt(m.slice(5))
                    const isSel = selectedSessionMonth === m
                    return (
                      <button key={m} onClick={() => setSelectedSessionMonth(m)}
                        className="px-5 py-2 text-base font-bold border transition-all"
                        style={isSel
                          ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 4 }
                          : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 4 }}>
                        {mNum}月
                      </button>
                    )
                  })}
                </div>
                {/* Day pills */}
                <div className="grid grid-cols-7 gap-1 overflow-y-auto flex-1" style={{ maxHeight: 120, scrollbarWidth: 'none' }}>
                  {monthSessionDates.map(d => {
                    const dt = new Date(d)
                    const isMatch = gpsAgg.session.some((p: any) => p.agg.find((s: any) => s.date === d && s.sessionType === 'match'))
                    const isSel = selectedSessionDate === d
                    return (
                      <button key={d} onClick={() => setSelectedSessionDate(d)}
                        className="flex items-center justify-center gap-0.5 py-1 text-xs font-semibold border transition-all leading-none"
                        style={isSel
                          ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 4 }
                          : isMatch
                            ? { color: '#dc2626', borderColor: '#fca5a5', background: '#fff5f5', borderRadius: 4 }
                            : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 4 }}>
                        {isMatch && <span style={{ fontSize: 10 }}>⚽</span>}
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
                    <span style={{ fontSize: 10 }}>⚽</span>試合
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

          {/* Sortable GPS data table */}
          {sessionTablePlayers.length > 0 && (
            <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
              <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>GPSデータ一覧</span>
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#2a2a2a' }}>
                      <th className="text-left py-2 px-2 font-bold sticky left-0 z-10"
                        style={{ color: '#ccc', backgroundColor: '#2a2a2a', width: 120, minWidth: 120, maxWidth: 120 }}>選手</th>
                      <th className="text-center py-2 px-2 font-bold"
                        style={{ color: '#ccc', width: 40 }}>POS</th>
                      {GPS_METRICS.map(m => {
                        const [line1, line2] = TABLE_HEADER[m.key] ?? [m.label, '']
                        const isSort = sessionTableSort.key === m.key
                        return (
                          <th key={m.key}
                            className="text-right py-2 px-2 font-bold cursor-pointer select-none transition-colors"
                            style={{ color: isSort ? '#60a5fa' : '#ccc', verticalAlign: 'bottom', lineHeight: 1.3 }}
                            onClick={() => handleSessionTableSort(m.key)}>
                            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line1}</span>
                            {line2 && <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line2}</span>}
                            <span style={{ display: 'block', fontSize: 9, opacity: 0.5, whiteSpace: 'nowrap' }}>{m.unit}</span>
                            <span style={{ display: 'block', fontSize: 9, opacity: 0.6 }}>{isSort ? (sessionTableSort.dir === 'desc' ? '↓' : '↑') : '↕'}</span>
                          </th>
                        )
                      })}
                      {ZONE_COLS.map(z => {
                        const [line1, line2] = TABLE_HEADER[z.key] ?? [z.label, '']
                        const isSort = sessionTableSort.key === z.key
                        return (
                          <th key={z.key}
                            className="text-right py-2 px-2 font-bold cursor-pointer select-none transition-colors"
                            style={{ color: isSort ? '#60a5fa' : '#aaa', verticalAlign: 'bottom', lineHeight: 1.3 }}
                            onClick={() => handleSessionTableSort(z.key)}>
                            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line1}</span>
                            {line2 && <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line2}</span>}
                            <span style={{ display: 'block', fontSize: 9, opacity: 0.5, whiteSpace: 'nowrap' }}>m</span>
                            <span style={{ display: 'block', fontSize: 9, opacity: 0.6 }}>{isSort ? (sessionTableSort.dir === 'desc' ? '↓' : '↑') : '↕'}</span>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sessionTablePlayers.map((p: any, i: number) => {
                      const s = p.session as any
                      const rowBg = i % 2 !== 0 ? '#f8fafc' : '#fff'
                      return (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                          style={i % 2 !== 0 ? { backgroundColor: '#f8fafc' } : {}}>
                          <td className="py-1.5 px-2 sticky left-0 z-10" style={{ backgroundColor: rowBg, width: 120, minWidth: 120, maxWidth: 120 }}>
                            <div className="flex items-center gap-1" style={{ overflow: 'hidden' }}>
                              <img src={p.photo} alt={p.name} className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              <span className="font-medium text-slate-800 truncate" style={{ fontSize: 10 }}>{p.name}</span>
                            </div>
                          </td>
                          <td className="text-center py-1.5 px-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">{p.position}</span>
                          </td>
                          {(() => {
                            const posGroup: DisplayPos = POS_GROUPS.GK.includes(p.position) ? 'GK' : 'FP'
                            const hColor = posGroup === 'GK' ? '#f59e0b' : '#2563eb'
                            const hBg    = posGroup === 'GK' ? '#f59e0b18' : '#2563eb18'
                            return (
                              <>
                                {GPS_METRICS.map(m => {
                                  const val = getVal(s ?? {}, m.key)
                                  const avg = sessionTableColAvgs[posGroup][m.key] ?? 0
                                  const above = val > 0 && avg > 0 && val > avg
                                  return (
                                    <td key={m.key} className="text-right py-1.5 px-2 tabular-nums font-semibold"
                                      style={above ? { color: hColor, background: hBg } : { color: '#1e293b' }}>
                                      {val.toLocaleString()}
                                    </td>
                                  )
                                })}
                                {ZONE_COLS.map(z => {
                                  const val = getVal(s ?? {}, z.key)
                                  const avg = sessionTableColAvgs[posGroup][z.key] ?? 0
                                  const above = val > 0 && avg > 0 && val > avg
                                  return (
                                    <td key={z.key} className="text-right py-1.5 px-2 tabular-nums font-semibold"
                                      style={above ? { color: hColor, background: hBg } : { color: '#475569' }}>
                                      {val.toLocaleString()}
                                    </td>
                                  )
                                })}
                              </>
                            )
                          })()}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════ MATRIX VIEW ════════ */}
      {compView === 'matrix' && (
        <>
          {/* Header: 比較マトリクス */}
          <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
            <div className="px-4 py-2 flex items-center gap-3" style={{ backgroundColor: '#1a1a1a' }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>比較マトリクス</span>
            </div>
          </div>

          {/* Period selector: 日別/週別/月別 — ABOVE 表示期間 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded gap-0.5 p-0.5" style={{ backgroundColor: '#1a1a1a' }}>
              {MATRIX_PERIODS.map(p => (
                <button key={p.key} onClick={() => setMatrixPeriod(p.key)}
                  className="px-4 py-1.5 rounded text-xs font-bold transition-all"
                  style={matrixPeriod === p.key
                    ? { backgroundColor: '#2563eb', color: '#fff' }
                    : { color: '#888', background: 'transparent' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 表示期間 selector — TOP */}
          <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
            <button className="w-full px-3 py-2 flex items-center gap-2 text-left"
              style={{ backgroundColor: '#1a1a1a' }}
              onClick={() => setGpsPeriodOpen(o => !o)}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>表示期間</span>
              {(selectedMatrixKeys.size > 0 || matrixMonthFilter.size > 0) && (
                <span className="ml-2 text-[10px] font-bold px-2 py-0.5"
                  style={{ color: '#60a5fa', borderRadius: 2, border: '1px solid #60a5fa33', background: 'transparent' }}>
                  {filteredMatrixKeys.length}件選択中
                </span>
              )}
              <span className="ml-auto text-[10px]" style={{ color: '#666' }}>{gpsPeriodOpen ? '▲' : '▼'}</span>
            </button>
            {gpsPeriodOpen && <div className="px-3 pt-2 pb-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <button
                  onClick={() => {
                    setSelectedMatrixKeys(new Set()); setMatrixMonthFilter(new Set())
                    setMatrixRangeStart(allMatrixKeys[0] ?? '')
                    setMatrixRangeEnd(allMatrixKeys[allMatrixKeys.length - 1] ?? '')
                  }}
                  className="px-3 py-1 text-xs font-bold border transition-all"
                  style={selectedMatrixKeys.size === 0 && matrixMonthFilter.size === 0
                    ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                    : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                  全期間
                </button>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="font-medium">範囲</span>
                  <select value={matrixRangeStart}
                    onChange={e => { setMatrixRangeStart(e.target.value); applyGpsRange(e.target.value, matrixRangeEnd) }}
                    className="border border-slate-200 text-[10px] font-bold px-1 py-0.5 text-slate-700"
                    style={{ borderRadius: 3, outline: 'none', cursor: 'pointer' }}>
                    {allMatrixKeys.map(k => <option key={k} value={k}>{formatMatrixKey(k)}</option>)}
                  </select>
                  <span>〜</span>
                  <select value={matrixRangeEnd}
                    onChange={e => { setMatrixRangeEnd(e.target.value); applyGpsRange(matrixRangeStart, e.target.value) }}
                    className="border border-slate-200 text-[10px] font-bold px-1 py-0.5 text-slate-700"
                    style={{ borderRadius: 3, outline: 'none', cursor: 'pointer' }}>
                    {allMatrixKeys.map(k => <option key={k} value={k}>{formatMatrixKey(k)}</option>)}
                  </select>
                </div>
                <span className="text-[10px] text-slate-400 ml-auto">{filteredMatrixKeys.length}件</span>
              </div>
              {matrixPeriod === 'daily' ? (
                <div className="space-y-1.5 pb-1">
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
                  <div className="flex flex-wrap gap-1 pb-1">
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
                <div className="flex flex-wrap gap-1 pb-1">
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
            </div>}
          </div>

          {/* Metric selector: GPS metrics + Zone distance buttons — BELOW 表示期間 */}
          <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
            <button className="w-full px-4 py-2 flex items-center gap-2 text-left"
              style={{ backgroundColor: '#1a1a1a' }}
              onClick={() => setGpsMetricSelectorOpen(o => !o)}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#aaa' }}>項目選択</span>
              <span className="text-xs font-bold ml-2" style={{ color: '#60a5fa' }}>
                {GPS_METRICS.find(m => m.key === matrixMetricKey)?.label ?? ZONE_COLS.find(z => z.key === matrixMetricKey)?.label ?? ''}
              </span>
              <span className="ml-auto text-[10px]" style={{ color: '#666' }}>{gpsMetricSelectorOpen ? '▲' : '▼'}</span>
            </button>
            {gpsMetricSelectorOpen && <div className="p-3 space-y-2">
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
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 self-center mr-1">ZONE別</span>
              {ZONE_COLS.map(z => (
                <button key={z.key} onClick={() => setMatrixMetricKey(z.key)}
                  className="px-3 py-1.5 text-xs font-medium border transition-all"
                  style={matrixMetricKey === z.key
                    ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 4 }
                    : { color: '#374151', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 4 }}>
                  {z.label}
                </button>
              ))}
            </div></div>}
          </div>

          {/* Line chart for selected players — ABOVE the table */}
          {selectedMatrixPlayers.size > 0 && (
            <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
              <div className="px-4 py-2 flex items-center gap-3" style={{ backgroundColor: '#1a1a1a' }}>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>
                  {matrixMetric.label} 推移グラフ
                </span>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  {[...selectedMatrixPlayers].map((id, idx) => {
                    const pl = players.find(p => p.id === id)
                    const color = PLAYER_PALETTE[idx % PLAYER_PALETTE.length]
                    return pl ? (
                      <span key={id} className="flex items-center gap-1 text-[10px] font-medium"
                        style={{ color }}>
                        <span className="inline-block w-3 h-0.5" style={{ backgroundColor: color }} />
                        {pl.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={matrixChartData}>
                    <CartesianGrid {...CHART.grid} />
                    <XAxis dataKey="label" {...CHART.axis} />
                    <YAxis {...CHART.axis} domain={['auto', 'auto']} />
                    <Tooltip
                      {...CHART.tooltip}
                      formatter={(v, name) => {
                        const pl = players.find(p => p.id === name)
                        return [`${Number(v).toLocaleString()} ${matrixMetric.unit}`, pl?.name ?? name]
                      }}
                    />
                    {[...selectedMatrixPlayers].map((id, idx) => {
                      const color = PLAYER_PALETTE[idx % PLAYER_PALETTE.length]
                      return (
                        <Line key={id} type="monotone" dataKey={id}
                          stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                          connectNulls />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Time-series matrix table: player rows × date columns */}
          <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
            <div className="px-4 py-2 flex items-center gap-3" style={{ backgroundColor: '#1a1a1a' }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fff' }}>
                {matrixMetric.label}（{matrixMetric.unit}）　推移比較
              </span>
              <span className="text-[10px]" style={{ color: '#888' }}>ポジション平均以上を強調　／　選手名クリックでグラフ表示</span>
              {selectedMatrixPlayers.size > 0 && (
                <button onClick={() => setSelectedMatrixPlayers(new Set())}
                  className="ml-auto text-[10px] px-2 py-0.5 font-bold"
                  style={{ color: '#60a5fa', borderRadius: 2, border: '1px solid #60a5fa33', background: 'transparent' }}>
                  選択解除
                </button>
              )}
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
                  {(['GK', 'FP'] as DisplayPos[]).map(pos => {
                    const groupColor = pos === 'GK' ? '#f59e0b' : '#6366f1'
                    const groupLabel = pos === 'GK' ? 'GK' : 'FP（DF / MF / FW）'
                    const groupBg    = pos === 'GK' ? '#f59e0b15' : '#6366f115'
                    const posPlayers = matrixPlayerRows.filter(p => POS_GROUPS[pos].includes(p.position))
                    return (
                      <>
                        {/* Group header */}
                        <tr key={`header-${pos}`}>
                          <td colSpan={2 + filteredMatrixKeys.length} className="py-1 px-3 text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: groupBg, color: groupColor }}>{groupLabel}</td>
                        </tr>
                        {/* Average row — FIRST in group */}
                        <tr key={`avg-${pos}`} style={{ backgroundColor: groupBg }}>
                          <td className="py-1 px-3 sticky left-0 z-10 text-[10px] font-bold"
                            style={{ backgroundColor: groupBg, color: groupColor, whiteSpace: 'nowrap' }}>
                            {pos} 平均
                          </td>
                          <td />
                          {filteredMatrixKeys.map(k => {
                            const avg = matrixColGroupAvgs[k]?.[pos] ?? 0
                            return (
                              <td key={k} className="text-right py-1 px-2 tabular-nums text-[10px] font-bold"
                                style={{ color: groupColor }}>
                                {avg > 0 ? Math.round(avg).toLocaleString() : '—'}
                              </td>
                            )
                          })}
                        </tr>
                        {/* Player rows */}
                        {posPlayers.map(pl => {
                          const aggP = gpsAgg[matrixPeriod].find((a: any) => a.id === pl.id)
                          const isSelected = selectedMatrixPlayers.has(pl.id)
                          const selColor = '#2563eb'
                          return (
                            <tr key={pl.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                              style={isSelected ? { backgroundColor: selColor + '12' } : {}}>
                              <td className="py-1.5 px-3 sticky left-0 z-10 cursor-pointer"
                                style={{ whiteSpace: 'nowrap', backgroundColor: isSelected ? selColor + '18' : '#fff' }}
                                onClick={() => setSelectedMatrixPlayers(prev => { const n = new Set(prev); isSelected ? n.delete(pl.id) : n.add(pl.id); return n })}>
                                <div className="flex items-center gap-1.5">
                                  <img src={pl.photo} alt={pl.name} className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                                    style={isSelected ? { outline: `2px solid ${selColor}`, outlineOffset: 1 } : {}}
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                  <span className="font-medium" style={{ color: isSelected ? selColor : '#1e293b' }}>{pl.name}</span>
                                </div>
                              </td>
                              <td className="text-center py-1.5 px-2" style={{ whiteSpace: 'nowrap' }}>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">{pl.position}</span>
                              </td>
                              {filteredMatrixKeys.map(k => {
                                const d = aggP?.agg.find((a: any) => a.date === k) as any
                                const val = d ? getVal(d, matrixMetricKey) : null
                                const colAvg = matrixColGroupAvgs[k]?.[pos] ?? 0
                                const above = val !== null && colAvg > 0 && val > colAvg
                                const hColor = pos === 'GK' ? '#f59e0b' : '#2563eb'
                                const hBg    = pos === 'GK' ? '#f59e0b18' : '#2563eb18'
                                return (
                                  <td key={k} className="text-right py-1.5 px-2 tabular-nums font-semibold"
                                    style={val === null ? { color: '#cbd5e1' } : above
                                      ? { color: hColor, background: hBg }
                                      : { color: '#1e293b' }}>
                                    {val !== null ? val.toLocaleString() : '—'}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}
    </div>
  )
}
