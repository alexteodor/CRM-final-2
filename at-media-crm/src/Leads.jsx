import { useMemo, useState } from 'react'
import { useCrm } from './store'
import { SEGMENTS, STAGES, WAVES, eur, fmtDate, pkgOf, revenueOf, trackOf } from './calc'
import { DemoChip, Pri, SegChip, StageSelect, TrackToggle, go } from './ui'
import { EMPTY_FILTERS } from './App'

const COLS = [
  ['priority', 'P'], ['name', 'Firmă'], ['segment', 'Segment'], ['country_group', 'Țară'], ['pkg', 'Pachet'],
  ['rev', 'Revenue / lună'], ['stage', 'Etapă'], ['demo_wave', 'Demo'], ['followup_at', 'Follow-up'],
]

export function applyFilters(leads, f, settings) {
  const q = f.q.trim().toLowerCase()
  return leads.filter((l) => {
    if (f.track && trackOf(l) !== f.track) return false
    if (q && !`${l.name} ${l.type} ${l.what} ${l.contact} ${l.notes} ${l.country} ${l.city}`.toLowerCase().includes(q)) return false
    if (f.segment && l.segment !== f.segment) return false
    if (f.country && l.country_group !== f.country) return false
    if (f.priority && l.priority !== f.priority) return false
    if (f.stage && l.stage !== f.stage) return false
    if (f.demo === 'da' && !l.demo) return false
    if (f.demo === 'nu' && l.demo) return false
    if (f.wave && l.demo_wave !== f.wave) return false
    return true
  })
}

export default function Leads({ filters, setFilters, track, setTrack }) {
  const { leads, settings } = useCrm()
  const [sort, setSort] = useState({ k: 'priority', dir: 1 })
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const rows = useMemo(() => {
    const list = applyFilters(leads, { ...filters, track }, settings)
    const val = (l) => ({
      pkg: ['Start', 'Growth', 'Scale'].indexOf(pkgOf(l, settings)),
      rev: revenueOf(l, settings),
      stage: STAGES.indexOf(l.stage),
      demo_wave: l.demo ? l.demo_wave || 'Z' : 'ZZ',
      followup_at: l.followup_at || '9999',
    }[sort.k] ?? (l[sort.k] ?? ''))
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b)
      const c = x < y ? -1 : x > y ? 1 : 0
      return c * sort.dir || b.score - a.score
    })
  }, [leads, filters, track, settings, sort])
  const total = rows.reduce((a, l) => a + revenueOf(l, settings), 0)
  const active = Object.values(filters).some(Boolean)
  const th = (k, label) => (
    <th key={k} onClick={() => setSort((s) => ({ k, dir: s.k === k ? -s.dir : 1 }))} className={k === 'rev' ? 'num' : ''} aria-sort={sort.k === k ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
      {label}{sort.k === k ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''}
    </th>
  )
  return (
    <>
      <div className="page-head"><div><h1>Lead-uri</h1><p>Baza completă. Apasă pe un rând ca să vezi tot despre lead: mesaje, linkuri, contact, revenue.</p></div><TrackToggle track={track} setTrack={setTrack} /></div>
      <div className="toolbar">
        <input type="search" placeholder="Caută firmă, persoană, note" value={filters.q} onChange={set('q')} aria-label="Caută" />
        <select value={filters.segment} onChange={set('segment')} aria-label="Segment"><option value="">Toate segmentele</option>{Object.entries(SEGMENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select value={filters.country} onChange={set('country')} aria-label="Țară"><option value="">Toate țările</option>{['SUA', 'UK', 'UE / alte țări', '—'].map((c) => <option key={c}>{c}</option>)}</select>
        <select value={filters.priority} onChange={set('priority')} aria-label="Prioritate"><option value="">Orice prioritate</option>{['A', 'B', 'C'].map((c) => <option key={c}>{c}</option>)}</select>
        <select value={filters.stage} onChange={set('stage')} aria-label="Etapă"><option value="">Toate etapele</option>{STAGES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={filters.demo} onChange={set('demo')} aria-label="Demo"><option value="">Cu și fără demo</option><option value="da">Doar candidați demo</option><option value="nu">Fără demo</option></select>
        <select value={filters.wave} onChange={set('wave')} aria-label="Val"><option value="">Orice val</option>{WAVES.map((w) => <option key={w.id} value={w.id}>{w.label} ({w.dates})</option>)}</select>
        {active && <button className="btn ghost sm" onClick={() => setFilters(EMPTY_FILTERS)}>Șterge filtrele</button>}
        <span className="summary">{rows.length} lead-uri, {eur(total)} / lună</span>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr>{COLS.map(([k, l]) => th(k, l))}</tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="row" style={{ '--c': SEGMENTS[l.segment]?.color }} onClick={() => go('/lead/' + l.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go('/lead/' + l.id)}>
                <td><Pri p={l.priority} /></td>
                <td><b>{l.name}</b><div className="sub">{l.type}</div></td>
                <td><SegChip seg={l.segment} /></td>
                <td>{l.country_group}</td>
                <td>{pkgOf(l, settings)}</td>
                <td className="num">{eur(revenueOf(l, settings))}</td>
                <td><StageSelect lead={l} /></td>
                <td>{l.demo ? <>{l.demo_done ? <span className="chip good">Făcut</span> : <DemoChip />} {l.demo_wave}</> : ''}</td>
                <td>{fmtDate(l.followup_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={COLS.length}><div className="empty">Niciun lead nu se potrivește filtrelor.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
