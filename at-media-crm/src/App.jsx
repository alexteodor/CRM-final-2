import { useMemo, useState } from 'react'
import { useCrm } from './store'
import { hasSupabase, missingEnv } from './supabase'
import { go, useHash } from './ui'
import Login from './Login'
import Dashboard from './Dashboard'
import Leads from './Leads'
import Pipeline from './Pipeline'
import Demos from './Demos'
import LeadDetail from './LeadDetail'
import Today from './Today'
import Templates from './Templates'
import Importer from './Importer'
import Settings from './Settings'

const NAV = [
  ['/azi', 'Azi'],
  ['/panou', 'Panou'],
  ['/lead-uri', 'Lead-uri'],
  ['/pipeline', 'Pipeline'],
  ['/demo-uri', 'Loom-uri / demo-uri'],
  ['/sabloane', 'Șabloane'],
  ['/import', 'Import / Export'],
  ['/setari', 'Setări'],
]

export const EMPTY_FILTERS = { q: '', segment: '', country: '', priority: '', stage: '', demo: '', wave: '' }

export default function App() {
  const crm = useCrm()
  const hash = useHash()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [track, setTrack] = useState('')
  const path = hash.split('?')[0]

  const content = useMemo(() => {
    if (path.startsWith('/lead/')) return <LeadDetail id={decodeURIComponent(path.slice(6))} />
    if (path === '/lead-uri') return <Leads filters={filters} setFilters={setFilters} track={track} setTrack={setTrack} />
    if (path === '/pipeline') return <Pipeline track={track} setTrack={setTrack} />
    if (path === '/demo-uri') return <Demos track={track} setTrack={setTrack} />
    if (path === '/sabloane') return <Templates />
    if (path === '/import') return <Importer />
    if (path === '/setari') return <Settings />
    if (path === '/panou') return <Dashboard setFilters={setFilters} track={track} setTrack={setTrack} />
    return <Today track={track} setTrack={setTrack} />
  }, [path, filters, track])

  if (hasSupabase && crm.authReady && !crm.session) return <Login />
  if (!crm.ready) return <div className="login"><p className="muted">Se încarcă…</p></div>

  const current = path.startsWith('/lead/') ? '/lead-uri' : path === '/' ? '/azi' : path
  const counts = { '/lead-uri': crm.leads.length }
  return (
    <div className="app">
      <aside className="rail">
        <div className="brand"><b>CRM AT Media</b><span>Outreach internațional</span></div>
        <nav className="nav" aria-label="Navigare">
          {NAV.map(([p, label]) => (
            <button key={p} aria-current={current === p ? 'page' : undefined} onClick={() => go(p)}>
              {label}{counts[p] ? <small>{counts[p]}</small> : null}
            </button>
          ))}
        </nav>
        <div className="rail-foot">
          <div><span className={`dot ${crm.saving === 'saved' ? 'ok' : crm.saving === 'saving' ? 'wait' : 'err'}`} />{crm.saving === 'saved' ? 'Salvat' : crm.saving === 'saving' ? 'Se salvează…' : 'Eroare la salvare'}</div>
          <div>{crm.mode === 'cloud' ? 'Conectat la Supabase' : 'Mod local: datele sunt doar în acest browser' + (missingEnv.length ? '. Lipsește: ' + missingEnv.join(', ') : '')}</div>
          {crm.mode === 'cloud' && <button onClick={crm.signOut}>Ieși din cont</button>}
        </div>
      </aside>
      <main className="main">
        {crm.error && <div className="errbar"><span>{crm.error}</span><button onClick={() => crm.setError('')}>Închide</button></div>}
        {crm.leads.length === 0 && !['/import', '/setari'].includes(path) ? <EmptyBase /> : content}
      </main>
      {crm.toast && <div className="toast" role="status">{crm.toast}</div>}
    </div>
  )
}

function EmptyBase() {
  const { loadSeedIfEmpty } = useCrm()
  return (
    <div className="empty">
      <h2>Baza de date e goală</h2>
      <p style={{ margin: '8px 0 14px' }}>Importă lead-urile din campanie (fișierul data/seed.json din proiect) sau propriul tău Excel.</p>
      <button className="btn primary" onClick={() => go('/import')}>Mergi la Import</button>{' '}
      <button className="btn" onClick={loadSeedIfEmpty}>Încarcă rapid (doar testare locală)</button>
    </div>
  )
}
