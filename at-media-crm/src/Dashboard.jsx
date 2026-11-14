import { useMemo } from 'react'
import { useCrm } from './store'
import { SEGMENTS, STAGES, WAVES, daysBetween, eur, fmtDate, revenueOf, today, trackOf, weightedOf } from './calc'
import { TrackToggle, go } from './ui'
import { EMPTY_FILTERS } from './App'

const TARGETS = { 'Contactat': 220, 'Răspuns': 20, Apel: 8, 'Demo trimis': 6, Pilot: 2, Semnat: 1 }
const FUNNEL = ['Contactat', 'Răspuns', 'Apel', 'Demo trimis', 'Pilot', 'Semnat']

export default function Dashboard({ setFilters, track, setTrack }) {
  const { leads: allLeads, settings } = useCrm()
  const leads = useMemo(() => (track ? allLeads.filter((l) => trackOf(l) === track) : allLeads), [allLeads, track])
  const t = today()
  const d = useMemo(() => {
    const idx = (l) => STAGES.indexOf(l.stage === 'Pierdut' ? l.lost_from || 'Găsit' : l.stage)
    const reached = Object.fromEntries(FUNNEL.map((s) => [s, leads.filter((l) => idx(l) >= STAGES.indexOf(s) && (s !== 'Semnat' || l.stage === 'Semnat')).length]))
    const open = leads.filter((l) => l.stage !== 'Pierdut' && l.stage !== 'Semnat')
    const signed = leads.filter((l) => l.stage === 'Semnat')
    const bySeg = Object.keys(SEGMENTS).filter((k) => !track || (track === 'coach') === k.startsWith('C-')).map((k) => {
      const ls = leads.filter((l) => l.segment === k)
      return { k, n: ls.length, demo: ls.filter((l) => l.demo).length, contacted: ls.filter((l) => idx(l) >= 1).length, rev: ls.filter((l) => l.stage !== 'Pierdut').reduce((a, l) => a + revenueOf(l, settings), 0) }
    })
    const waves = WAVES.map((w) => {
      const ls = leads.filter((l) => l.demo && l.demo_wave === w.id)
      return { ...w, n: ls.length, done: ls.filter((l) => l.demo_done).length }
    })
    const due = open.filter((l) => l.followup_at && l.followup_at <= t).sort((a, b) => a.followup_at.localeCompare(b.followup_at))
    const nextDemos = leads.filter((l) => l.demo && !l.demo_done && l.stage !== 'Pierdut').sort((a, b) => (a.demo_wave || 'Z').localeCompare(b.demo_wave || 'Z') || b.score - a.score).slice(0, 6)
    const log = leads.flatMap((l) => (l.activity || []).map((a) => ({ ...a, id: l.id, name: l.name }))).sort((a, b) => b.t.localeCompare(a.t)).slice(0, 7)
    return {
      reached, signed,
      potential: open.reduce((a, l) => a + revenueOf(l, settings), 0),
      weighted: open.reduce((a, l) => a + weightedOf(l, settings), 0),
      mrr: signed.reduce((a, l) => a + revenueOf(l, settings), 0),
      bySeg, waves, due, nextDemos, log,
      demoTotal: leads.filter((l) => l.demo).length,
      demoDone: leads.filter((l) => l.demo && l.demo_done).length,
    }
  }, [leads, settings, t])
  const maxFun = Math.max(...FUNNEL.map((s) => Math.max(d.reached[s], TARGETS[s])), 1)
  const daysLeft = daysBetween(t, settings.deadline)
  const replyRate = d.reached['Contactat'] ? Math.round((d.reached['Răspuns'] / d.reached['Contactat']) * 100) : 0

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Panou</h1>
          <p>{daysLeft > 0 ? `${daysLeft} zile până pe ${fmtDate(settings.deadline).replace('.', '')}.` : 'Termenul a trecut.'} Obiectiv: {settings.goalClients} clienți noi cu pachete lunare; acum ai {d.signed.length}.</p>
        </div>
        <TrackToggle track={track} setTrack={setTrack} />
      </div>

      <div className="hero">
        <section className="panel" aria-label="Funnel">
          <h2>Funnel față de plan</h2>
          <div className="funnel">
            {FUNNEL.map((s) => (
              <div className="frow" key={s}>
                <span className="lab">{s}</span>
                <div className="track" title={`${d.reached[s]} din țintă ${TARGETS[s]}`}>
                  <div className={`clip ${d.reached[s] ? '' : 'zero'}`} style={{ width: `${(d.reached[s] / maxFun) * 100}%` }}>{d.reached[s]}</div>
                  <div className="tick" style={{ left: `${(TARGETS[s] / maxFun) * 100}%` }} />
                </div>
                <span className="tgt">țintă {TARGETS[s]}</span>
              </div>
            ))}
          </div>
          <p className="legend">Bara arată câte lead-uri au ajuns cel puțin la etapa respectivă. Linia neagră e ținta din plan.</p>
        </section>
        <section className="panel">
          <h2>Bani</h2>
          <div className="kpis">
            <div className="kpi"><b>{eur(d.potential)}</b><span>potențial lunar dacă ar semna toate lead-urile deschise</span></div>
            <div className="kpi"><b>{eur(d.weighted)}</b><span>ponderat pe etapă</span></div>
            <div className="kpi"><b>{eur(d.mrr)}</b><span>semnat pe lună</span></div>
            <div className="kpi"><b>{replyRate}%</b><span>rată de răspuns</span></div>
          </div>
        </section>
      </div>

      <div className="zones">
        {d.bySeg.map((z) => (
          <button key={z.k} className="zone" style={{ '--c': SEGMENTS[z.k].color }} onClick={() => { setFilters({ ...EMPTY_FILTERS, segment: z.k }); go('/lead-uri') }}>
            <h3><i />{SEGMENTS[z.k].label}</h3>
            <div className="big">{z.n}</div>
            <dl>
              <dt>Contactate</dt><dd>{z.contacted}</dd>
              <dt>Candidați demo</dt><dd>{z.demo}</dd>
              <dt>Potențial / lună</dt><dd>{eur(z.rev)}</dd>
            </dl>
          </button>
        ))}
      </div>

      <div className="two" style={{ marginBottom: 18 }}>
        <section className="panel">
          <h2>De făcut azi</h2>
          {d.due.length === 0 && d.reached['Contactat'] === 0 ? (
            <div className="empty">Încă nu ai trimis niciun mesaj. Lista zilei te așteaptă.<br /><button className="btn primary sm" style={{ marginTop: 10 }} onClick={() => go('/azi')}>Mergi la Azi</button></div>
          ) : d.due.length === 0 ? <div className="empty">Niciun follow-up scadent.</div> : (
            <div className="list">{d.due.slice(0, 8).map((l) => (
              <div key={l.id} className="item" onClick={() => go('/lead/' + l.id)}><div><b>{l.name}</b><small>{l.stage}, follow-up {fmtDate(l.followup_at)}</small></div><span className="chip">{eur(revenueOf(l, settings))}</span></div>
            ))}</div>
          )}
        </section>
        <section className="panel">
          <h2>Următoarele demo-uri</h2>
          {d.nextDemos.length === 0 ? <div className="empty">Toate demo-urile sunt făcute.</div> : (
            <div className="list">{d.nextDemos.map((l) => (
              <div key={l.id} className="item" onClick={() => go('/lead/' + l.id)}><div><b>{l.name}</b><small>{l.demo_wave || 'fără val'}, scor {l.score}</small></div><span className="chip good">Demo</span></div>
            ))}</div>
          )}
        </section>
      </div>

      <div className="two">
        <section className="panel">
          <h2>Valuri de demo</h2>
          <div className="waves">
            {d.waves.map((w) => (
              <button key={w.id} className="wave" onClick={() => go('/demo-uri')}>
                <b>{w.label}</b> <small className="muted">{w.dates}</small>
                <div style={{ marginTop: 4 }}>{w.done} din {w.n} făcute</div>
                <div className="bar"><i style={{ width: `${w.n ? (w.done / w.n) * 100 : 0}%` }} /></div>
              </button>
            ))}
          </div>
          <p className="legend">Total: {d.demoDone} din {d.demoTotal} demo-uri făcute.</p>
        </section>
        <section className="panel">
          <h2>Activitate recentă</h2>
          {d.log.length === 0 ? <div className="empty">Aici apar schimbările de etapă și notele.</div> : (
            <div className="list">{d.log.map((a, i) => (
              <div key={i} className="item" onClick={() => go('/lead/' + a.id)}><div><b>{a.name}</b><small>{a.text}</small></div><small>{fmtDate(a.t.slice(0, 10))}</small></div>
            ))}</div>
          )}
        </section>
      </div>
    </>
  )
}
