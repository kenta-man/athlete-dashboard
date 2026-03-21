import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import type { ConditioningData, Player } from '../data/sampleData'
import { type Period, formatPeriodLabel } from '../utils/aggregation'

interface Props { data: ConditioningData[]; period: Period; player: Player }

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

// ─── Section item with color highlight (no delta number) ─────────────────────
function SectionItem({
  label, curr, prev, unit, decimals = 1,
}: { label: string; curr: number; prev: number | undefined; unit: string; decimals?: number }) {
  const diff = prev !== undefined ? +(curr - prev).toFixed(decimals) : null
  const valueColor = diff === null || diff === 0 ? '#1e293b' : diff > 0 ? '#ef4444' : '#3b82f6'
  return (
    <div className="flex items-center justify-between py-0.5 border-b border-slate-50 last:border-0 gap-1">
      <span className="text-slate-400 flex-shrink-0 leading-tight" style={{ fontSize: 10 }}>{label}</span>
      <span className="font-bold flex items-center gap-0.5 text-right flex-shrink-0" style={{ fontSize: 11, color: valueColor }}>
        {curr}{unit && <span className="font-normal text-slate-400" style={{ fontSize: 10 }}>{unit}</span>}
      </span>
    </div>
  )
}

// ─── Session Summary ─────────────────────────────────────────────────────────
function SessionSummary({ data, player }: { data: ConditioningData[]; player: Player }) {
  const [idx, setIdx] = useState(data.length - 1)
  const d = data[idx]
  const p = idx > 0 ? data[idx - 1] : undefined  // previous measurement

  const months = [...new Set(data.map(d => d.date.slice(0, 7)))].sort()
  const [selectedMonth, setSelectedMonth] = useState(data[data.length - 1].date.slice(0, 7))
  const monthSessions = data.map((dd, i) => ({ ...dd, idx: i })).filter(dd => dd.date.startsWith(selectedMonth))

  // Top KPIs definition
  const topKpis = [
    { label: '体重',         curr: d.weight,             prev: p?.weight,             unit: 'kg',   accent: '#3b82f6' },
    { label: '体脂肪率',     curr: d.bodyFatPct,         prev: p?.bodyFatPct,         unit: '%',    accent: '#ef4444' },
    { label: '骨格筋量',     curr: d.skeletalMuscleMass, prev: p?.skeletalMuscleMass, unit: 'kg',   accent: '#10b981' },
    { label: '筋肉量',       curr: d.muscleMass,         prev: p?.muscleMass,         unit: 'kg',   accent: '#059669' },
    { label: '除脂肪量',     curr: d.leanBodyMass,       prev: p?.leanBodyMass,       unit: 'kg',   accent: '#0ea5e9' },
    { label: '基礎代謝',     curr: d.bmr,                prev: p?.bmr,                unit: 'kcal', accent: '#8b5cf6' },
    { label: '水和率',       curr: d.hydrationRate,      prev: p?.hydrationRate,      unit: '%',    accent: '#0284c7' },
    { label: '全身位相角',   curr: d.phaseAngleWhole,    prev: p?.phaseAngleWhole,    unit: '°',    accent: '#7c3aed' },
    { label: '安静時心拍',   curr: d.hrResting,          prev: p?.hrResting,          unit: 'bpm',  accent: '#f43f5e' },
    { label: 'HRV',          curr: d.hrv,                prev: p?.hrv,                unit: 'ms',   accent: '#6366f1' },
    { label: '睡眠時間',     curr: d.sleepHours,         prev: p?.sleepHours,         unit: 'h',    accent: '#f59e0b' },
    { label: '疲労感',       curr: d.fatigueLevel,       prev: p?.fatigueLevel,       unit: '/10',  accent: '#f97316' },
    { label: 'モチベーション', curr: d.motivation,       prev: p?.motivation,         unit: '/10',  accent: '#34d399' },
    { label: 'ストレス',     curr: d.stressLevel,        prev: p?.stressLevel,        unit: '/10',  accent: '#94a3b8' },
  ]

  const sections = [
    {
      title: '体組成指標', color: '#3b82f6',
      items: [
        { label: '体重',     curr: d.weight,            prev: p?.weight,            unit: 'kg' },
        { label: 'BMI',      curr: d.bmi,               prev: p?.bmi,               unit: '', decimals: 1 },
        { label: '体脂肪率', curr: d.bodyFatPct,        prev: p?.bodyFatPct,        unit: '%' },
        { label: '体脂肪量', curr: d.bodyFatMass,       prev: p?.bodyFatMass,       unit: 'kg' },
        { label: '筋肉量',   curr: d.muscleMass,        prev: p?.muscleMass,        unit: 'kg' },
        { label: '骨格筋量', curr: d.skeletalMuscleMass,prev: p?.skeletalMuscleMass,unit: 'kg' },
        { label: '除脂肪量', curr: d.leanBodyMass,      prev: p?.leanBodyMass,      unit: 'kg' },
      ],
    },
    {
      title: '体成分・細胞健康', color: '#0ea5e9',
      items: [
        { label: '体水分量',     curr: d.bodyWater,           prev: p?.bodyWater,           unit: 'L' },
        { label: '細胞内水分量', curr: d.intracellularWater,  prev: p?.intracellularWater,  unit: 'L' },
        { label: '細胞外水分量', curr: d.extracellularWater,  prev: p?.extracellularWater,  unit: 'L' },
        { label: 'タンパク質量', curr: d.protein,             prev: p?.protein,             unit: 'kg' },
        { label: 'ミネラル量',   curr: d.mineral,             prev: p?.mineral,             unit: 'kg', decimals: 2 },
        { label: '体細胞量',     curr: d.bodyCellMass,        prev: p?.bodyCellMass,        unit: 'kg' },
        { label: '骨ミネラル量', curr: d.boneMineralMass,     prev: p?.boneMineralMass,     unit: 'kg', decimals: 2 },
      ],
    },
    {
      title: '代謝・水分バランス', color: '#8b5cf6',
      items: [
        { label: '基礎代謝量',   curr: d.bmr,          prev: p?.bmr,          unit: 'kcal', decimals: 0 },
        { label: '水和率',       curr: d.hydrationRate, prev: p?.hydrationRate, unit: '%' },
        { label: '細胞外水分比', curr: d.ecwRatio,     prev: p?.ecwRatio,     unit: '', decimals: 3 },
        { label: '除脂肪指数',   curr: d.ffmi,         prev: p?.ffmi,         unit: '' },
        { label: '体脂肪指数',   curr: d.fmi,          prev: p?.fmi,          unit: '' },
        { label: 'ウエストヒップ比', curr: d.whr,      prev: p?.whr,          unit: '', decimals: 2 },
        { label: '肥満度',       curr: d.obesityDegree,prev: p?.obesityDegree,unit: '%' },
      ],
    },
    {
      title: '部位別筋肉量', color: '#10b981',
      items: [
        { label: '右腕', curr: d.muscleRightArm, prev: p?.muscleRightArm, unit: 'kg', decimals: 2 },
        { label: '左腕', curr: d.muscleLeftArm,  prev: p?.muscleLeftArm,  unit: 'kg', decimals: 2 },
        { label: '体幹', curr: d.muscleTrunk,    prev: p?.muscleTrunk,    unit: 'kg' },
        { label: '右脚', curr: d.muscleRightLeg, prev: p?.muscleRightLeg, unit: 'kg' },
        { label: '左脚', curr: d.muscleLeftLeg,  prev: p?.muscleLeftLeg,  unit: 'kg' },
      ],
    },
    {
      title: '部位別発達率', color: '#059669',
      items: [
        { label: '右腕', curr: d.devRightArm, prev: p?.devRightArm, unit: '%' },
        { label: '左腕', curr: d.devLeftArm,  prev: p?.devLeftArm,  unit: '%' },
        { label: '体幹', curr: d.devTrunk,    prev: p?.devTrunk,    unit: '%' },
        { label: '右脚', curr: d.devRightLeg, prev: p?.devRightLeg, unit: '%' },
        { label: '左脚', curr: d.devLeftLeg,  prev: p?.devLeftLeg,  unit: '%' },
      ],
    },
    {
      title: '位相角（50kHz）', color: '#7c3aed',
      items: [
        { label: '右腕', curr: d.phaseAngleRightArm, prev: p?.phaseAngleRightArm, unit: '°' },
        { label: '左腕', curr: d.phaseAngleLeftArm,  prev: p?.phaseAngleLeftArm,  unit: '°' },
        { label: '体幹', curr: d.phaseAngleTrunk,    prev: p?.phaseAngleTrunk,    unit: '°' },
        { label: '右脚', curr: d.phaseAngleRightLeg, prev: p?.phaseAngleRightLeg, unit: '°' },
        { label: '左脚', curr: d.phaseAngleLeftLeg,  prev: p?.phaseAngleLeftLeg,  unit: '°' },
        { label: '全身', curr: d.phaseAngleWhole,    prev: p?.phaseAngleWhole,    unit: '°' },
      ],
    },
    {
      title: '身体周囲径', color: '#f59e0b',
      items: [
        { label: '首',       curr: d.circumNeck,       prev: p?.circumNeck,       unit: 'cm' },
        { label: '胸部',     curr: d.circumChest,      prev: p?.circumChest,      unit: 'cm' },
        { label: '腹部',     curr: d.circumAbdomen,    prev: p?.circumAbdomen,    unit: 'cm' },
        { label: '臀部',     curr: d.circumHip,        prev: p?.circumHip,        unit: 'cm' },
        { label: '右腕',     curr: d.circumRightArm,   prev: p?.circumRightArm,   unit: 'cm' },
        { label: '左腕',     curr: d.circumLeftArm,    prev: p?.circumLeftArm,    unit: 'cm' },
        { label: '右太もも', curr: d.circumRightThigh, prev: p?.circumRightThigh, unit: 'cm' },
        { label: '左太もも', curr: d.circumLeftThigh,  prev: p?.circumLeftThigh,  unit: 'cm' },
      ],
    },
    {
      title: '主観的状態', color: '#ec4899',
      items: [
        { label: '睡眠時間',       curr: d.sleepHours,     prev: p?.sleepHours,     unit: 'h' },
        { label: '睡眠の質',       curr: d.sleepQuality,   prev: p?.sleepQuality,   unit: '/10', decimals: 0 },
        { label: '疲労感',         curr: d.fatigueLevel,   prev: p?.fatigueLevel,   unit: '/10', decimals: 0 },
        { label: '筋肉痛',         curr: d.muscleSoreness, prev: p?.muscleSoreness, unit: '/10', decimals: 0 },
        { label: 'モチベーション', curr: d.motivation,     prev: p?.motivation,     unit: '/10', decimals: 0 },
        { label: 'ストレス',       curr: d.stressLevel,    prev: p?.stressLevel,    unit: '/10', decimals: 0 },
      ],
    },
    {
      title: 'バイオメトリクス', color: '#ef4444',
      items: [
        { label: '安静時心拍数', curr: d.hrResting,  prev: p?.hrResting,  unit: 'bpm', decimals: 0 },
        { label: 'HRV',          curr: d.hrv,         prev: p?.hrv,         unit: 'ms' },
        { label: '収縮期血圧',   curr: d.systolicBP,  prev: p?.systolicBP,  unit: 'mmHg', decimals: 0 },
        { label: '拡張期血圧',   curr: d.diastolicBP, prev: p?.diastolicBP, unit: 'mmHg', decimals: 0 },
      ],
    },
    {
      title: '栄養摂取', color: '#f97316',
      items: [
        { label: 'カロリー',   curr: d.calorieIntake, prev: p?.calorieIntake, unit: 'kcal', decimals: 0 },
        { label: 'タンパク質', curr: d.proteinIntake, prev: p?.proteinIntake, unit: 'g' },
        { label: '炭水化物',   curr: d.carbIntake,    prev: p?.carbIntake,    unit: 'g' },
        { label: '脂質',       curr: d.fatIntakeG,    prev: p?.fatIntakeG,    unit: 'g' },
        { label: '水分摂取',   curr: d.waterIntake,   prev: p?.waterIntake,   unit: 'L' },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      {/* Session selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">測定日選択</p>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {months.map(m => {
            const monthNum = parseInt(m.slice(5))
            const hasSelected = data[idx].date.startsWith(m)
            return (
              <button key={m} onClick={() => setSelectedMonth(m)}
                className="px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
                style={selectedMonth === m
                  ? { color: '#fff', background: '#10b981', borderColor: '#10b981' }
                  : hasSelected
                    ? { color: '#10b981', background: '#f0fdf4', borderColor: '#6ee7b7' }
                    : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent' }}>
                {monthNum}月
              </button>
            )
          })}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {monthSessions.map(dd => {
            const selected = idx === dd.idx
            return (
              <button key={dd.date} onClick={() => setIdx(dd.idx)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={selected
                  ? { color: '#10b981', background: '#f0fdf4', borderColor: '#6ee7b7' }
                  : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent' }}>
                {dd.date.slice(8)}日
              </button>
            )
          })}
        </div>
        {p && (
          <p className="text-xs text-slate-400 mt-2">前回測定: {p.date}</p>
        )}
      </div>

      {/* Header KPI grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">{player.name}</p>
            <p className="text-base font-bold text-slate-700">{d.date} 測定 #{idx + 1}/{data.length}</p>
          </div>
          {p && <p className="text-xs text-slate-400">前回比 <span className="text-red-400">▲増加</span> <span className="text-blue-400 ml-1">▼減少</span></p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {topKpis.map(k => {
            const diff = k.prev !== undefined ? +(k.curr - k.prev).toFixed(1) : null
            const diffColor = diff === null || diff === 0 ? undefined : diff > 0 ? '#ef4444' : '#3b82f6'
            return (
              <div key={k.label} className="rounded-lg p-2.5 bg-slate-50 border border-slate-100 text-center">
                <p className="text-xs text-slate-400 mb-1 leading-tight">{k.label}</p>
                <p className="text-sm font-bold leading-none text-slate-800 flex items-baseline justify-center gap-0.5 flex-wrap">
                  {k.curr}<span className="text-xs font-normal text-slate-400">{k.unit}</span>
                  {diff !== null && diff !== 0 && (
                    <span className="text-xs font-bold" style={{ color: diffColor }}>
                      {diff > 0 ? `+${diff}` : `${diff}`}
                    </span>
                  )}
                  {diff === 0 && <span className="text-slate-300 text-xs">→</span>}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail sections */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sections.map(sec => (
          <div key={sec.title} className="bg-white rounded-xl p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-3 rounded-full" style={{ backgroundColor: sec.color }} />
              <h3 className="text-xs font-semibold tracking-wide text-slate-500">{sec.title}</h3>
            </div>
            <div className="space-y-0">
              {sec.items.map(it => (
                <SectionItem
                  key={it.label}
                  label={it.label}
                  curr={it.curr}
                  prev={it.prev}
                  unit={it.unit}
                  decimals={it.decimals ?? 1}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Trend View ──────────────────────────────────────────────────────────────
function TrendView({ data, period }: { data: ConditioningData[]; period: Period }) {
  const fmt = (k: string) => formatPeriodLabel(k, period)
  const latest = data[data.length - 1]
  const prev   = data.length > 1 ? data[data.length - 2] : undefined

  const bodyPartData = [
    { part: '右腕', kg: latest.muscleRightArm, dev: latest.devRightArm },
    { part: '左腕', kg: latest.muscleLeftArm,  dev: latest.devLeftArm },
    { part: '体幹', kg: latest.muscleTrunk,    dev: latest.devTrunk },
    { part: '右脚', kg: latest.muscleRightLeg, dev: latest.devRightLeg },
    { part: '左脚', kg: latest.muscleLeftLeg,  dev: latest.devLeftLeg },
  ]
  const phaseData = [
    { part: '右腕', v: latest.phaseAngleRightArm },
    { part: '左腕', v: latest.phaseAngleLeftArm },
    { part: '体幹', v: latest.phaseAngleTrunk },
    { part: '右脚', v: latest.phaseAngleRightLeg },
    { part: '左脚', v: latest.phaseAngleLeftLeg },
    { part: '全身', v: latest.phaseAngleWhole },
  ]
  const radarData = [
    { s: 'BMI',    v: Math.min(100, latest.bmi * 4) },
    { s: '骨格筋量', v: Math.min(100, latest.skeletalMuscleMass * 1.8) },
    { s: '低体脂肪', v: Math.min(100, (20 - latest.bodyFatPct) * 5) },
    { s: '水和率',   v: Math.min(100, latest.hydrationRate) },
    { s: '位相角',   v: Math.min(100, latest.phaseAngleWhole * 9) },
  ]
  const wellnessData = data.map(d => ({
    date: d.date,
    sleep: d.sleepHours,
    quality: d.sleepQuality,
    fatigue: d.fatigueLevel,
    motivation: d.motivation,
    stress: d.stressLevel,
  }))
  const bioData = data.map(d => ({
    date: d.date,
    hrResting: d.hrResting,
    hrv: d.hrv,
    systolic: d.systolicBP,
    diastolic: d.diastolicBP,
  }))
  const nutritionData = data.map(d => ({
    date: d.date,
    protein: d.proteinIntake,
    carb: d.carbIntake,
    fat: d.fatIntakeG,
  }))

  return (
    <div className="space-y-4">
      {/* Summary KPIs with delta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '体重',       curr: latest.weight,             prev: prev?.weight,             unit: 'kg',   accent: '#3b82f6' },
          { label: '体脂肪率',   curr: latest.bodyFatPct,         prev: prev?.bodyFatPct,         unit: '%',    accent: '#ef4444' },
          { label: '骨格筋量',   curr: latest.skeletalMuscleMass, prev: prev?.skeletalMuscleMass, unit: 'kg',   accent: '#10b981' },
          { label: '全身位相角', curr: latest.phaseAngleWhole,    prev: prev?.phaseAngleWhole,    unit: '°',    accent: '#8b5cf6' },
          { label: '安静時心拍', curr: latest.hrResting,          prev: prev?.hrResting,          unit: 'bpm',  accent: '#f43f5e' },
          { label: 'HRV',        curr: latest.hrv,                prev: prev?.hrv,                unit: 'ms',   accent: '#6366f1' },
          { label: '睡眠時間',   curr: latest.sleepHours,         prev: prev?.sleepHours,         unit: 'h',    accent: '#f59e0b' },
          { label: '疲労感',     curr: latest.fatigueLevel,       prev: prev?.fatigueLevel,       unit: '/10',  accent: '#f97316' },
        ].map(k => {
          const diff = k.prev !== undefined ? +(k.curr - k.prev).toFixed(1) : null
          const diffColor = diff === null || diff === 0 ? '#94a3b8' : diff > 0 ? '#ef4444' : '#3b82f6'
          return (
            <div key={k.label} className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: k.accent }} />
                <p className="text-xs text-slate-400">{k.label}</p>
              </div>
              <div className="flex items-end gap-1.5">
                <p className="text-2xl font-bold" style={{ color: k.accent }}>
                  {k.curr}<span className="text-sm font-normal text-slate-400 ml-1">{k.unit}</span>
                </p>
                {diff !== null && (
                  <p className="text-sm font-bold mb-0.5" style={{ color: diffColor }}>
                    {diff === 0 ? '→' : diff > 0 ? `+${diff}` : `${diff}`}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="体重 / 体脂肪率">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis yAxisId="l" {...CHART.axis} domain={['auto','auto']} />
              <YAxis yAxisId="r" orientation="right" {...CHART.axis} domain={['auto','auto']} />
              <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line yAxisId="l" type="monotone" dataKey="weight"     name="体重(kg)"    stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} />
              <Line yAxisId="r" type="monotone" dataKey="bodyFatPct" name="体脂肪率(%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="筋肉量">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis {...CHART.axis} domain={['auto','auto']} />
              <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line type="monotone" dataKey="muscleMass"         name="筋肉量(kg)"   stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} />
              <Line type="monotone" dataKey="skeletalMuscleMass" name="骨格筋量(kg)"  stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: '#059669', strokeWidth: 0 }} />
              <Line type="monotone" dataKey="leanBodyMass"       name="除脂肪量(kg)"  stroke="#6ee7b7" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2, fill: '#6ee7b7', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="部位別筋肉量 / 発達率（最新）">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bodyPartData} barGap={3}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="part" {...CHART.axis} />
              <YAxis yAxisId="l" {...CHART.axis} />
              <YAxis yAxisId="r" orientation="right" {...CHART.axis} domain={[80,130]} />
              <Tooltip {...CHART.tooltip} />
              <Legend {...CHART.legend} />
              <Bar yAxisId="l" dataKey="kg"  name="筋肉量(kg)" fill="#3b82f6" radius={[3,3,0,0]} barSize={12} />
              <Bar yAxisId="r" dataKey="dev" name="発達率(%)"  fill="#10b981" radius={[3,3,0,0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="コンディションサマリー（最新）">
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="s" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0,100]} />
              <Radar dataKey="v" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="水分バランス">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis yAxisId="l" {...CHART.axis} domain={['auto','auto']} />
              <YAxis yAxisId="r" orientation="right" {...CHART.axis} domain={['auto','auto']} />
              <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line yAxisId="l" type="monotone" dataKey="intracellularWater" name="細胞内水分(L)" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3, fill: '#0ea5e9', strokeWidth: 0 }} />
              <Line yAxisId="l" type="monotone" dataKey="extracellularWater" name="細胞外水分(L)" stroke="#7dd3fc" strokeWidth={2} dot={{ r: 3, fill: '#7dd3fc', strokeWidth: 0 }} />
              <Line yAxisId="r" type="monotone" dataKey="hydrationRate"      name="水和率(%)"    stroke="#0284c7" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2, fill: '#0284c7', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="部位別位相角（最新）50kHz">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={phaseData} barSize={18}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="part" {...CHART.axis} />
              <YAxis {...CHART.axis} domain={[0,12]} />
              <Tooltip {...CHART.tooltip} formatter={(v) => [`${Number(v).toFixed(1)}°`]} />
              <Bar dataKey="v" name="位相角(°)" fill="#8b5cf6" radius={[3,3,0,0]} background={{ fill: '#f8fafc', radius: 3 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="主観的コンディション">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={wellnessData}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis yAxisId="l" {...CHART.axis} domain={[0,12]} />
              <YAxis yAxisId="r" orientation="right" {...CHART.axis} domain={[0,10]} />
              <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line yAxisId="l" type="monotone" dataKey="sleep"      name="睡眠時間(h)"       stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} />
              <Line yAxisId="r" type="monotone" dataKey="quality"    name="睡眠の質(/10)"     stroke="#fcd34d" strokeWidth={1.5} dot={{ r: 2, fill: '#fcd34d', strokeWidth: 0 }} />
              <Line yAxisId="r" type="monotone" dataKey="fatigue"    name="疲労感(/10)"       stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2, fill: '#f87171', strokeWidth: 0 }} />
              <Line yAxisId="r" type="monotone" dataKey="motivation" name="モチベーション(/10)" stroke="#34d399" strokeWidth={1.5} dot={{ r: 2, fill: '#34d399', strokeWidth: 0 }} />
              <Line yAxisId="r" type="monotone" dataKey="stress"     name="ストレス(/10)"     stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" dot={{ r: 2, fill: '#94a3b8', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="心拍数 / HRV">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bioData}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis yAxisId="l" {...CHART.axis} domain={['auto','auto']} />
              <YAxis yAxisId="r" orientation="right" {...CHART.axis} domain={['auto','auto']} />
              <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line yAxisId="l" type="monotone" dataKey="hrResting" name="安静時心拍(bpm)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} />
              <Line yAxisId="r" type="monotone" dataKey="hrv"       name="HRV(ms)"         stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} />
              <Line yAxisId="l" type="monotone" dataKey="systolic"  name="収縮期血圧(mmHg)" stroke="#fb7185" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2, fill: '#fb7185', strokeWidth: 0 }} />
              <Line yAxisId="l" type="monotone" dataKey="diastolic" name="拡張期血圧(mmHg)" stroke="#fda4af" strokeWidth={1} strokeDasharray="3 3" dot={{ r: 2, fill: '#fda4af', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="栄養摂取（PFC）">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={nutritionData}>
            <CartesianGrid {...CHART.grid} />
            <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
            <YAxis {...CHART.axis} domain={['auto','auto']} />
            <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
            <Legend {...CHART.legend} />
            <Line type="monotone" dataKey="protein" name="タンパク質(g)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} />
            <Line type="monotone" dataKey="carb"    name="炭水化物(g)"  stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} />
            <Line type="monotone" dataKey="fat"     name="脂質(g)"      stroke="#f87171" strokeWidth={2} dot={{ r: 3, fill: '#f87171', strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Records table */}
      <Card title="記録一覧">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100">
                {['期間','体重\n(kg)','体脂肪率\n(%)','筋肉量\n(kg)','骨格筋量\n(kg)','BMI','基礎代謝\n(kcal)','水和率\n(%)','全身位相角\n(°)','安静時HR\n(bpm)','HRV\n(ms)','睡眠\n(h)','疲労感\n(/10)'].map(h => (
                  <th key={h} className="px-3 py-2.5 font-medium text-slate-400 whitespace-nowrap text-center">
                    {h.split('\n').map((line, i) => <div key={i} className={i===1?'text-slate-300 font-normal':''}>{line}</div>)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((dd, ri) => {
                const prevRow = ri < data.length - 1 ? [...data].reverse()[ri + 1] : undefined
                const vals = [dd.weight, dd.bodyFatPct, dd.muscleMass, dd.skeletalMuscleMass, dd.bmi, dd.bmr, dd.hydrationRate, dd.phaseAngleWhole, dd.hrResting, dd.hrv, dd.sleepHours, dd.fatigueLevel]
                const prevVals = prevRow ? [prevRow.weight, prevRow.bodyFatPct, prevRow.muscleMass, prevRow.skeletalMuscleMass, prevRow.bmi, prevRow.bmr, prevRow.hydrationRate, prevRow.phaseAngleWhole, prevRow.hrResting, prevRow.hrv, prevRow.sleepHours, prevRow.fatigueLevel] : null
                return (
                  <tr key={dd.date} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-blue-500 text-center">{formatPeriodLabel(dd.date, period)}</td>
                    {vals.map((v, i) => {
                      const pv = prevVals?.[i]
                      const diff = pv !== undefined ? +(v - pv).toFixed(1) : null
                      return (
                        <td key={i} className="px-3 py-2 text-center">
                          <span className="text-slate-700">{v}</span>
                          {diff !== null && diff !== 0 && (
                            <span className="text-xs font-bold ml-1" style={{ color: diff > 0 ? '#ef4444' : '#3b82f6' }}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ConditioningView({ data, period, player }: Props) {
  return period === 'session'
    ? <SessionSummary data={data} player={player} />
    : <TrendView data={data} period={period} />
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200">
      <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </div>
  )
}
