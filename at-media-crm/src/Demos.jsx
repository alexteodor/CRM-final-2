import { useCrm } from './store'
import { SEGMENTS, WAVES, adLibraryLink, eur, revenueOf, trackOf } from './calc'
import { SegChip, TrackToggle, go } from './ui'

export default function Demos({ track, setTrack }) {
  const { leads, settings, updateLead } = useCrm()
  const demo = leads.filter((l) => l.demo && (!track || trackOf(l) === track))
  const groups = [...WAVES.map((w) => ({ id: w.id, title: w.label, sub: w.dates })), { id: '', title: 'Fără val', sub: 'de programat' }]
  const adLink = (l) => {
    const m = (l.demo_note || '').match(/\b(\d{9,20})\b/)
    return m ? `https://www.facebook.com/ads/library/?id=${m[1]}` : l.segment === 'ICP-4 YouTube' && /youtube\.com/.test(l.source) ? l.source : adLibraryLink(l)
  }
  return (
    <>
      <div className="page-head"><div><h1>Loom-uri / demo-uri</h1><p>{demo.length} candidați, grupați pe valuri. Fiecare are detaliul concret de care te legi în mesaj. Bifează „făcut” după ce ai terminat și lipește linkul. Lista de pe „Azi” alege singură, după prioritate și țintele zilnice.</p></div><TrackToggle track={track} setTrack={setTrack} /></div>
      {groups.map((g) => {
        const ls = demo.filter((l) => (l.demo_wave || '') === g.id).sort((a, b) => b.score - a.score)
        if (!ls.length) return null
        const done = ls.filter((l) => l.demo_done).length
        return (
          <section key={g.id || 'x'}>
            <div className="wavehead"><h2>{g.title}</h2><small>{g.sub} · {done} din {ls.length} făcute</small></div>
            <div className="demos">
              {ls.map((l) => (
                <article key={l.id} className={`demo ${l.demo_done ? 'done' : ''}`}>
                  <div className="row"><b style={{ cursor: 'pointer' }} onClick={() => go('/lead/' + l.id)}>{l.name}</b><span className="chip">{eur(revenueOf(l, settings))}</span></div>
                  <div className="row"><SegChip seg={l.segment} /><span className="muted">{l.country_group} · scor {l.score}</span></div>
                  <div className="note">{l.demo_note}</div>
                  <div className="row">
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" checked={!!l.demo_done} onChange={(e) => updateLead(l.id, { demo_done: e.target.checked }, e.target.checked ? 'Demo făcut' : 'Demo debifat')} /> Demo făcut</label>
                    <select value={l.demo_wave || ''} onChange={(e) => updateLead(l.id, { demo_wave: e.target.value })} aria-label="Val">
                      <option value="">Fără val</option>{WAVES.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                    </select>
                  </div>
                  <input className="inp" style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '7px 9px', background: 'var(--panel)' }} placeholder="Link demo (Drive, Loom, YouTube)" value={l.demo_url || ''} onChange={(e) => updateLead(l.id, { demo_url: e.target.value })} aria-label="Link demo" />
                  <div className="links"><a href={adLink(l)} target="_blank" rel="noreferrer">Deschide sursa</a><a onClick={() => go('/lead/' + l.id)} href={'#/lead/' + l.id}>Mesaje și detalii</a></div>
                </article>
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
