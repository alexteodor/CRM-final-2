import { useMemo, useState } from 'react'
import { useCrm } from './store'
import { addDays, eur, fmtDate, revenueOf, today, trackOf } from './calc'
import { SECTIONS, buildTasks, dayOf, doneToday, estimateMinutes, nextFollowup } from './tasks'
import { SegChip, TrackToggle, go } from './ui'

const dayLabel = (iso, t) => (iso === t ? 'azi' : iso === addDays(t, -1) ? 'ieri' : fmtDate(iso))
const hm = (min) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60 ? (min % 60) + ' min' : ''}` : `${min} min`)

function Bar({ label, done, goal }) {
  const pct = goal ? Math.min(100, Math.round((done / goal) * 100)) : 0
  return (
    <div className="prog">
      <div className="row"><span>{label}</span><b>{done}{goal ? ` din ${goal}` : ''}</b></div>
      <div className="bar"><i style={{ width: pct + '%' }} /></div>
    </div>
  )
}

function Row({ x, t }) {
  const { settings, updateLead, markContacted, notify } = useCrm()
  const [link, setLink] = useState('')
  const l = x.lead
  const days = settings.followupDays || [3, 4, 7]
  const snooze = () => updateLead(l.id, { snooze_until: addDays(t, 1) })
  let primary = null
  if (x.kind === 'reply') primary = ['Am răspuns', () => updateLead(l.id, { followup_at: addDays(t, 2), snooze_until: addDays(t, 2) }, 'Am răspuns; mă uit din nou peste 2 zile', 'reply')]
  if (x.kind === 'followup') primary = ['Am trimis follow-up-ul', () => updateLead(l.id, { followups: x.n + 1, followup_at: nextFollowup(x.n, days, t) }, `Follow-up ${x.n + 1} trimis`, 'followup')]
  if (x.kind === 'send' || x.kind === 'contact') primary = ['Am trimis mesajul', () => { markContacted(l.id); notify('Marcat ca trimis; urmează follow-up') }]
  if (x.kind === 'loom') primary = [trackOf(l) === 'coach' ? 'Loom făcut' : 'Demo făcut', () => updateLead(l.id, { demo_done: true, ...(link.trim() ? { demo_url: link.trim() } : {}) }, 'Loom / demo făcut', 'loom')]
  return (
    <div className="task">
      <div className="task-main" onClick={() => go('/lead/' + l.id)}>
        <b>{x.text}</b>
        <small>{x.why}</small>
      </div>
      <div className="task-side">
        <SegChip seg={l.segment} />
        <span className="chip">{eur(revenueOf(l, settings))}</span>
      </div>
      <div className="task-act">
        {x.kind === 'loom' && <input className="inp" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link Loom (poți să-l pui și mai târziu)" aria-label="Link Loom" />}
        {x.kind === 'decide' ? (
          <>
            <button className="btn sm" onClick={() => updateLead(l.id, { followup_at: addDays(t, 7) }, 'Mai încerc: amânat 7 zile')}>Mai încerc (+7 zile)</button>
            <button className="btn sm danger" onClick={() => { if (confirm(`Închizi ${l.name} ca Pierdut?`)) updateLead(l.id, { stage: 'Pierdut' }) }}>Închide ca pierdut</button>
          </>
        ) : primary && <button className="btn sm primary" onClick={primary[1]}>{primary[0]}</button>}
        <button className="btn sm" onClick={() => go('/lead/' + l.id)}>Deschide</button>
        <button className="btn sm ghost" onClick={snooze} title="Dispare azi și revine mâine">Mâine</button>
      </div>
    </div>
  )
}

export default function Today({ track, setTrack }) {
  const { leads, settings } = useCrm()
  const t = today()
  const q = settings.daily || { contacts: 8, looms: 4, coachShare: 0.7 }
  const tasks = useMemo(() => buildTasks(leads, settings, t, track), [leads, settings, t, track])
  const done = useMemo(() => doneToday(leads, t), [leads, t])
  const yday = useMemo(() => doneToday(leads, addDays(t, -1)), [leads, t])
  const last = useMemo(() => leads.flatMap((l) => (l.activity || []).map((a) => ({ ...a, id: l.id, name: l.name }))).sort((a, b) => b.t.localeCompare(a.t))[0], [leads])
  const dueFu = tasks.filter((x) => x.kind === 'followup').length
  const left = tasks.length
  const when = new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })
  const ydayTxt = [[yday.sent, 'mesaje noi'], [yday.loom, 'Loom-uri / demo-uri'], [yday.followup, 'follow-up-uri'], [yday.reply, 'răspunsuri']].filter(([n]) => n).map(([n, w]) => `${n} ${w}`).join(', ')

  return (
    <>
      <div className="page-head">
        <div><h1>Azi</h1><p>{when}. Lista e făcută din ce ai trimis și din ce a rămas, în ordinea în care merită lucrat.</p></div>
        <TrackToggle track={track} setTrack={setTrack} />
      </div>

      <div className="two" style={{ marginBottom: 18 }}>
        <section className="panel">
          <h2>Unde am rămas</h2>
          {last ? (
            <p style={{ margin: '4px 0 10px' }}>Ultima acțiune: <b>{last.text}</b> la <a href={'#/lead/' + last.id}>{last.name}</a> ({dayLabel(dayOf(last.t), t)}).</p>
          ) : <p className="muted" style={{ margin: '4px 0 10px' }}>Încă n-ai nicio acțiune în jurnal. Prima de pe listă începe totul.</p>}
          <p className="muted">{ydayTxt ? `Ieri: ${ydayTxt}.` : 'Ieri nu ai marcat nimic.'}</p>
        </section>
        <section className="panel">
          <h2>Azi până acum</h2>
          <Bar label="Mesaje noi trimise" done={done.sent} goal={q.contacts} />
          <Bar label="Loom-uri / demo-uri făcute" done={done.loom} goal={q.looms} />
          <Bar label="Follow-up-uri trimise" done={done.followup} goal={done.followup + dueFu} />
          <p className="legend">{left ? `Mai ai ${left} sarcini, aproximativ ${hm(estimateMinutes(tasks))}. ` : ''}Țintele zilnice se schimbă din Setări.</p>
        </section>
      </div>

      {tasks.length === 0 && (
        <div className="empty">
          <h2>Ai terminat tot ce era pe azi</h2>
          <p style={{ margin: '8px 0 12px' }}>Țintele zilnice sunt atinse sau nu mai sunt lead-uri în „Găsit”. Poți adăuga lead-uri noi sau mări țintele.</p>
          <button className="btn primary" onClick={() => go('/import')}>Importă lead-uri</button>{' '}
          <button className="btn" onClick={() => go('/setari')}>Schimbă țintele</button>
        </div>
      )}

      {SECTIONS.map(([k, title, sub]) => {
        const list = tasks.filter((x) => x.kind === k)
        if (!list.length) return null
        return (
          <section key={k} className="tsec">
            <div className="wavehead"><h2>{title}</h2><small>{list.length} · {sub}</small></div>
            <div className="tasks">{list.map((x) => <Row key={x.key} x={x} t={t} />)}</div>
          </section>
        )
      })}
    </>
  )
}
