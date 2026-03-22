export interface Player {
  id: string; name: string; position: string; photo: string
  dob: string; age: number; heightCm: number
  gpsData: GpsData[]; conditioningData: ConditioningData[]
}
export interface GpsData {
  date: string
  sessionType: 'training' | 'match'
  startTime?: string
  opponent?: string        // 試合の場合：対戦相手
  venue?: string           // 試合の場合：会場（H=ホーム / A=アウェイ）
  score?: string           // 試合の場合：スコア
  weather?: string         // 試合の場合：天候
  attendance?: number      // 試合の場合：入場者数
  isStarter?: boolean      // 試合の場合：スタメンか否か
  totalDistance: number; distancePerMinute: number
  dist_0_7: number; dist_7_15: number; dist_15_20: number; dist_20_25: number; dist_25plus: number
  ratio_0_7: number; ratio_7_15: number; ratio_15_20: number; ratio_20_25: number
  count_15_20: number; count_20_25: number; count_25plus: number
  maxSpeed: number
  accel_3ms2: number; decel_3ms2: number; accel_2ms3: number; decel_2ms3: number
  explosiveEfforts: number; running: number
}
export interface ConditioningData {
  date: string; measureTime?: string; height: number; weight: number; bmi: number
  bodyFatPct: number; bodyFatMass: number; muscleMass: number
  skeletalMuscleMass: number; leanBodyMass: number
  bodyWater: number; intracellularWater: number; extracellularWater: number
  protein: number; mineral: number; bodyCellMass: number; boneMineralMass: number
  bmr: number; obesityDegree: number; ffmi: number; fmi: number; whr: number
  hydrationRate: number; ecwRatio: number
  muscleRightArm: number; muscleLeftArm: number; muscleTrunk: number
  muscleRightLeg: number; muscleLeftLeg: number
  devRightArm: number; devLeftArm: number; devTrunk: number
  devRightLeg: number; devLeftLeg: number
  phaseAngleRightArm: number; phaseAngleLeftArm: number; phaseAngleTrunk: number
  phaseAngleRightLeg: number; phaseAngleLeftLeg: number; phaseAngleWhole: number
  circumNeck: number; circumChest: number; circumAbdomen: number; circumHip: number
  circumRightArm: number; circumLeftArm: number; circumRightThigh: number; circumLeftThigh: number
  // 主観的状態
  sleepHours: number; sleepQuality: number; fatigueLevel: number
  muscleSoreness: number; motivation: number; stressLevel: number
  // 生体情報
  hrResting: number; hrv: number; systolicBP: number; diastolicBP: number
  // 栄養摂取
  calorieIntake: number; proteinIntake: number; carbIntake: number
  fatIntakeG: number; waterIntake: number
}

export const POSITION_COLORS: Record<string, string> = {
  GK: '#f59e0b', DF: '#10b981', MF: '#3b82f6', FW: '#ef4444',
}

const rnd = (r: number) => (Math.random() - 0.5) * r

const MATCH_DATES = new Set([
  '2025-01-15','2025-01-29',
  '2025-02-12','2025-02-26',
  '2025-03-12','2025-03-26',
  '2025-04-09','2025-04-23',
  '2025-05-07','2025-05-21',
  '2025-06-04','2025-06-18',
  '2025-07-02','2025-07-16',
])

// 試合詳細：対戦相手 / 会場 / スコア
const MATCH_DETAILS: Record<string, { opponent: string; venue: 'H' | 'A'; score: string; weather: string; attendance: number }> = {
  '2025-01-15': { opponent: 'FC東京',        venue: 'H', score: '2-1', weather: '晴',  attendance: 18520 },
  '2025-01-29': { opponent: '横浜FC',        venue: 'A', score: '1-1', weather: '曇',  attendance: 12340 },
  '2025-02-12': { opponent: '川崎F',         venue: 'H', score: '3-0', weather: '晴',  attendance: 21800 },
  '2025-02-26': { opponent: '浦和R',         venue: 'A', score: '0-2', weather: '雨',  attendance: 31500 },
  '2025-03-12': { opponent: 'G大阪',         venue: 'H', score: '1-0', weather: '晴',  attendance: 19200 },
  '2025-03-26': { opponent: 'C大阪',         venue: 'A', score: '2-2', weather: '曇',  attendance: 23600 },
  '2025-04-09': { opponent: '鹿島A',         venue: 'H', score: '1-3', weather: '晴',  attendance: 20100 },
  '2025-04-23': { opponent: '名古屋G',       venue: 'A', score: '2-1', weather: '晴',  attendance: 17800 },
  '2025-05-07': { opponent: 'サンフ広島',     venue: 'H', score: '0-0', weather: '曇',  attendance: 22300 },
  '2025-05-21': { opponent: 'ヴィッセル神戸', venue: 'A', score: '1-2', weather: '晴',  attendance: 28900 },
  '2025-06-04': { opponent: '柏R',           venue: 'H', score: '3-1', weather: '晴',  attendance: 19700 },
  '2025-06-18': { opponent: 'アビスパ福岡',   venue: 'A', score: '1-1', weather: '雨',  attendance: 16400 },
  '2025-07-02': { opponent: 'ベガルタ仙台',   venue: 'H', score: '2-0', weather: '晴',  attendance: 18100 },
  '2025-07-16': { opponent: 'アルビ新潟',     venue: 'A', score: '1-1', weather: '曇',  attendance: 14200 },
}

// 試合出場選手：starters=スタメン11人, subs=ベンチ5人 (imgId)
const MATCH_SQUADS: Record<string, { starters: number[]; subs: number[] }> = {
  '2025-01-15': { starters: [1,4,5,7,8,13,14,16,17,23,24],   subs: [2,6,15,25,26] },
  '2025-01-29': { starters: [1,4,5,6,7,13,14,15,16,23,25],   subs: [2,8,17,24,27] },
  '2025-02-12': { starters: [1,5,6,7,8,14,15,16,18,24,25],   subs: [3,4,13,23,26] },
  '2025-02-26': { starters: [1,4,6,7,9,13,15,17,18,23,24],   subs: [2,5,14,25,27] },
  '2025-03-12': { starters: [1,5,7,8,9,14,16,17,18,25,26],   subs: [2,4,13,23,24] },
  '2025-03-26': { starters: [1,4,5,6,7,13,14,16,18,23,25],   subs: [2,9,15,24,27] },
  '2025-04-09': { starters: [1,5,6,8,9,14,15,17,18,24,26],   subs: [3,4,13,23,25] },
  '2025-04-23': { starters: [1,4,7,8,9,13,16,17,18,23,25],   subs: [2,5,14,24,26] },
  '2025-05-07': { starters: [1,5,6,7,8,14,15,16,17,24,25],   subs: [2,4,13,23,26] },
  '2025-05-21': { starters: [1,4,5,7,9,13,14,17,18,23,26],   subs: [2,6,15,24,25] },
  '2025-06-04': { starters: [1,5,7,8,9,15,16,17,18,25,26],   subs: [2,4,14,23,24] },
  '2025-06-18': { starters: [1,4,6,7,8,13,14,15,16,24,25],   subs: [3,5,17,23,26] },
  '2025-07-02': { starters: [1,5,6,7,9,14,16,17,18,23,25],   subs: [2,4,15,24,26] },
  '2025-07-16': { starters: [1,4,5,7,8,13,14,16,17,24,26],   subs: [2,6,15,23,25] },
}

const GPS_DATES = [
  '2025-01-07','2025-01-09','2025-01-10',
  '2025-01-13','2025-01-15','2025-01-17',
  '2025-01-20','2025-01-22','2025-01-24',
  '2025-01-27','2025-01-29','2025-01-31',
  '2025-02-03','2025-02-05','2025-02-07',
  '2025-02-10','2025-02-12','2025-02-14',
  '2025-02-17','2025-02-19','2025-02-21',
  '2025-02-24','2025-02-26','2025-02-28',
  '2025-03-03','2025-03-05','2025-03-07',
  '2025-03-10','2025-03-12','2025-03-14',
  '2025-03-17','2025-03-19','2025-03-21',
  '2025-03-24','2025-03-26','2025-03-28',
  '2025-04-02','2025-04-04','2025-04-07',
  '2025-04-09','2025-04-11','2025-04-14',
  '2025-04-16','2025-04-18','2025-04-21',
  '2025-04-23','2025-04-25','2025-04-28',
  '2025-05-02','2025-05-05','2025-05-07',
  '2025-05-09','2025-05-12','2025-05-14',
  '2025-05-16','2025-05-19','2025-05-21',
  '2025-05-23','2025-05-26','2025-05-28',
  '2025-06-02','2025-06-04','2025-06-06',
  '2025-06-09','2025-06-11','2025-06-13',
  '2025-06-16','2025-06-18','2025-06-20',
  '2025-06-23','2025-06-25','2025-06-27',
  '2025-07-02','2025-07-04','2025-07-07',
  '2025-07-09','2025-07-11','2025-07-14',
  '2025-07-16','2025-07-18','2025-07-21',
  '2025-07-23','2025-07-25','2025-07-28',
]
function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start)
  const last = new Date(end)
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}
const COND_DATES = dateRange('2025-01-07', '2025-07-28')

const GPS_BASE: Record<string, { dist: number; mpm: number; speed: number; ee: number; accel: number; decel: number }> = {
  FW: { dist: 9800,  mpm: 103, speed: 31.0, ee: 13, accel: 20, decel: 18 },
  MF: { dist: 12000, mpm: 124, speed: 28.5, ee:  9, accel: 22, decel: 21 },
  DF: { dist: 10200, mpm: 107, speed: 28.0, ee:  8, accel: 25, decel: 23 },
  GK: { dist:  6000, mpm:  68, speed: 24.5, ee:  5, accel: 14, decel: 12 },
}
const COND_BASE: Record<string, { h: number; w: number; fat: number; muscle: number; bmr: number }> = {
  FW: { h: 176, w:  73, fat: 11.0, muscle: 60, bmr: 1800 },
  MF: { h: 174, w:  70, fat: 11.5, muscle: 57, bmr: 1750 },
  DF: { h: 181, w:  79, fat: 13.0, muscle: 64, bmr: 1880 },
  GK: { h: 186, w:  85, fat: 14.5, muscle: 68, bmr: 2000 },
}

const TRAIN_TIMES = ['09:30', '10:00', '10:30', '15:30', '16:00', '16:30']
const MATCH_TIMES = ['13:00', '14:00', '15:00', '19:00']

function makeGps(base: typeof GPS_BASE['FW'] & { dv?: number; sv?: number }, dates: string[], imgId?: number): GpsData[] {
  return dates.map((date, i) => {
    const prog = i / (dates.length - 1)
    const d    = base.dist + (base.dv ?? 0) + prog * 400 + rnd(600)
    const sp   = base.speed + (base.sv ?? 0) + prog * 0.3 + rnd(1.5)
    const mpm  = base.mpm + prog * 3 + rnd(8)
    const d07   = Math.round(d * 0.33 + rnd(200))
    const d715  = Math.round(d * 0.31 + rnd(180))
    const d1520 = Math.round(d * 0.18 + rnd(120))
    const d2025 = Math.round(d * 0.10 + rnd(80))
    const d25p  = Math.round(d * 0.05 + rnd(60))
    const tot   = d07 + d715 + d1520 + d2025 + d25p
    const isMatch = MATCH_DATES.has(date)
    const startTime = isMatch
      ? MATCH_TIMES[i % MATCH_TIMES.length]
      : TRAIN_TIMES[i % TRAIN_TIMES.length]
    const matchDetail = isMatch ? MATCH_DETAILS[date] : undefined
    return {
      date, sessionType: isMatch ? 'match' : 'training',
      startTime,
      ...(matchDetail ? {
        opponent: matchDetail.opponent,
        venue: matchDetail.venue,
        score: matchDetail.score,
        weather: matchDetail.weather,
        attendance: matchDetail.attendance,
      } : {}),
      totalDistance: isMatch ? Math.round(tot * 1.12) : tot,
      distancePerMinute: isMatch ? +((mpm * 1.08)).toFixed(1) : +mpm.toFixed(1),
      dist_0_7: d07, dist_7_15: d715, dist_15_20: d1520, dist_20_25: d2025, dist_25plus: d25p,
      ratio_0_7:   +(d07   / tot * 100).toFixed(1),
      ratio_7_15:  +(d715  / tot * 100).toFixed(1),
      ratio_15_20: +(d1520 / tot * 100).toFixed(1),
      ratio_20_25: +(d2025 / tot * 100).toFixed(1),
      count_15_20: Math.max(1, Math.round(18 + rnd(6))),
      count_20_25: Math.max(1, Math.round(10 + rnd(4))),
      count_25plus: Math.max(0, Math.round(5 + rnd(3))),
      maxSpeed: +sp.toFixed(1),
      accel_3ms2: Math.max(1, Math.round(base.accel + rnd(6))),
      decel_3ms2: Math.max(1, Math.round(base.decel + rnd(6))),
      accel_2ms3: Math.max(0, Math.round(base.accel * 0.45 + rnd(3))),
      decel_2ms3: Math.max(0, Math.round(base.decel * 0.45 + rnd(3))),
      explosiveEfforts: Math.max(1, Math.round(base.ee + prog * 1.5 + rnd(3))),
      running: +(75 + rnd(15)).toFixed(1),
      ...(isMatch && imgId !== undefined ? {
        isStarter: (MATCH_SQUADS[date]?.starters ?? []).includes(imgId),
      } : {}),
    }
  })
}

function makeCond(base: typeof COND_BASE['FW'] & { hv?: number; wv?: number; fv?: number }, dates: string[]): ConditioningData[] {
  return dates.map((date, i) => {
    const prog = i / (dates.length - 1)
    const h    = base.h + (base.hv ?? 0)
    const w    = +(base.w + (base.wv ?? 0) - prog * 0.8 + rnd(0.4)).toFixed(1)
    const fat  = +(base.fat + (base.fv ?? 0) - prog * 0.6 + rnd(0.3)).toFixed(1)
    const mu   = +(base.muscle + prog * 0.5 + rnd(0.3)).toFixed(1)
    const skel = +(mu * 0.57 + rnd(0.2)).toFixed(1)
    const lean = +(w * (1 - fat / 100)).toFixed(1)
    const bw   = +(lean * 0.68 + rnd(0.3)).toFixed(1)
    const bmi  = +(w / (h / 100) ** 2).toFixed(1)
    const timeH = 8 + (i % 3)
    const timeM = [0, 15, 30, 45][i % 4]
    const measureTime = `${String(timeH).padStart(2,'0')}:${String(timeM).padStart(2,'0')}`
    return {
      date, measureTime, height: h, weight: w, bmi,
      bodyFatPct: fat, bodyFatMass: +(w * fat / 100).toFixed(1),
      muscleMass: mu, skeletalMuscleMass: skel, leanBodyMass: lean,
      bodyWater: bw,
      intracellularWater: +(bw * 0.64 + rnd(0.2)).toFixed(1),
      extracellularWater: +(bw * 0.36 + rnd(0.15)).toFixed(1),
      protein:  +(lean * 0.19 + rnd(0.1)).toFixed(1),
      mineral:  +(lean * 0.067 + rnd(0.05)).toFixed(2),
      bodyCellMass:   +(lean * 0.61 + rnd(0.3)).toFixed(1),
      boneMineralMass: +(h * 0.018 + rnd(0.05)).toFixed(2),
      bmr: Math.round(base.bmr + prog * 30 + rnd(30)),
      obesityDegree: +(bmi - 22).toFixed(1),
      ffmi: +(mu / (h / 100) ** 2).toFixed(1),
      fmi:  +((w * fat / 100) / (h / 100) ** 2).toFixed(1),
      whr:  +(0.82 + rnd(0.02)).toFixed(2),
      hydrationRate: +(bw / lean * 100).toFixed(1),
      ecwRatio: +(0.356 + rnd(0.005)).toFixed(3),
      muscleRightArm: +(mu * 0.064 + rnd(0.1)).toFixed(2),
      muscleLeftArm:  +(mu * 0.060 + rnd(0.1)).toFixed(2),
      muscleTrunk:    +(mu * 0.452 + rnd(0.3)).toFixed(1),
      muscleRightLeg: +(mu * 0.211 + rnd(0.2)).toFixed(1),
      muscleLeftLeg:  +(mu * 0.206 + rnd(0.2)).toFixed(1),
      devRightArm: +(105 + rnd(4)).toFixed(1), devLeftArm:  +(101 + rnd(4)).toFixed(1),
      devTrunk:    +(108 + prog * 2 + rnd(3)).toFixed(1),
      devRightLeg: +(112 + prog * 2 + rnd(3)).toFixed(1),
      devLeftLeg:  +(110 + prog * 2 + rnd(3)).toFixed(1),
      phaseAngleRightArm: +(7.2 + prog * 0.2 + rnd(0.3)).toFixed(1),
      phaseAngleLeftArm:  +(7.0 + prog * 0.2 + rnd(0.3)).toFixed(1),
      phaseAngleTrunk:    +(8.5 + prog * 0.2 + rnd(0.3)).toFixed(1),
      phaseAngleRightLeg: +(6.8 + prog * 0.2 + rnd(0.3)).toFixed(1),
      phaseAngleLeftLeg:  +(6.7 + prog * 0.2 + rnd(0.3)).toFixed(1),
      phaseAngleWhole:    +(7.6 + prog * 0.3 + rnd(0.2)).toFixed(1),
      circumNeck:       +(37.5 + rnd(0.4)).toFixed(1),
      circumChest:      +(96.0 + rnd(0.8)).toFixed(1),
      circumAbdomen:    +(80.0 - prog * 1.0 + rnd(0.6)).toFixed(1),
      circumHip:        +(95.0 + rnd(0.6)).toFixed(1),
      circumRightArm:   +(32.0 + prog * 0.3 + rnd(0.4)).toFixed(1),
      circumLeftArm:    +(31.5 + prog * 0.3 + rnd(0.4)).toFixed(1),
      circumRightThigh: +(55.0 + prog * 0.5 + rnd(0.6)).toFixed(1),
      circumLeftThigh:  +(54.5 + prog * 0.5 + rnd(0.6)).toFixed(1),
      sleepHours:    +(7.0 + prog * 0.3 + rnd(1.2)).toFixed(1),
      sleepQuality:  Math.min(10, Math.max(1, Math.round(7.2 + prog * 0.8 + rnd(1.5)))),
      fatigueLevel:  Math.min(10, Math.max(1, Math.round(5.5 - prog * 1.0 + rnd(2)))),
      muscleSoreness:Math.min(10, Math.max(1, Math.round(5.0 - prog * 0.8 + rnd(2)))),
      motivation:    Math.min(10, Math.max(1, Math.round(7.0 + prog * 0.5 + rnd(1.5)))),
      stressLevel:   Math.min(10, Math.max(1, Math.round(5.0 - prog * 0.5 + rnd(2)))),
      hrResting:  Math.max(45, Math.round(60 - prog * 3 + rnd(5))),
      hrv:        +(55 + prog * 8 + rnd(10)).toFixed(1),
      systolicBP: Math.round(118 - prog * 2 + rnd(6)),
      diastolicBP:Math.round(76  - prog * 1 + rnd(4)),
      calorieIntake: Math.round(2800 + rnd(400)),
      proteinIntake: +(150 + prog * 5 + rnd(20)).toFixed(1),
      carbIntake:    +(320 + rnd(40)).toFixed(1),
      fatIntakeG:    +(80  + rnd(15)).toFixed(1),
      waterIntake:   +(2.8 + prog * 0.2 + rnd(0.5)).toFixed(1),
    }
  })
}

function computeDob(imgId: number, birthYear: number): string {
  const month = 1 + (imgId * 3) % 12
  const day   = 1 + (imgId * 7) % 28
  return `${birthYear}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}
function computeAge(dob: string): number {
  const [y, m, d] = dob.split('-').map(Number)
  let age = 2026 - y
  if (m > 3 || (m === 3 && d > 21)) age--
  return age
}

// [name, position, imgId, dv, sv, hv, wv, fv, birthYear]
const DEFS: [string, string, number, number, number, number, number, number, number][] = [
  // GK
  ['伊藤 勇気',     'GK',  1,    0,  0.0,  0,  0.0,  0.0, 1997],
  ['林 陸',         'GK',  2, -300, -0.5,  3,  2.0,  1.2, 2000],
  ['長谷川 晃',     'GK',  3,  250,  0.5, -2, -1.5, -0.8, 1994],
  // DF
  ['鈴木 大輝',     'DF',  4,    0,  0.0,  0,  0.0,  0.0, 1998],
  ['中村 拓也',     'DF',  5,  350,  0.5,  2,  1.5,  0.5, 2001],
  ['加藤 龍也',     'DF',  6, -250, -0.5, -1, -1.0, -0.5, 1999],
  ['吉田 蓮',       'DF',  7,  550,  0.3,  3,  2.0,  1.0, 2002],
  ['木村 大和',     'DF',  8, -350, -0.3, -2, -2.0, -0.8, 1997],
  ['石川 海斗',     'DF',  9,  150,  0.8,  1,  0.5, -0.5, 2000],
  ['ルーカス・ワーグナー',  'DF', 10, -150, -0.8, -1,  1.0,  1.0, 1996],
  ['池田 稜',       'DF', 11,  450,  0.2,  4,  3.0,  1.5, 2003],
  ['岡田 達也',     'DF', 12, -450,  1.0, -2, -1.5, -1.0, 1995],
  // MF
  ['佐藤 健一',     'MF', 13,    0,  0.0,  0,  0.0,  0.0, 1998],
  ['渡辺 航平',     'MF', 14,  600,  0.3,  2,  1.5,  0.5, 2001],
  ['小林 真人',     'MF', 15, -400, -0.5, -2, -1.0, -0.5, 1999],
  ['山田 颯太',     'MF', 16,  250,  0.5,  1,  0.5,  0.3, 2002],
  ['ブルーノ・リベイロ', 'MF', 17, -150, -0.3, -1, -0.5, -0.3, 1997],
  ['清水 凌',       'MF', 18,  500,  0.8,  3,  2.0,  0.8, 2003],
  ['山口 駿',       'MF', 19, -600, -0.8, -2, -1.5, -0.8, 2004],
  ['大塚 優斗',     'MF', 20,  700,  0.2,  1,  1.0,  0.2, 2000],
  ['ライアン・ミッチェル', 'MF', 21, -300,  1.0, -3, -2.0, -1.0, 1998],
  ['後藤 直樹',     'MF', 22,  200, -0.2,  2,  1.5,  0.5, 1996],
  // FW
  ['田中 翔太',     'FW', 23,  200,  1.0,  2,  0.5, -0.5, 2001],
  ['山本 雄介',     'FW', 24, -100,  0.5, -3, -1.0,  0.3, 1999],
  ['松本 悠斗',     'FW', 25,  350, -0.3,  1,  1.0,  0.5, 2002],
  ['マーカス・カーター', 'FW', 26, -250,  1.5, -1, -1.5, -1.0, 1995],
  ['阿部 武蔵',     'FW', 27,  150, -0.5,  3,  2.0,  1.0, 2003],
  ['村上 航',       'FW', 28,  450,  0.8,  0, -0.5, -0.3, 2000],
  ['前田 勝利',     'FW', 29, -300, -0.2, -2,  0.8,  0.8, 1998],
  ['石田 隼人',     'FW', 30,  100,  1.2,  1, -1.0, -0.8, 2004],
]

export const players: Player[] = DEFS.map(([name, pos, imgId, dv, sv, hv, wv, fv, by]) => {
  const dob = computeDob(imgId as number, by as number)
  const age = computeAge(dob)
  const heightCm = (COND_BASE[pos as string].h + (hv as number))
  return {
    id: `p${imgId}`,
    name: name as string,
    position: pos as string,
    photo: `https://i.pravatar.cc/150?img=${imgId}`,
    dob, age, heightCm,
    gpsData: (() => {
      const id = imgId as number
      const allGps = makeGps({ ...GPS_BASE[pos as string], dv: dv as number, sv: sv as number }, GPS_DATES, id)
      return allGps.filter(d => {
        if (d.sessionType !== 'match') return true
        const squad = MATCH_SQUADS[d.date]
        if (!squad) return true
        return [...squad.starters, ...squad.subs].includes(id)
      })
    })(),
    conditioningData: makeCond({ ...COND_BASE[pos as string], hv: hv as number, wv: wv as number, fv: fv as number }, COND_DATES),
  }
})
