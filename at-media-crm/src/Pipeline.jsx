import { useMemo, useState } from 'react'
import { useCrm } from './store'
import { SEGMENTS, STAGES, eur, revenueOf, trackOf, weightedOf } from './calc'
import { DemoChip, TrackToggle, go } from './ui'

const CAP = 30

export default function Pipeline({ track, setTrack }) {
  const { leads, settings, updateLead } = useCrm()
  const [seg, setSeg] = useState('')
  const [over, setOver] = useState('')
  const [onlyA, setOnlyA] = useState(true)
  const cols = useMemo(() => STAGES.map((s) => {
    const all = leads.filter((l) => l.stage === s && (!track || trackOf(l) === track) && (!seg || l.segment === seg) && (!onlyA || s !== 'Găsit' || l.priority === 'A'))
    all.sort((a, b) => b.score - a.score || revenueOf(b, settings) - revenueOf(a, settings))
    return { s, all, sum: all.reduce((a, l) => a + revenueOf(l, settings), 0), w: all.reduce((a, l) => a + weightedOf(l, settings), 0) }
  }), [leads, seg, track, onlyA, settings])
  return (
    <>
      <div className="page-head"><div><h1>Pipeline</h1><p>Trage un lead în altă coloană ca să-i schimbi etapa. Pe telefon schimbi etapa din pagina lead-ului.</p></div><TrackToggle track={track} setTrack={setTrack} /></div>
      <div className="toolbar">
        <select value={seg} onChange={(e) => setSeg(e.target.value)} aria-label="Segment"><option value="">Toate segmentele</option>{Object.entries(SEGMENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <label className="chip" style={{ cursor: 'pointer' }}><input type="checkbox" checked={onlyA} onChange={(e) => setOnlyA(e.target.checked)} /> În „Găsit” doar prioritate A</label>
      </div>
      <div className="board">
        {cols.map(({ s, all, sum, w }) => (
          <section key={s} className={`col ${over === s ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOver(s) }} onDragLeave={() => setOver('')}
            onDrop={(e) => { e.preventDefault(); setOver(''); const id = e.dataTransfer.getData('text/plain'); if (id) updateLead(id, { stage: s }) }}>
            <header><b>{s} <small>{all.length}</small></b><small>{eur(sum)}</small></header>
            {s !== 'Pierdut' && s !== 'Semnat' && <div className="faint" style={{ fontSize: 12.5, padding: '0 6px 8px' }}>ponderat {eur(w)}</div>}
            <div className="cards">
              {all.slice(0, CAP).map((l) => (
                <article key={l.id} className="card" style={{ '--c': SEGMENTS[l.segment]?.color }} draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', l.id)} onClick={() => go('/lead/' + l.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go('/lead/' + l.id)}>
                  <div className="t"><span>{l.name}</span><span>{eur(revenueOf(l, settings))}</span></div>
                  <div className="m"><span>{l.priority} · {l.score}</span><span>{l.country_group}</span>{l.demo && <DemoChip />}</div>
                </article>
              ))}
              {all.length > CAP && <div className="faint" style={{ fontSize: 13, padding: 6 }}>+ {all.length - CAP} în plus. Vezi-le în Lead-uri.</div>}
              {all.length === 0 && <div className="faint" style={{ fontSize: 13, padding: 6 }}>Gol</div>}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
