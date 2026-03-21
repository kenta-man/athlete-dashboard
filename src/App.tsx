import { useState, useMemo } from 'react'
import { players, POSITION_COLORS } from './data/sampleData'
import { aggregateGpsData, aggregateCondData, type Period, PERIOD_LABELS } from './utils/aggregation'
import GpsView from './components/GpsView'
import ConditioningView from './components/ConditioningView'
import ComparisonView from './components/ComparisonView'

type DataTab = 'gps' | 'conditioning'
type ViewMode = 'individual' | 'comparison'

export default function App() {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0].id)
  const [viewMode, setViewMode]   = useState<ViewMode>('individual')
  const [dataTab, setDataTab]     = useState<DataTab>('gps')
  const [period, setPeriod]       = useState<Period>('session')
  const [posFilter, setPosFilter] = useState<string>('ALL')

  const player  = players.find(p => p.id === selectedPlayerId)!
  const gpsData  = useMemo(() => aggregateGpsData(player.gpsData, period),  [player, period])
  const condData = useMemo(() => aggregateCondData(player.conditioningData, period), [player, period])

  const filteredPlayers = posFilter === 'ALL' ? players : players.filter(p => p.position === posFilter)
  const posCounts = ['GK','DF','MF','FW'].reduce<Record<string,number>>((acc, pos) => {
    acc[pos] = players.filter(p => p.position === pos).length; return acc
  }, {})

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f1f5f9' }}>

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between" style={{ height: 52 }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-800 tracking-wide">Athlete Analytics</span>
          </div>

          <div className="flex items-center gap-1 rounded-lg p-1 bg-slate-100">
            {(['individual', 'comparison'] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={viewMode === m
                  ? { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }
                  : { color: '#94a3b8', background: 'transparent' }}>
                {m === 'individual' ? '個人' : 'チーム比較'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Controls Bar ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            {(['gps', 'conditioning'] as DataTab[]).map(tab => (
              <button key={tab} onClick={() => setDataTab(tab)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all border"
                style={dataTab === tab
                  ? tab === 'gps'
                    ? { color: '#2563eb', background: '#eff6ff', borderColor: '#bfdbfe' }
                    : { color: '#059669', background: '#f0fdf4', borderColor: '#a7f3d0' }
                  : { color: '#94a3b8', borderColor: 'transparent', background: 'transparent' }}>
                {tab === 'gps' ? '⚡ GPS' : '🫀 コンディショニング'}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-slate-200" />

          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 mr-1">期間</span>
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all border"
                style={period === p
                  ? { color: '#475569', background: '#f1f5f9', borderColor: '#e2e8f0' }
                  : { color: '#94a3b8', borderColor: 'transparent', background: 'transparent' }}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Player Selector (individual only) ── */}
      {viewMode === 'individual' && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 space-y-2">
            {/* Position filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setPosFilter('ALL')}
                className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
                style={posFilter === 'ALL'
                  ? { color: '#475569', background: '#f1f5f9', borderColor: '#e2e8f0' }
                  : { color: '#94a3b8', borderColor: 'transparent', background: 'transparent' }}>
                全員 <span className="text-slate-400">({players.length})</span>
              </button>
              {['GK','DF','MF','FW'].map(pos => (
                <button key={pos} onClick={() => setPosFilter(pos)}
                  className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
                  style={posFilter === pos
                    ? { color: POSITION_COLORS[pos], background: POSITION_COLORS[pos] + '15', borderColor: POSITION_COLORS[pos] + '60' }
                    : { color: '#94a3b8', borderColor: 'transparent', background: 'transparent' }}>
                  {pos} <span className="opacity-60">({posCounts[pos]})</span>
                </button>
              ))}
            </div>

            {/* Player pills with photo */}
            <div className="flex gap-1.5 flex-wrap">
              {filteredPlayers.map(p => {
                const color = POSITION_COLORS[p.position]
                const isSelected = selectedPlayerId === p.id
                return (
                  <button key={p.id} onClick={() => setSelectedPlayerId(p.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all"
                    style={isSelected
                      ? { color, background: color + '12', borderColor: color + '50', boxShadow: `0 0 0 2px ${color}20` }
                      : { color: '#94a3b8', borderColor: '#e2e8f0', background: 'transparent' }}>
                    <img src={p.photo} alt={p.name}
                      className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      style={isSelected ? { outline: `2px solid ${color}`, outlineOffset: 1 } : {}}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <span>{p.name}</span>
                    <span style={{ opacity: 0.6 }}>{p.position}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {viewMode === 'individual' ? (
          <>
            {/* Player header card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5 flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <img src={player.photo} alt={player.name}
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-md"
                  style={{ outline: `3px solid ${POSITION_COLORS[player.position]}40` }}
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&size=64` }} />
                <span className="absolute -bottom-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full text-white shadow-sm"
                  style={{ backgroundColor: POSITION_COLORS[player.position], fontSize: 10 }}>
                  {player.position}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{player.name}</h2>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ color: POSITION_COLORS[player.position], background: POSITION_COLORS[player.position] + '15' }}>
                    {player.position}
                  </span>
                  <span className="text-xs text-slate-500">生年月日: <span className="font-medium text-slate-700">{player.dob}</span></span>
                  <span className="text-xs text-slate-500">年齢: <span className="font-medium text-slate-700">{player.age}歳</span></span>
                  <span className="text-xs text-slate-500">身長: <span className="font-medium text-slate-700">{player.heightCm}cm</span></span>
                </div>
              </div>
              {dataTab === 'conditioning' && condData.length > 0 && (() => {
                const last = condData[condData.length - 1]
                return (
                  <div className="hidden md:flex gap-3">
                    <Stat label="体重" value={`${last.weight}`} unit="kg" />
                    <Stat label="体脂肪率" value={`${last.bodyFatPct}`} unit="%" />
                    <Stat label="骨格筋量" value={`${last.skeletalMuscleMass}`} unit="kg" />
                  </div>
                )
              })()}
            </div>

            {dataTab === 'gps'
              ? <GpsView data={gpsData} period={period} player={player} />
              : <ConditioningView data={condData} period={period} player={player} />}
          </>
        ) : (
          <ComparisonView players={players} period={period} dataTab={dataTab} />
        )}
      </main>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="text-center px-3 border-l border-slate-100">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-base font-bold text-slate-700">{value}<span className="text-xs font-normal text-slate-400 ml-0.5">{unit}</span></p>
    </div>
  )
}
