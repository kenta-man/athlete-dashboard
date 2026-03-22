import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
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
                <LineChart data={recent} margin={{ top: 8, right: ch.dualY ? 4 : 8, left: -4, bottom: 0 }}>
                  <CartesianGrid {...miniChart.grid} />
                  <XAxis dataKey="date" tickFormatter={fmt} {...miniChart.axis} interval="preserveStartEnd" />
                  {ch.dualY ? (
                    <>
                      <YAxis yAxisId="l" {...miniChart.axis} domain={AUTO_Y.domain} width={32} tickCount={4} tickFormatter={(v: number) => v % 1 === 0 ? String(v) : v.toFixed(1)} />
                      <YAxis yAxisId="r" orientation="right" {...miniChart.axis} domain={AUTO_Y.domain} width={30} tickCount={4} tickFormatter={(v: number) => v % 1 === 0 ? String(v) : v.toFixed(2)} />
                    </>
                  ) : (
                    <YAxis {...miniChart.axis} domain={AUTO_Y.domain} width={32} tickCount={4} tickFormatter={(v: number) => v % 1 === 0 ? String(v) : v.toFixed(1)} />
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
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const fmt = (k: string) => formatPeriodLabel(k, period)
  const latest = data[data.length - 1]
  const prev   = data.length > 1 ? data[data.length - 2] : undefined

  // ── KPI cards (same 11 as session) ─────────────────────────────────────────
  const topKpis = [
    { label: '体重',       curr: latest.weight,             prev: prev?.weight,             unit: 'kg',   accent: '#3b82f6', dec: 1 },
    { label: '体脂肪率',   curr: latest.bodyFatPct,         prev: prev?.bodyFatPct,         unit: '%',    accent: '#ef4444', dec: 1 },
    { label: '骨格筋量',   curr: latest.skeletalMuscleMass, prev: prev?.skeletalMuscleMass, unit: 'kg',   accent: '#10b981', dec: 1 },
    { label: '筋肉量',     curr: latest.muscleMass,         prev: prev?.muscleMass,         unit: 'kg',   accent: '#059669', dec: 1 },
    { label: '除脂肪量',   curr: latest.leanBodyMass,       prev: prev?.leanBodyMass,       unit: 'kg',   accent: '#0ea5e9', dec: 1 },
    { label: '体水分量',   curr: latest.bodyWater,          prev: prev?.bodyWater,          unit: 'L',    accent: '#06b6d4', dec: 1 },
    { label: '基礎代謝',   curr: latest.bmr,                prev: prev?.bmr,                unit: 'kcal', accent: '#8b5cf6', dec: 0 },
    { label: '水和率',     curr: latest.hydrationRate,      prev: prev?.hydrationRate,      unit: '%',    accent: '#0284c7', dec: 1 },
    { label: '全身位相角', curr: latest.phaseAngleWhole,    prev: prev?.phaseAngleWhole,    unit: '°',    accent: '#7c3aed', dec: 1 },
    { label: '安静時心拍', curr: latest.hrResting,          prev: prev?.hrResting,          unit: 'bpm',  accent: '#f43f5e', dec: 0 },
    { label: 'HRV',        curr: latest.hrv,                prev: prev?.hrv,                unit: 'ms',   accent: '#6366f1', dec: 1 },
  ]

  // ── 8 trend charts ──────────────────────────────────────────────────────────
  type TrendLine = { key: keyof ConditioningData; name: string; color: string; dashed?: boolean; yAxisId?: string }
  const trendCharts: { title: string; color: string; lines: TrendLine[]; dualY?: boolean }[] = [
    { title: '体重',              color: '#3b82f6', lines: [{ key: 'weight',             name: '体重(kg)',       color: '#3b82f6' }] },
    { title: '体脂肪率',          color: '#ef4444', lines: [{ key: 'bodyFatPct',          name: '体脂肪率(%)',    color: '#ef4444' }] },
    { title: '筋肉量',            color: '#10b981', lines: [{ key: 'muscleMass',          name: '筋肉量(kg)',     color: '#10b981' }] },
    { title: '体脂肪量',          color: '#f97316', lines: [{ key: 'bodyFatMass',         name: '体脂肪量(kg)',   color: '#f97316' }] },
    { title: '左右足筋肉量',      color: '#059669', lines: [
      { key: 'muscleRightLeg', name: '右脚(kg)', color: '#059669' },
      { key: 'muscleLeftLeg',  name: '左脚(kg)', color: '#34d399', dashed: true },
    ]},
    { title: '体水分量・ミネラル量', color: '#0ea5e9', dualY: true, lines: [
      { key: 'bodyWater', name: '体水分量(L)',    color: '#0ea5e9', yAxisId: 'l' },
      { key: 'mineral',   name: 'ミネラル量(kg)', color: '#f59e0b', dashed: true, yAxisId: 'r' },
    ]},
    { title: '全身位相角',        color: '#7c3aed', lines: [{ key: 'phaseAngleWhole',     name: '全身位相角(°)', color: '#7c3aed' }] },
    { title: '左右足位相角',      color: '#8b5cf6', lines: [
      { key: 'phaseAngleRightLeg', name: '右脚(°)', color: '#8b5cf6' },
      { key: 'phaseAngleLeftLeg',  name: '左脚(°)', color: '#c4b5fd', dashed: true },
    ]},
  ]

  // ── All metrics grouped ─────────────────────────────────────────────────────
  type MetricDef = { key: keyof ConditioningData; label: string; unit: string; color: string }
  const allMetricGroups: { title: string; color: string; metrics: MetricDef[] }[] = [
    { title: '体組成指標', color: '#3b82f6', metrics: [
      { key: 'weight',             label: '体重',     unit: 'kg', color: '#3b82f6' },
      { key: 'bmi',                label: 'BMI',      unit: '',   color: '#93c5fd' },
      { key: 'bodyFatPct',         label: '体脂肪率', unit: '%',  color: '#ef4444' },
      { key: 'bodyFatMass',        label: '体脂肪量', unit: 'kg', color: '#fca5a5' },
      { key: 'muscleMass',         label: '筋肉量',   unit: 'kg', color: '#10b981' },
      { key: 'skeletalMuscleMass', label: '骨格筋量', unit: 'kg', color: '#059669' },
      { key: 'leanBodyMass',       label: '除脂肪量', unit: 'kg', color: '#0ea5e9' },
    ]},
    { title: '体成分・細胞健康', color: '#0ea5e9', metrics: [
      { key: 'bodyWater',          label: '体水分量',     unit: 'L',  color: '#0ea5e9' },
      { key: 'intracellularWater', label: '細胞内水分量', unit: 'L',  color: '#38bdf8' },
      { key: 'extracellularWater', label: '細胞外水分量', unit: 'L',  color: '#7dd3fc' },
      { key: 'protein',            label: 'タンパク質量', unit: 'kg', color: '#a78bfa' },
      { key: 'mineral',            label: 'ミネラル量',   unit: 'kg', color: '#f59e0b' },
      { key: 'bodyCellMass',       label: '体細胞量',     unit: 'kg', color: '#34d399' },
      { key: 'boneMineralMass',    label: '骨ミネラル量', unit: 'kg', color: '#fbbf24' },
    ]},
    { title: '代謝・水分バランス', color: '#8b5cf6', metrics: [
      { key: 'bmr',          label: '基礎代謝量',      unit: 'kcal', color: '#8b5cf6' },
      { key: 'hydrationRate', label: '水和率',         unit: '%',    color: '#0284c7' },
      { key: 'ecwRatio',     label: '細胞外水分比',    unit: '',     color: '#818cf8' },
      { key: 'ffmi',         label: '除脂肪指数',      unit: '',     color: '#6366f1' },
      { key: 'fmi',          label: '体脂肪指数',      unit: '',     color: '#f87171' },
      { key: 'whr',          label: 'ウエストヒップ比', unit: '',    color: '#fb923c' },
    ]},
    { title: '部位別筋肉量', color: '#10b981', metrics: [
      { key: 'muscleRightArm', label: '右腕', unit: 'kg', color: '#10b981' },
      { key: 'muscleLeftArm',  label: '左腕', unit: 'kg', color: '#34d399' },
      { key: 'muscleTrunk',    label: '体幹', unit: 'kg', color: '#059669' },
      { key: 'muscleRightLeg', label: '右脚', unit: 'kg', color: '#6ee7b7' },
      { key: 'muscleLeftLeg',  label: '左脚', unit: 'kg', color: '#a7f3d0' },
    ]},
    { title: '部位別発達率', color: '#059669', metrics: [
      { key: 'devRightArm', label: '右腕', unit: '%', color: '#059669' },
      { key: 'devLeftArm',  label: '左腕', unit: '%', color: '#10b981' },
      { key: 'devTrunk',    label: '体幹', unit: '%', color: '#047857' },
      { key: 'devRightLeg', label: '右脚', unit: '%', color: '#34d399' },
      { key: 'devLeftLeg',  label: '左脚', unit: '%', color: '#6ee7b7' },
    ]},
    { title: '位相角（50kHz）', color: '#7c3aed', metrics: [
      { key: 'phaseAngleRightArm', label: '右腕', unit: '°', color: '#7c3aed' },
      { key: 'phaseAngleLeftArm',  label: '左腕', unit: '°', color: '#8b5cf6' },
      { key: 'phaseAngleTrunk',    label: '体幹', unit: '°', color: '#6d28d9' },
      { key: 'phaseAngleRightLeg', label: '右脚', unit: '°', color: '#a78bfa' },
      { key: 'phaseAngleLeftLeg',  label: '左脚', unit: '°', color: '#c4b5fd' },
      { key: 'phaseAngleWhole',    label: '全身', unit: '°', color: '#5b21b6' },
    ]},
    { title: '身体周囲径', color: '#f59e0b', metrics: [
      { key: 'circumNeck',       label: '首',       unit: 'cm', color: '#f59e0b' },
      { key: 'circumChest',      label: '胸部',     unit: 'cm', color: '#fbbf24' },
      { key: 'circumAbdomen',    label: '腹部',     unit: 'cm', color: '#d97706' },
      { key: 'circumHip',        label: '臀部',     unit: 'cm', color: '#f97316' },
      { key: 'circumRightArm',   label: '右腕',     unit: 'cm', color: '#fb923c' },
      { key: 'circumLeftArm',    label: '左腕',     unit: 'cm', color: '#fdba74' },
      { key: 'circumRightThigh', label: '右太もも', unit: 'cm', color: '#c2410c' },
      { key: 'circumLeftThigh',  label: '左太もも', unit: 'cm', color: '#ea580c' },
    ]},
    { title: 'バイオメトリクス', color: '#ef4444', metrics: [
      { key: 'hrResting',  label: '安静時心拍数', unit: 'bpm',  color: '#ef4444' },
      { key: 'hrv',        label: 'HRV',          unit: 'ms',   color: '#6366f1' },
      { key: 'systolicBP', label: '収縮期血圧',   unit: 'mmHg', color: '#fb7185' },
      { key: 'diastolicBP', label: '拡張期血圧',  unit: 'mmHg', color: '#fda4af' },
    ]},
    { title: '栄養摂取', color: '#f97316', metrics: [
      { key: 'calorieIntake', label: 'カロリー',   unit: 'kcal', color: '#f97316' },
      { key: 'proteinIntake', label: 'タンパク質', unit: 'g',    color: '#3b82f6' },
      { key: 'carbIntake',    label: '炭水化物',   unit: 'g',    color: '#f59e0b' },
      { key: 'fatIntakeG',    label: '脂質',       unit: 'g',    color: '#f87171' },
      { key: 'waterIntake',   label: '水分摂取',   unit: 'L',    color: '#0ea5e9' },
    ]},
  ]
  const flatMetrics = allMetricGroups.flatMap(g => g.metrics)
  const selDef = flatMetrics.find(m => String(m.key) === selectedMetric)

  const miniChart = {
    grid: { stroke: '#f1f5f9', strokeDasharray: '3 3' },
    axis: { tick: { fill: '#6b7280', fontSize: 9 }, axisLine: false as const, tickLine: false as const },
    tooltip: {
      contentStyle: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      labelStyle: { color: '#111827', fontWeight: 600, marginBottom: 2 },
      itemStyle: { color: '#374151' },
      cursor: { stroke: '#e5e7eb' },
    },
    legend: { wrapperStyle: { fontSize: 10, color: '#374151' } },
  }

  const tableHeaders = [
    { h1: '期間',     h2: '' },        { h1: '体重',     h2: '(kg)' },
    { h1: '体脂肪率', h2: '(%)' },    { h1: '筋肉量',   h2: '(kg)' },
    { h1: '骨格筋量', h2: '(kg)' },   { h1: 'BMI',      h2: '' },
    { h1: '基礎代謝', h2: '(kcal)' }, { h1: '水和率',   h2: '(%)' },
    { h1: '全身',     h2: '位相角(°)' }, { h1: '安静HR', h2: '(bpm)' },
    { h1: 'HRV',      h2: '(ms)' },
  ]

  return (
    <div className="space-y-4">
      {/* ── KPI cards ── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {topKpis.map(k => {
          const diff = k.prev !== undefined ? +(k.curr - k.prev).toFixed(k.dec) : null
          const diffColor = diff === null || diff === 0 ? undefined : diff > 0 ? '#dc2626' : '#2563eb'
          return (
            <div key={k.label} className="bg-white border border-slate-200 overflow-hidden flex-shrink-0" style={{ borderRadius: 0, minWidth: 88 }}>
              <div className="px-2 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: '#1a1a1a' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: k.accent }} />
                <p className="text-[9px] font-bold uppercase tracking-widest truncate" style={{ color: '#aaa' }}>{k.label}</p>
              </div>
              <div className="px-2.5 py-2 text-center">
                <p className="text-lg font-bold leading-none" style={{ color: '#111827' }}>
                  {k.dec === 0 ? Math.round(k.curr).toLocaleString() : k.curr}
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

      {/* ── 8 trend charts ── */}
      <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ddd' }}>推移グラフ</p>
        </div>
        <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {trendCharts.map(ch => (
            <div key={ch.title} className="border border-slate-100 overflow-hidden" style={{ borderRadius: 0 }}>
              <div className="px-2.5 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: '#222' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ch.color }} />
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#ccc' }}>{ch.title}</span>
              </div>
              <div className="p-1">
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={data} margin={{ top: 8, right: ch.dualY ? 4 : 8, left: -4, bottom: 0 }}>
                    <CartesianGrid {...miniChart.grid} />
                    <XAxis dataKey="date" tickFormatter={fmt} {...miniChart.axis} interval="preserveStartEnd" />
                    {ch.dualY ? (
                      <>
                        <YAxis yAxisId="l" {...miniChart.axis} domain={AUTO_Y.domain} width={32} tickCount={4} tickFormatter={(v: number) => v % 1 === 0 ? String(v) : v.toFixed(1)} />
                        <YAxis yAxisId="r" orientation="right" {...miniChart.axis} domain={AUTO_Y.domain} width={30} tickCount={4} tickFormatter={(v: number) => v % 1 === 0 ? String(v) : v.toFixed(2)} />
                      </>
                    ) : (
                      <YAxis {...miniChart.axis} domain={AUTO_Y.domain} width={32} tickCount={4} tickFormatter={(v: number) => v % 1 === 0 ? String(v) : v.toFixed(1)} />
                    )}
                    <Tooltip {...miniChart.tooltip} labelFormatter={l => formatPeriodLabel(l, period)} />
                    {ch.lines.length > 1 && <Legend {...miniChart.legend} />}
                    {ch.lines.map(ln => (
                      <Line key={String(ln.key)} type="monotone" dataKey={ln.key as string} name={ln.name}
                        stroke={ln.color} strokeWidth={ln.dashed ? 1.5 : 2}
                        strokeDasharray={ln.dashed ? '4 3' : undefined}
                        dot={{ r: 2, fill: ln.color, strokeWidth: 0 }} activeDot={{ r: 4 }}
                        yAxisId={ch.dualY ? (ln.yAxisId ?? 'l') : undefined} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 全項目グラフ ── */}
      <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ddd' }}>全項目グラフ</p>
        </div>
        <div className="p-3 space-y-2.5">
          {allMetricGroups.map(group => (
            <div key={group.title}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280' }}>{group.title}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.metrics.map(m => (
                  <button key={String(m.key)}
                    onClick={() => setSelectedMetric(selectedMetric === String(m.key) ? null : String(m.key))}
                    className="border transition-all"
                    style={{
                      fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 3,
                      ...(selectedMetric === String(m.key)
                        ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb' }
                        : { color: '#374151', borderColor: '#e2e8f0', background: 'transparent' }),
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {selectedMetric && selDef && (
            <div className="mt-2 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selDef.color }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                  {selDef.label}{selDef.unit ? ` (${selDef.unit})` : ''}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid {...CHART.grid} />
                  <XAxis dataKey="date" tickFormatter={fmt} {...CHART.axis} />
                  <YAxis {...CHART.axis} {...AUTO_Y} tickCount={5}
                    tickFormatter={(v: number) => v % 1 === 0 ? v.toLocaleString() : v.toFixed(1)} />
                  <Tooltip {...CHART.tooltip} labelFormatter={l => formatPeriodLabel(l, period)}
                    formatter={(v) => [`${Number(v)}${selDef.unit ? ` ${selDef.unit}` : ''}`]} />
                  <Line type="monotone" dataKey={selectedMetric}
                    name={`${selDef.label}${selDef.unit ? `(${selDef.unit})` : ''}`}
                    stroke={selDef.color} strokeWidth={2}
                    dot={{ r: 3, fill: selDef.color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Records table (no delta) ── */}
      <div className="bg-white border border-slate-200 overflow-hidden" style={{ borderRadius: 0 }}>
        <div className="px-4 py-2" style={{ backgroundColor: '#1a1a1a' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ddd' }}>記録一覧</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr style={{ backgroundColor: '#111', borderBottom: '1px solid #333' }}>
                {tableHeaders.map((col, i) => (
                  <th key={i} className="px-2 py-2 font-bold text-center whitespace-nowrap" style={{ color: '#bbb', fontSize: 10 }}>
                    <div>{col.h1}</div>
                    {col.h2 && <div style={{ color: '#666', fontWeight: 400 }}>{col.h2}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map(dd => {
                const vals = [dd.weight, dd.bodyFatPct, dd.muscleMass, dd.skeletalMuscleMass, dd.bmi, dd.bmr, dd.hydrationRate, dd.phaseAngleWhole, dd.hrResting, dd.hrv]
                return (
                  <tr key={dd.date} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-2 py-2 font-semibold text-center whitespace-nowrap" style={{ color: '#2563eb', fontSize: 11 }}>
                      {formatPeriodLabel(dd.date, period)}
                    </td>
                    {vals.map((v, i) => (
                      <td key={i} className="px-2 py-2 text-center tabular-nums" style={{ color: '#374151' }}>{v}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

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
