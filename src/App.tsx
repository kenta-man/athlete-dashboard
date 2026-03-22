import { useState } from 'react'
import { players, POSITION_COLORS } from './data/sampleData'
import GpsView from './components/GpsView'
import ConditioningView from './components/ConditioningView'
import ComparisonView from './components/ComparisonView'

type DataTab = 'gps' | 'conditioning'
type ViewMode = 'individual' | 'comparison'

/* ── Brand colors ── */
const RED    = '#cc0000'
const DARK   = '#1a1a1a'
const DARK2  = '#2a2a2a'

export default function App() {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0].id)
  const [viewMode, setViewMode]   = useState<ViewMode>('individual')
  const [dataTab, setDataTab]     = useState<DataTab>('gps')
  const [posFilter, setPosFilter] = useState<string>('ALL')
  const [compView, setCompView]   = useState<'session' | 'matrix'>('matrix')

  const player  = players.find(p => p.id === selectedPlayerId)!

  const filteredPlayers = posFilter === 'ALL' ? players : players.filter(p => p.position === posFilter)
  const posCounts = ['GK','DF','MF','FW'].reduce<Record<string,number>>((acc, pos) => {
    acc[pos] = players.filter(p => p.position === pos).length; return acc
  }, {})

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f2f5' }}>

      {/* ── Header ── */}
      <header style={{ backgroundColor: DARK, borderBottom: `3px solid ${RED}` }} className="sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center" style={{ height: 52 }}>
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: RED }}>
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-widest uppercase text-white">Athlete Analytics</span>
          </div>
        </div>
      </header>

      {/* ── Controls Bar ── */}
      <div style={{ backgroundColor: DARK2, borderBottom: `1px solid #3a3a3a` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-3">
          {/* Data tab */}
          <div className="flex items-center gap-1">
            {(['gps', 'conditioning'] as DataTab[]).map(tab => (
              <button key={tab} onClick={() => setDataTab(tab)}
                className="px-3 py-1.5 rounded text-xs font-bold transition-all"
                style={dataTab === tab
                  ? { backgroundColor: RED, color: '#fff' }
                  : { color: '#999', background: 'transparent' }}>
                {tab === 'gps' ? '⚡ GPS' : '🫀 コンディショニング'}
              </button>
            ))}
          </div>

          <div className="w-px h-5" style={{ backgroundColor: '#444' }} />

          {/* View mode (個人 / チーム比較) */}
          <div className="flex items-center gap-0" style={{ border: `1px solid #555`, borderRadius: 4, overflow: 'hidden' }}>
            {(['individual', 'comparison'] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className="px-3 py-1.5 text-xs font-bold transition-all"
                style={viewMode === m
                  ? { backgroundColor: '#2563eb', color: '#fff' }
                  : { backgroundColor: 'transparent', color: '#aaa' }}>
                {m === 'individual' ? '個人' : 'チーム比較'}
              </button>
            ))}
          </div>

          {/* Session / Matrix toggle (team comparison) */}
          {viewMode === 'comparison' && (
            <>
              <div className="w-px h-5" style={{ backgroundColor: '#444' }} />
              <div className="flex items-center gap-0" style={{ border: `1px solid #555`, borderRadius: 4, overflow: 'hidden' }}>
                {([
                  { key: 'session' as const, label: dataTab === 'gps' ? 'セッション' : 'ランキング' },
                  { key: 'matrix'  as const, label: '比較マトリクス' },
                ]).map(v => (
                  <button key={v.key} onClick={() => setCompView(v.key)}
                    className="px-3 py-1.5 text-xs font-bold transition-all"
                    style={compView === v.key
                      ? { backgroundColor: '#2563eb', color: '#fff' }
                      : { backgroundColor: 'transparent', color: '#aaa' }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Player Selector (individual only) ── */}
      {viewMode === 'individual' && (
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 space-y-2">
            {/* Position filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setPosFilter('ALL')}
                className="px-2.5 py-1 rounded text-xs font-bold border transition-all"
                style={posFilter === 'ALL'
                  ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb' }
                  : { color: '#999', borderColor: '#e5e7eb', background: 'transparent' }}>
                全員 <span style={{ opacity: 0.7 }}>({players.length})</span>
              </button>
              {['GK','DF','MF','FW'].map(pos => (
                <button key={pos} onClick={() => setPosFilter(pos)}
                  className="px-2.5 py-1 rounded text-xs font-bold border transition-all"
                  style={posFilter === pos
                    ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb' }
                    : { color: '#999', borderColor: '#e5e7eb', background: 'transparent' }}>
                  {pos} <span style={{ opacity: 0.7 }}>({posCounts[pos]})</span>
                </button>
              ))}
            </div>

            {/* Player pills with photo */}
            <div className="flex gap-1.5 flex-wrap">
              {filteredPlayers.map(p => {
                const isSelected = selectedPlayerId === p.id
                return (
                  <button key={p.id} onClick={() => setSelectedPlayerId(p.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all"
                    style={isSelected
                      ? { color: '#fff', background: '#2563eb', borderColor: '#2563eb' }
                      : { color: '#94a3b8', borderColor: '#e2e8f0', background: 'transparent' }}>
                    <img src={p.photo} alt={p.name}
                      className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      style={isSelected ? { outline: '2px solid #93c5fd', outlineOffset: 1 } : {}}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <span>{p.name}</span>
                    <span style={{ opacity: 0.7 }}>{p.position}</span>
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
            <div className="bg-white border border-slate-200 shadow-sm p-4 mb-5 flex items-center gap-4"
              style={{ borderRadius: 0, borderLeft: `4px solid ${RED}` }}>
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
                <h2 className="text-xl font-bold" style={{ color: DARK }}>{player.name}</h2>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ color: '#fff', background: POSITION_COLORS[player.position] }}>
                    {player.position}
                  </span>
                  <span className="text-xs text-slate-500">生年月日: <span className="font-medium text-slate-700">{player.dob}</span></span>
                  <span className="text-xs text-slate-500">年齢: <span className="font-medium text-slate-700">{player.age}歳</span></span>
                  <span className="text-xs text-slate-500">身長: <span className="font-medium text-slate-700">{player.heightCm}cm</span></span>
                </div>
              </div>
            </div>

            {dataTab === 'gps'
              ? <GpsView rawData={player.gpsData} player={player} />
              : <ConditioningView rawData={player.conditioningData} player={player} />}
          </>
        ) : (
          <ComparisonView players={players} dataTab={dataTab} compView={compView} />
        )}
      </main>
    </div>
  )
}

