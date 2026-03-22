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

// ─── Card (Football BOX dark header style) ───────────────────────────────────
function Card({ title, children, noPad }: { title: string; children: React.ReactNode; noPad?: boolean }) {
  return (
    <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
      <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ddd' }}>{title}</p>
      </div>
      <div className={noPad ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  )
}

// ─── Section item — 3-column grid: label | value | delta ─────────────────────
function SectionItem({
  label, curr, prev, unit, decimals = 1,
}: { label: string; curr: number; prev: number | undefined; unit: string; decimals?: number }) {
  const diff   = prev !== undefined ? +(curr - prev).toFixed(decimals) : null
  const diffColor  = diff === null ? '#d1d5db' : diff > 0 ? '#dc2626' : diff < 0 ? '#2563eb' : '#9ca3af'
  const diffText   = diff === null ? '—' : diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0'
  return (
    <div className="border-b border-slate-100 last:border-0"
      style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '0 4px', padding: '3px 0' }}>
      {/* label */}
      <span style={{ fontSize: 10, fontWeight: 500, color: '#374151', lineHeight: 1.3 }}>{label}</span>
      {/* value + unit */}
      <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: '#111827', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {curr}<span style={{ fontSize: 9, fontWeight: 400, color: '#9ca3af', marginLeft: 1 }}>{unit}</span>
      </span>
      {/* delta — fixed width so column aligns across all rows */}
      <span className="tabular-nums" style={{ fontSize: 9, fontWeight: 700, color: diffColor, textAlign: 'right', width: 36, whiteSpace: 'nowrap' }}>
        {diffText}
      </span>
    </div>
  )
}

// ─── Session Summary ─────────────────────────────────────────────────────────
function SessionSummary({ data, player }: { data: ConditioningData[]; player: Player }) {
  const [idx, setIdx] = useState(data.length - 1)
  const d = data[idx]
  const p = idx > 0 ? data[idx - 1] : undefined

  const months = [...new Set(data.map(d => d.date.slice(0, 7)))].sort()
  const [selectedMonth, setSelectedMonth] = useState(data[data.length - 1].date.slice(0, 7))
  const monthSessions = data.map((dd, i) => ({ ...dd, idx: i })).filter(dd => dd.date.startsWith(selectedMonth))

  const topKpis = [
    { label: '体重',       curr: d.weight,             prev: p?.weight,             unit: 'kg',   accent: '#3b82f6', dec: 1 },
    { label: '体脂肪率',   curr: d.bodyFatPct,         prev: p?.bodyFatPct,         unit: '%',    accent: '#ef4444', dec: 1 },
    { label: '骨格筋量',   curr: d.skeletalMuscleMass, prev: p?.skeletalMuscleMass, unit: 'kg',   accent: '#10b981', dec: 1 },
    { label: '筋肉量',     curr: d.muscleMass,         prev: p?.muscleMass,         unit: 'kg',   accent: '#059669', dec: 1 },
    { label: '除脂肪量',   curr: d.leanBodyMass,       prev: p?.leanBodyMass,       unit: 'kg',   accent: '#0ea5e9', dec: 1 },
    { label: '体水分量',   curr: d.bodyWater,          prev: p?.bodyWater,          unit: 'L',    accent: '#06b6d4', dec: 1 },
    { label: '基礎代謝',   curr: d.bmr,                prev: p?.bmr,                unit: 'kcal', accent: '#8b5cf6', dec: 0 },
    { label: '水和率',     curr: d.hydrationRate,      prev: p?.hydrationRate,      unit: '%',    accent: '#0284c7', dec: 1 },
    { label: '全身位相角', curr: d.phaseAngleWhole,    prev: p?.phaseAngleWhole,    unit: '°',    accent: '#7c3aed', dec: 1 },
    { label: '安静時心拍', curr: d.hrResting,          prev: p?.hrResting,          unit: 'bpm',  accent: '#f43f5e', dec: 0 },
    { label: 'HRV',        curr: d.hrv,                prev: p?.hrv,                unit: 'ms',   accent: '#6366f1', dec: 1 },
  ]

  const sections = [
    {
      title: '体組成指標', color: '#3b82f6',
      items: [
        { label: '体重',     curr: d.weight,             prev: p?.weight,             unit: 'kg' },
        { label: 'BMI',      curr: d.bmi,                prev: p?.bmi,                unit: '',   decimals: 1 },
        { label: '体脂肪率', curr: d.bodyFatPct,         prev: p?.bodyFatPct,         unit: '%' },
        { label: '体脂肪量', curr: d.bodyFatMass,        prev: p?.bodyFatMass,        unit: 'kg' },
        { label: '筋肉量',   curr: d.muscleMass,         prev: p?.muscleMass,         unit: 'kg' },
        { label: '骨格筋量', curr: d.skeletalMuscleMass, prev: p?.skeletalMuscleMass, unit: 'kg' },
        { label: '除脂肪量', curr: d.leanBodyMass,       prev: p?.leanBodyMass,       unit: 'kg' },
      ],
    },
    {
      title: '体成分・細胞健康', color: '#0ea5e9',
      items: [
        { label: '体水分量',     curr: d.bodyWater,          prev: p?.bodyWater,          unit: 'L' },
        { label: '細胞内水分量', curr: d.intracellularWater, prev: p?.intracellularWater, unit: 'L' },
        { label: '細胞外水分量', curr: d.extracellularWater, prev: p?.extracellularWater, unit: 'L' },
        { label: 'タンパク質量', curr: d.protein,            prev: p?.protein,            unit: 'kg' },
        { label: 'ミネラル量',   curr: d.mineral,            prev: p?.mineral,            unit: 'kg', decimals: 2 },
        { label: '体細胞量',     curr: d.bodyCellMass,       prev: p?.bodyCellMass,       unit: 'kg' },
        { label: '骨ミネラル量', curr: d.boneMineralMass,    prev: p?.boneMineralMass,    unit: 'kg', decimals: 2 },
      ],
    },
    {
      title: '代謝・水分バランス', color: '#8b5cf6',
      items: [
        { label: '基礎代謝量',      curr: d.bmr,          prev: p?.bmr,          unit: 'kcal', decimals: 0 },
        { label: '水和率',          curr: d.hydrationRate, prev: p?.hydrationRate, unit: '%' },
        { label: '細胞外水分比',    curr: d.ecwRatio,     prev: p?.ecwRatio,     unit: '',     decimals: 3 },
        { label: '除脂肪指数',      curr: d.ffmi,         prev: p?.ffmi,         unit: '' },
        { label: '体脂肪指数',      curr: d.fmi,          prev: p?.fmi,          unit: '' },
        { label: 'ウエストヒップ比', curr: d.whr,         prev: p?.whr,          unit: '',     decimals: 2 },
        { label: '肥満度',          curr: d.obesityDegree, prev: p?.obesityDegree, unit: '%' },
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
      title: 'バイオメトリクス', color: '#ef4444',
      items: [
        { label: '安静時心拍数', curr: d.hrResting,  prev: p?.hrResting,  unit: 'bpm',  decimals: 0 },
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
      {/* 測定情報 (left) + 測定日選択 (right) */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '170px 1fr' }}>
        {/* Measurement info — left */}
        <div className="bg-white border border-slate-200 overflow-hidden flex flex-col" style={{ borderRadius: 0 }}>
          <div className="px-3 py-2" style={{ backgroundColor: '#1a1a1a' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ddd' }}>測定情報</p>
          </div>
          <div className="p-3 flex flex-col gap-2 flex-1">
            <div>
              <p className="text-[10px] text-slate-400">選手</p>
              <p className="text-xs font-bold text-slate-800">{player.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">測定日</p>
              <p className="text-xs font-bold text-slate-800">{d.date}</p>
            </div>
            {d.measureTime && (
              <div>
                <p className="text-[10px] text-slate-400">測定時間</p>
                <p className="text-xs font-bold text-slate-800">{d.measureTime}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-slate-400">測定回数</p>
              <p className="text-xs font-bold text-slate-800">#{idx + 1} / {data.length}</p>
            </div>
            {p && (
              <div>
                <p className="text-[10px] text-slate-400">前回測定</p>
                <p className="text-xs font-bold text-slate-800">{p.date}</p>
              </div>
            )}
            {p && (
              <p className="text-[10px] text-slate-400 mt-auto">
                前回比 <span className="text-red-400">▲増加</span> <span className="text-blue-400 ml-1">▼減少</span>
              </p>
            )}
          </div>
        </div>

        {/* Measurement selector — right */}
        <div className="bg-white border border-slate-200 overflow-hidden flex flex-col" style={{ borderRadius: 0 }}>
          <div className="px-3 py-2" style={{ backgroundColor: '#1a1a1a' }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ddd' }}>測定日選択</p>
          </div>
          <div className="p-3 flex flex-col flex-1">
            {/* Month tabs */}
            <div className="flex gap-1 flex-wrap mb-2">
              {months.map(m => {
                const monthNum = parseInt(m.slice(5))
                const isSel = selectedMonth === m
                return (
                  <button key={m} onClick={() => setSelectedMonth(m)}
                    className="px-4 py-1.5 text-sm font-bold border transition-all"
                    style={isSel
                      ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                      : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                    {monthNum}月
                  </button>
                )
              })}
            </div>
            {/* Day pills grid */}
            <div className="grid grid-cols-7 gap-1 overflow-y-auto flex-1" style={{ maxHeight: 110, scrollbarWidth: 'none' }}>
              {monthSessions.map(dd => {
                const selected = idx === dd.idx
                return (
                  <button key={dd.date} onClick={() => setIdx(dd.idx)}
                    className="flex items-center justify-center py-0.5 text-[9px] font-medium border transition-all"
                    style={selected
                      ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb', borderRadius: 3 }
                      : { color: '#6b7280', borderColor: '#e2e8f0', background: 'transparent', borderRadius: 3 }}>
                    {dd.date.slice(8)}日
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top KPI — table layout for aligned columns */}
      <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ddd' }}>主要指標</p>
        </div>
        <div className="overflow-x-auto p-3" style={{ scrollbarWidth: 'none' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', minWidth: topKpis.length * 72 }}>
            <thead>
              <tr>
                {topKpis.map(k => (
                  <th key={k.label} style={{ width: 72, padding: '0 4px 6px', textAlign: 'center', fontWeight: 'normal' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: k.accent, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{k.label}</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{k.unit}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Value row */}
              <tr style={{ borderTop: '1px solid #f1f5f9' }}>
                {topKpis.map(k => (
                  <td key={k.label} style={{ padding: '5px 4px 2px', textAlign: 'center' }}>
                    <span className="tabular-nums" style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                      {k.dec === 0 ? Math.round(k.curr).toLocaleString() : k.curr}
                    </span>
                  </td>
                ))}
              </tr>
              {/* Delta row */}
              <tr>
                {topKpis.map(k => {
                  const diff = k.prev !== undefined ? +(k.curr - k.prev).toFixed(k.dec) : null
                  const diffColor = diff === null ? '#d1d5db' : diff > 0 ? '#dc2626' : diff < 0 ? '#2563eb' : '#9ca3af'
                  const diffText = diff === null ? '—' : diff > 0 ? `▲+${diff}` : diff < 0 ? `▼${diff}` : '±0'
                  return (
                    <td key={k.label} style={{ padding: '0 4px 5px', textAlign: 'center' }}>
                      <span className="tabular-nums" style={{ fontSize: 10, fontWeight: 700, color: diffColor }}>{diffText}</span>
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail sections */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sections.map(sec => (
          <div key={sec.title} className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
            <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: '#1a1a1a' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sec.color }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ddd' }}>{sec.title}</p>
            </div>
            <div className="p-2.5">
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

      {/* ── 直近10回推移グラフ ── */}
      <RecentTrendCharts data={data} />
    </div>
  )
}

// ─── 直近10回推移グラフ ───────────────────────────────────────────────────────
function RecentTrendCharts({ data }: { data: ConditioningData[] }) {
  const recent = data.slice(-10)
  const fmt = (d: string) => `${parseInt(d.slice(5))}/${parseInt(d.slice(8))}`

  const miniChart = {
    grid: { stroke: '#f1f5f9', strokeDasharray: '3 3' },
    axis: { tick: { fill: '#6b7280', fontSize: 9 }, axisLine: false, tickLine: false },
    tooltip: {
      contentStyle: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      labelStyle: { color: '#111827', fontWeight: 600, marginBottom: 2 },
      itemStyle: { color: '#374151' },
      cursor: { stroke: '#e5e7eb' },
    },
    legend: { wrapperStyle: { fontSize: 10, color: '#374151' } },
  }

  const charts: {
    title: string
    color: string
    lines: { key: keyof ConditioningData; name: string; color: string; dashed?: boolean; yAxisId?: string }[]
    dualY?: boolean
    leftUnit?: string
    rightUnit?: string
  }[] = [
    {
      title: '体重', color: '#3b82f6',
      lines: [{ key: 'weight', name: '体重(kg)', color: '#3b82f6' }],
    },
    {
      title: '体脂肪率', color: '#ef4444',
      lines: [{ key: 'bodyFatPct', name: '体脂肪率(%)', color: '#ef4444' }],
    },
    {
      title: '筋肉量', color: '#10b981',
      lines: [{ key: 'muscleMass', name: '筋肉量(kg)', color: '#10b981' }],
    },
    {
      title: '体脂肪量', color: '#f97316',
      lines: [{ key: 'bodyFatMass', name: '体脂肪量(kg)', color: '#f97316' }],
    },
    {
      title: '左右足筋肉量', color: '#059669',
      lines: [
        { key: 'muscleRightLeg', name: '右脚(kg)', color: '#059669' },
        { key: 'muscleLeftLeg',  name: '左脚(kg)', color: '#34d399', dashed: true },
      ],
    },
    {
      title: '体水分量・ミネラル量', color: '#0ea5e9',
      dualY: true, leftUnit: 'L', rightUnit: 'kg',
      lines: [
        { key: 'bodyWater', name: '体水分量(L)', color: '#0ea5e9', yAxisId: 'l' },
        { key: 'mineral',   name: 'ミネラル量(kg)', color: '#f59e0b', dashed: true, yAxisId: 'r' },
      ],
    },
    {
      title: '全身位相角', color: '#7c3aed',
      lines: [{ key: 'phaseAngleWhole', name: '全身位相角(°)', color: '#7c3aed' }],
    },
    {
      title: '左右足位相角', color: '#8b5cf6',
      lines: [
        { key: 'phaseAngleRightLeg', name: '右脚(°)', color: '#8b5cf6' },
        { key: 'phaseAngleLeftLeg',  name: '左脚(°)', color: '#c4b5fd', dashed: true },
      ],
    },
  ]

  return (
    <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
      <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ddd' }}>直近10回 推移グラフ</p>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {charts.map(ch => (
          <div key={ch.title} className="border border-slate-100 overflow-hidden" style={{ borderRadius: 0 }}>
            <div className="px-2.5 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: '#222' }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ch.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#ccc' }}>{ch.title}</span>
            </div>
            <div className="p-1">
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={recent} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid {...miniChart.grid} />
                  <XAxis dataKey="date" tickFormatter={fmt} {...miniChart.axis} interval="preserveStartEnd" />
                  {ch.dualY ? (
                    <>
                      <YAxis yAxisId="l" {...miniChart.axis} domain={AUTO_Y.domain} width={36} />
                      <YAxis yAxisId="r" orientation="right" {...miniChart.axis} domain={AUTO_Y.domain} width={28} />
                    </>
                  ) : (
                    <YAxis {...miniChart.axis} domain={AUTO_Y.domain} width={36} />
                  )}
                  <Tooltip {...miniChart.tooltip} labelFormatter={l => String(l)} />
                  {ch.lines.length > 1 && <Legend {...miniChart.legend} />}
                  {ch.lines.map(ln => (
                    <Line
                      key={String(ln.key)}
                      type="monotone"
                      dataKey={ln.key as string}
                      name={ln.name}
                      stroke={ln.color}
                      strokeWidth={ln.dashed ? 1.5 : 2}
                      strokeDasharray={ln.dashed ? '4 3' : undefined}
                      dot={{ r: 2.5, fill: ln.color, strokeWidth: 0 }}
                      activeDot={{ r: 4 }}
                      yAxisId={ch.dualY ? (ln.yAxisId ?? 'l') : undefined}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Trend View ──────────────────────────────────────────────────────────────
function TrendView({ data, period, player }: { data: ConditioningData[]; period: Period; player: Player }) {
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
  const bioData = data.map(d => ({
    date: d.date, hrResting: d.hrResting, hrv: d.hrv,
    systolic: d.systolicBP, diastolic: d.diastolicBP,
  }))
  const nutritionData = data.map(d => ({
    date: d.date, protein: d.proteinIntake, carb: d.carbIntake, fat: d.fatIntakeG,
  }))

  return (
    <div className="space-y-4">
      {/* Summary KPI cards — narrow, one row, delta below value */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {[
          { label: '体重',       curr: latest.weight,             prev: prev?.weight,             unit: 'kg',   accent: '#3b82f6' },
          { label: '体脂肪率',   curr: latest.bodyFatPct,         prev: prev?.bodyFatPct,         unit: '%',    accent: '#ef4444' },
          { label: '骨格筋量',   curr: latest.skeletalMuscleMass, prev: prev?.skeletalMuscleMass, unit: 'kg',   accent: '#10b981' },
          { label: '全身位相角', curr: latest.phaseAngleWhole,    prev: prev?.phaseAngleWhole,    unit: '°',    accent: '#8b5cf6' },
          { label: '安静時心拍', curr: latest.hrResting,          prev: prev?.hrResting,          unit: 'bpm',  accent: '#f43f5e' },
          { label: 'HRV',        curr: latest.hrv,                prev: prev?.hrv,                unit: 'ms',   accent: '#6366f1' },
        ].map(k => {
          const diff = k.prev !== undefined ? +(k.curr - k.prev).toFixed(1) : null
          const diffColor = diff === null || diff === 0 ? undefined : diff > 0 ? '#dc2626' : '#2563eb'
          return (
            <div key={k.label} className="bg-white border border-slate-200 overflow-hidden flex-shrink-0" style={{ borderRadius: 0, minWidth: 90 }}>
              <div className="px-2 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: k.accent }} />
                <p className="text-[9px] font-bold uppercase tracking-widest truncate" style={{ color: '#aaa' }}>{k.label}</p>
              </div>
              <div className="px-2.5 py-2 text-center">
                <p className="text-lg font-bold leading-none" style={{ color: '#111827' }}>
                  {k.curr}
                </p>
                <p className="text-[10px] text-slate-400 mb-1">{k.unit}</p>
                {diff !== null && diff !== 0 ? (
                  <p className="text-xs font-bold" style={{ color: diffColor }}>
                    {diff > 0 ? `▲+${diff}` : `▼${diff}`}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-300">—</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="体重 / 体脂肪率">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis yAxisId="l" {...CHART.axis} {...AUTO_Y} />
              <YAxis yAxisId="r" orientation="right" {...CHART.axis} {...AUTO_Y} />
              <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line yAxisId="l" type="monotone" dataKey="weight"     name="体重(kg)"    stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line yAxisId="r" type="monotone" dataKey="bodyFatPct" name="体脂肪率(%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="筋肉量">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis {...CHART.axis} {...AUTO_Y} />
              <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line type="monotone" dataKey="muscleMass"         name="筋肉量(kg)"  stroke="#10b981" strokeWidth={2}   dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="skeletalMuscleMass" name="骨格筋量(kg)" stroke="#059669" strokeWidth={2}   dot={{ r: 3, fill: '#059669', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="leanBodyMass"       name="除脂肪量(kg)" stroke="#6ee7b7" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2, fill: '#6ee7b7', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="部位別筋肉量 / 発達率（最新）">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bodyPartData} barGap={3}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="part" {...CHART.axis} />
              <YAxis yAxisId="l" {...CHART.axis} />
              <YAxis yAxisId="r" orientation="right" {...CHART.axis} domain={[80, 130]} />
              <Tooltip {...CHART.tooltip} />
              <Legend {...CHART.legend} />
              <Bar yAxisId="l" dataKey="kg"  name="筋肉量(kg)" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={12} />
              <Bar yAxisId="r" dataKey="dev" name="発達率(%)"  fill="#10b981" radius={[3, 3, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="コンディションサマリー（最新）">
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="s" tick={{ fill: '#374151', fontSize: 10 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar dataKey="v" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="水分バランス">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis yAxisId="l" {...CHART.axis} {...AUTO_Y} />
              <YAxis yAxisId="r" orientation="right" {...CHART.axis} {...AUTO_Y} />
              <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line yAxisId="l" type="monotone" dataKey="intracellularWater" name="細胞内水分(L)" stroke="#0ea5e9" strokeWidth={2}   dot={{ r: 3, fill: '#0ea5e9', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line yAxisId="l" type="monotone" dataKey="extracellularWater" name="細胞外水分(L)" stroke="#7dd3fc" strokeWidth={2}   dot={{ r: 3, fill: '#7dd3fc', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line yAxisId="r" type="monotone" dataKey="hydrationRate"      name="水和率(%)"    stroke="#0284c7" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2, fill: '#0284c7', strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="部位別位相角（最新）50kHz">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={phaseData} barSize={18}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="part" {...CHART.axis} />
              <YAxis {...CHART.axis} domain={[0, 12]} />
              <Tooltip {...CHART.tooltip} formatter={(v) => [`${Number(v).toFixed(1)}°`]} />
              <Bar dataKey="v" name="位相角(°)" fill="#8b5cf6" radius={[3, 3, 0, 0]} background={{ fill: '#f8fafc', radius: 3 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="心拍数 / HRV">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bioData}>
              <CartesianGrid {...CHART.grid} />
              <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
              <YAxis yAxisId="l" {...CHART.axis} {...AUTO_Y} />
              <YAxis yAxisId="r" orientation="right" {...CHART.axis} {...AUTO_Y} />
              <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
              <Legend {...CHART.legend} />
              <Line yAxisId="l" type="monotone" dataKey="hrResting" name="安静時心拍(bpm)"  stroke="#ef4444" strokeWidth={2}   dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line yAxisId="r" type="monotone" dataKey="hrv"       name="HRV(ms)"          stroke="#6366f1" strokeWidth={2}   dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Line yAxisId="l" type="monotone" dataKey="systolic"  name="収縮期血圧(mmHg)" stroke="#fb7185" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2, fill: '#fb7185', strokeWidth: 0 }} />
              <Line yAxisId="l" type="monotone" dataKey="diastolic" name="拡張期血圧(mmHg)" stroke="#fda4af" strokeWidth={1}   strokeDasharray="3 3" dot={{ r: 2, fill: '#fda4af', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="栄養摂取（PFC）">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={nutritionData}>
            <CartesianGrid {...CHART.grid} />
            <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
            <YAxis {...CHART.axis} {...AUTO_Y} />
            <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
            <Legend {...CHART.legend} />
            <Line type="monotone" dataKey="protein" name="タンパク質(g)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="carb"    name="炭水化物(g)"  stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="fat"     name="脂質(g)"      stroke="#f87171" strokeWidth={2} dot={{ r: 3, fill: '#f87171', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Records table */}
      <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ddd' }}>記録一覧</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr style={{ backgroundColor: '#111', borderBottom: '1px solid #333' }}>
                {[
                  { h1: '期間',     h2: '' },
                  { h1: '体重',     h2: '(kg)' },
                  { h1: '体脂肪率', h2: '(%)' },
                  { h1: '筋肉量',   h2: '(kg)' },
                  { h1: '骨格筋量', h2: '(kg)' },
                  { h1: 'BMI',      h2: '' },
                  { h1: '基礎代謝', h2: '(kcal)' },
                  { h1: '水和率',   h2: '(%)' },
                  { h1: '全身',     h2: '位相角(°)' },
                  { h1: '安静HR',   h2: '(bpm)' },
                  { h1: 'HRV',      h2: '(ms)' },
                ].map((col, i) => (
                  <th key={i} className="px-2 py-2 font-bold text-center whitespace-nowrap" style={{ color: '#bbb', fontSize: 10 }}>
                    <div>{col.h1}</div>
                    {col.h2 && <div style={{ color: '#666', fontWeight: 400 }}>{col.h2}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((dd, ri) => {
                const prevRow = ri < data.length - 1 ? [...data].reverse()[ri + 1] : undefined
                const vals = [dd.weight, dd.bodyFatPct, dd.muscleMass, dd.skeletalMuscleMass, dd.bmi, dd.bmr, dd.hydrationRate, dd.phaseAngleWhole, dd.hrResting, dd.hrv]
                const prevVals = prevRow ? [prevRow.weight, prevRow.bodyFatPct, prevRow.muscleMass, prevRow.skeletalMuscleMass, prevRow.bmi, prevRow.bmr, prevRow.hydrationRate, prevRow.phaseAngleWhole, prevRow.hrResting, prevRow.hrv] : null
                return (
                  <tr key={dd.date} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-2 font-semibold text-center whitespace-nowrap" style={{ color: '#2563eb', fontSize: 11 }}>
                      {formatPeriodLabel(dd.date, period)}
                    </td>
                    {vals.map((v, i) => {
                      const pv = prevVals?.[i]
                      const diff = pv !== undefined ? +(v - pv).toFixed(1) : null
                      return (
                        <td key={i} className="px-2 py-2 text-center">
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
      </div>

      {/* Player name for trend view */}
      <div className="text-right text-xs text-slate-400">{player.name}</div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ConditioningView({ data, period, player }: Props) {
  return period === 'session'
    ? <SessionSummary data={data} player={player} />
    : <TrendView data={data} period={period} player={player} />
}
