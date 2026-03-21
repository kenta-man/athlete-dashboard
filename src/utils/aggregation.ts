import type { GpsData, ConditioningData } from '../data/sampleData'

export type Period = 'session' | 'daily' | 'weekly' | 'monthly'

function isoWeek(dateStr: string): number {
  const d = new Date(dateStr)
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7))
  const y1 = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  return Math.ceil((((utc.getTime() - y1.getTime()) / 86400000) + 1) / 7)
}

export function getPeriodKey(dateStr: string, period: Period): string {
  if (period === 'session' || period === 'daily') return dateStr
  if (period === 'weekly') {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-W${String(isoWeek(dateStr)).padStart(2, '0')}`
  }
  return dateStr.slice(0, 7)
}

export function formatPeriodLabel(key: string, period: Period): string {
  if (period === 'session' || period === 'daily') return key.slice(5).replace('-', '/')
  if (period === 'weekly') return key.slice(5) // "W02"
  return `${parseInt(key.slice(5))}月`
}

const GPS_SUM: (keyof GpsData)[] = [
  'totalDistance', 'dist_0_7', 'dist_7_15', 'dist_15_20', 'dist_20_25', 'dist_25plus',
  'count_15_20', 'count_20_25', 'count_25plus',
  'accel_3ms2', 'decel_3ms2', 'accel_2ms3', 'decel_2ms3', 'explosiveEfforts',
]
const GPS_AVG: (keyof GpsData)[] = [
  'distancePerMinute', 'ratio_0_7', 'ratio_7_15', 'ratio_15_20', 'ratio_20_25', 'running',
]

function groupBy<T extends { date: string }>(data: T[], period: Period): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const d of data) {
    const key = getPeriodKey(d.date, period)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(d)
  }
  return groups
}

export function aggregateGpsData(data: GpsData[], period: Period): GpsData[] {
  if (period === 'session') return data
  const groups = groupBy(data, period)
  const useAvg = period === 'weekly' || period === 'monthly'
  return Array.from(groups.entries()).map(([key, items]) => {
    const n = items.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = { date: key, sessionsInPeriod: n }
    for (const f of GPS_SUM) {
      const sum = items.reduce((s, d) => s + (d[f] as number), 0)
      r[f] = Math.round(useAvg ? sum / n : sum)
    }
    for (const f of GPS_AVG) r[f] = +(items.reduce((s, d) => s + (d[f] as number), 0) / n).toFixed(1)
    r.maxSpeed = +Math.max(...items.map(d => d.maxSpeed)).toFixed(1)
    r.sessionType = items.some(d => d.sessionType === 'match') ? 'match' : 'training'
    return r as GpsData
  })
}

export function aggregateCondData(data: ConditioningData[], period: Period): ConditioningData[] {
  if (period === 'session') return data
  const groups = groupBy(data, period)
  return Array.from(groups.entries()).map(([key, items]) => {
    const n = items.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = { date: key }
    for (const f of Object.keys(items[0]).filter(k => k !== 'date') as (keyof ConditioningData)[]) {
      r[f] = +( items.reduce((s, d) => s + (d[f] as number), 0) / n).toFixed(2)
    }
    return r as ConditioningData
  })
}

export const PERIOD_LABELS: Record<Period, string> = {
  session: 'セッション',
  daily:   '日別',
  weekly:  '週別',
  monthly: '月別',
}
