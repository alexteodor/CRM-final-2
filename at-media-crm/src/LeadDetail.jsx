import { useState } from 'react'
import { useCrm } from './store'
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES, SEGMENTS, STAGES, TEMPLATE_KINDS, WAVES, adLibraryLink, autoPackage, eur, fmtDate, googleLink, makeMessages, pkgOf, renderTemplate, revenueOf, trackOf, weightedOf } from './calc'
import { CopyBtn, DemoChip, Pri, SegChip, go } from './ui'

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>
}

export default function LeadDetail({ id }) {
  const { leads, settings, updateLead, markContacted, deleteLead, notify } = useCrm()
  const l = leads.find((x) => x.id === id)
  const [tab, setTab] = useState('li')
  const [note, setNote] = useState('')
  if (!l) return <><button className="back" onClick={() => go('/lead-uri')}>← Înapoi la lead-uri</button><div className="empty">Nu am găsit lead-ul.</div></>
  const set = (k) => (e) => updateLead(l.id, { [k]: e.target.value })
  const pkg = pkgOf(l, settings)
  const rev = revenueOf(l, settings)
  const auto = autoPackage(l, settings)
  const prices = trackOf(l) === 'coach' ? (settings.coachPrices || DEFAULT_SETTINGS.coachPrices) : settings.prices
  const volumes = trackOf(l) === 'coach' ? (settings.coachVolumes || DEFAULT_SETTINGS.coachVolumes) : settings.volumes
  const adId = (l.demo_note || '').match(/\b(\d{9,20})\b/)?.[1]
  const links = [
    ['Site', l.site],
    ['LinkedIn firmă', l.linkedin_company],
    ['LinkedIn contact', l.contact_linkedin],
    ['Sursa semnalului', l.source],
    [adId ? 'Reclama în Ad Library' : 'Reclamele în Ad Library', String(l.segment).startsWith('C-') || l.segment === 'ICP-4 YouTube' || l.segment === 'ICP-2 Agenție' ? null : adId ? `https://www.facebook.com/ads/library/?id=${adId}` : adLibraryLink(l)],
    ['Caută fondatorul', googleLink(`${l.name} founder OR CEO linkedin`)],
    ['Caută pe Google', googleLink(l.name)],
  ]
  const validUrl = (u) => /^https?:\/\//.test(u || '')
  const coach = trackOf(l) === 'coach'
  const enc = encodeURIComponent
  const quick = [
    ['Google', googleLink(l.name + (coach ? ' coaching' : ''))],
    ['YouTube', `https://www.youtube.com/results?search_query=${enc(l.name)}`],
    ['Instagram', `https://www.google.com/search?q=${enc(l.name + ' instagram')}`],
    ['LinkedIn', `https://www.linkedin.com/search/results/all/?keywords=${enc(l.name)}`],
  ]
  const FIELD = { li: 'msg_linkedin', em: 'msg_email', lm: 'msg_loom', fu: 'msg_followup' }
  const KIND = { li: 'linkedin', em: 'email', lm: 'loom', fu: 'followup' }
  const templates = (settings.templates || DEFAULT_TEMPLATES).filter((x) => x.kind === KIND[tab] && x.body.trim())
  const allTemplates = (settings.templates || DEFAULT_TEMPLATES).filter((x) => x.body.trim())
  const curText = l[FIELD[tab]] || ''
  const stillBraces = [...new Set((curText + ' ' + (tab === 'em' ? l.msg_email_subject || '' : '')).match(/\{[a-z_]+\}/g) || [])]
  const applyTemplate = (id) => {
    const tpl = (settings.templates || DEFAULT_TEMPLATES).find((x) => x.id === id)
    if (!tpl) return
    if (curText.trim() && !confirm('Înlocuiești textul de acum cu șablonul?')) return
    const body = renderTemplate(tpl.body, l)
    const patch = { [FIELD[tab]]: body.text }
    if (tab === 'em' && tpl.subject) patch.msg_email_subject = renderTemplate(tpl.subject, l).text
    updateLead(l.id, patch, `Șablon aplicat: ${tpl.name}`)
    if (body.missing.length) notify('Lipsesc: ' + body.missing.map((m) => `{${m}}`).join(', '))
  }

  return (
    <>
      <button className="back" onClick={() => history.length > 1 ? history.back() : go('/lead-uri')}>← Înapoi</button>
      <div className="lead-head">
        <div>
          <h1>{l.name} <Pri p={l.priority} /> <SegChip seg={l.segment} /> {l.demo && <DemoChip />}</h1>
          <p className="muted" style={{ marginTop: 8 }}>{l.type} · {l.country}{l.city && l.city !== 'Nespecificat' ? `, ${l.city}` : ''} · mărime {l.size || '—'} · scor {l.score}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => { markContacted(l.id); notify('Marcat ca trimis; follow-up peste 3 zile') }}>Am trimis mesajul</button>
          <button className="btn danger" onClick={() => { if (confirm(`Ștergi definitiv „${l.name}”?`)) { deleteLead(l.id); go('/lead-uri') } }}>Șterge</button>
        </div>
      </div>

      {l.verify && (
        <div className="verifybar">
          <span><b>Date de verificat.</b> Confirmă abonații, oferta și cum arată montajul lui înainte să faci Loom-ul. Sursa e mai jos.</span>
          <button className="btn sm" onClick={() => updateLead(l.id, { verify: false }, 'Date verificate')}>Am verificat</button>
        </div>
      )}
      <div className="lead-grid">
        <div className="stack">
          <section className="panel">
            <h2>Despre lead</h2>
            <dl className="kv">
              <dt>Ce face</dt><dd>{l.what || '—'}</dd>
              <dt>De ce acum</dt><dd>{l.signal || '—'}</dd>
              <dt>Unghi de abordare</dt><dd>{l.angle || '—'}</dd>
              <dt>Ofertă</dt><dd>{l.offer || '—'}</dd>
              <dt>Cale</dt><dd>{l.approach || '—'}</dd>
              <dt>Pistă</dt><dd>{coach ? 'Coach-i / experți' : 'White label'}</dd>
              <dt>Găsit la</dt><dd>{l.found_at || '—'}</dd>
            </dl>
          </section>

          {coach && (
            <section className="panel">
              <h2>Profil coach / expert</h2>
              <div className="grid2">
                <Field label="Subnișă"><select value={l.subniche || ''} onChange={set('subniche')}><option value="">—</option>{['Business / online income', 'Fitness', 'Expert B2B'].map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Urmăritori / abonați"><input value={l.followers || ''} onChange={set('followers')} placeholder="ex. 45K YouTube" /></Field>
                <Field label="Abonați YouTube (număr, pentru pachet automat)"><input type="number" min="0" value={l.subs ?? ''} onChange={(e) => updateLead(l.id, { subs: e.target.value === '' ? null : Number(e.target.value) })} /></Field>
                <Field label="Ce vinde și cu cât"><input value={l.sells || ''} onChange={set('sells')} placeholder="ex. coaching 1:1, 1.500 $ / lună" /></Field>
              </div>
              <Field label="Probleme concrete de pe profilul lui (câte una pe rând, pentru Loom și mesaje)"><textarea style={{ minHeight: 110 }} value={l.problems || ''} onChange={set('problems')} placeholder={'Prima problemă văzută\nA doua\nA treia'} /></Field>
            </section>
          )}

          {l.demo && (
            <section className="panel">
              <h2>{coach ? 'Loom' : 'Demo'}</h2>
              <Field label={coach ? 'Ce urmărești în profilul lui' : 'Particularitatea de care te legi'}><textarea value={l.demo_note || ''} onChange={set('demo_note')} /></Field>
              <div className="grid2">
                <Field label="Val"><select value={l.demo_wave || ''} onChange={set('demo_wave')}><option value="">Fără val</option>{WAVES.map((w) => <option key={w.id} value={w.id}>{w.label} ({w.dates})</option>)}</select></Field>
                <Field label="Stare"><label className="check"><input type="checkbox" checked={!!l.demo_done} onChange={(e) => updateLead(l.id, { demo_done: e.target.checked }, e.target.checked ? 'Demo făcut' : 'Demo debifat')} /> {coach ? 'Loom făcut' : 'Demo făcut'}</label></Field>
              </div>
              <Field label={coach ? 'Link Loom' : 'Link demo'}><input value={l.demo_url || ''} onChange={set('demo_url')} placeholder="https://" /></Field>
            </section>
          )}

          <section className="panel">
            <div className="msg-head">
              <h2>Mesaje</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value="" onChange={(e) => { applyTemplate(e.target.value); e.target.value = '' }} aria-label="Aplică un șablon">
                  <option value="">{templates.length ? 'Aplică un șablon…' : allTemplates.length ? 'Niciun șablon pentru acest tip' : 'Scrie întâi șabloanele'}</option>
                  {templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                {!coach && <button className="btn sm ghost" onClick={() => { if (confirm('Rescrii mesajele cu ciornele automate (în engleză)? Modificările tale se pierd.')) updateLead(l.id, makeMessages(l), 'Ciorne automate regenerate') }}>Ciorne automate</button>}
              </div>
            </div>
            {!allTemplates.length && <p className="faint" style={{ fontSize: 13.5, margin: '0 0 10px' }}>Încă n-ai scris niciun șablon. <a href="#/sabloane">Scrie-le în tab-ul Șabloane</a>, apoi le aplici aici cu un click.</p>}
            <div className="tabs" role="group" aria-label="Tip mesaj">
              {[['li', 'LinkedIn'], ['em', 'Email'], ['lm', 'Cu Loom'], ['fu', 'Follow-up']].map(([k, n]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{n}</button>)}
            </div>
            {tab === 'em' && <Field label="Subiect"><div style={{ display: 'flex', gap: 8 }}><input value={l.msg_email_subject || ''} onChange={set('msg_email_subject')} /><CopyBtn text={l.msg_email_subject || ''} /></div></Field>}
            <Field label={{ li: 'Mesaj LinkedIn (cerere de conectare sau DM)', em: 'Corp email', lm: 'Mesajul care însoțește Loom-ul', fu: 'Follow-up' }[tab]}>
              <textarea style={{ minHeight: tab === 'em' ? 230 : 140 }} value={curText} onChange={set(FIELD[tab])} placeholder="Scrie aici sau aplică un șablon." />
            </Field>
            {stillBraces.length > 0 && <div className="errbar" style={{ marginBottom: 10 }}><span>Au rămas variabile necompletate: {stillBraces.join(', ')}. Completează-le sau șterge-le înainte să trimiți.</span></div>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <CopyBtn text={curText} label="Copiază mesajul" />
              {tab === 'em' && l.contact_email && <a className="btn sm" href={`mailto:${l.contact_email}?subject=${encodeURIComponent(l.msg_email_subject || '')}&body=${encodeURIComponent(l.msg_email || '')}`}>Deschide în email</a>}
              <span className="faint" style={{ fontSize: 13 }}>{coach ? 'Trimite după ce ai făcut Loom-ul și ai pus linkul în pagină.' : l.demo ? 'Trimite după ce ai făcut demo-ul și ai înlocuit [link demo].' : 'Verifică numele contactului înainte de trimitere.'}</span>
            </div>
          </section>

          <section className="panel">
            <h2>Linkuri</h2>
            <div className="links">
              {links.filter(([, u]) => u !== null).map(([n, u]) => (validUrl(u)
                ? <a key={n} href={u} target="_blank" rel="noreferrer">{n}</a>
                : <span key={n} className="off">{n}: lipsă</span>))}
            </div>
            <h3 className="muted" style={{ margin: '14px 0 6px' }}>Caută-l rapid</h3>
            <div className="links">{quick.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noreferrer">{n}</a>)}</div>
          </section>

          <section className="panel">
            <h2>Contact</h2>
            <div className="grid2">
              <Field label="Persoană de contact"><input value={l.contact || ''} onChange={set('contact')} /></Field>
              <Field label="Email"><input value={l.contact_email || ''} onChange={set('contact_email')} placeholder="nume@firma.com" /></Field>
              <Field label="LinkedIn persoană"><input value={l.contact_linkedin || ''} onChange={set('contact_linkedin')} placeholder="https://linkedin.com/in/…" /></Field>
              <Field label="LinkedIn firmă"><input value={l.linkedin_company || ''} onChange={set('linkedin_company')} /></Field>
              <Field label="Site"><input value={l.site || ''} onChange={set('site')} /></Field>
              <Field label="Oraș"><input value={l.city || ''} onChange={set('city')} /></Field>
            </div>
          </section>
        </div>

        <aside className="stack">
          <section className="panel revbox">
            <h3 className="muted">Potențial revenue</h3>
            <div className="v">{eur(rev)}<span className="muted" style={{ fontSize: 15, fontWeight: 600 }}> / lună</span></div>
            <p className="muted" style={{ fontSize: 13.5 }}>Ponderat pe etapă: {eur(weightedOf(l, settings))} · pe 3 luni: {eur(rev * 3)}</p>
            <div style={{ marginTop: 14 }}>
              <Field label={`Pachet (auto: ${auto})`}>
                <select value={l.package || ''} onChange={set('package')}>
                  <option value="">Auto: {auto}</option>
                  {Object.keys(prices).map((p) => <option key={p} value={p}>{p} · {eur(prices[p])} · {volumes[p]}</option>)}
                </select>
              </Field>
              <Field label="Revenue lunar manual (lasă gol pentru calcul automat)">
                <input type="number" min="0" value={l.revenue_override ?? ''} onChange={(e) => updateLead(l.id, { revenue_override: e.target.value === '' ? null : Number(e.target.value) })} placeholder={String(rev)} />
              </Field>
              <p className="faint" style={{ fontSize: 13 }}>Pachet {pkg}: {volumes[pkg]}. Pilot: {eur(settings.pilotPrice)}.{l.segment === 'ICP-2 Agenție' ? ` Agenție white-label: -${Math.round(settings.whitelabelDiscount * 100)}%.` : ''}</p>
            </div>
          </section>

          <section className="panel">
            <h2>Status</h2>
            <Field label="Etapă"><select value={l.stage} onChange={set('stage')}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <div className="grid2">
              <Field label="Contactat la"><input type="date" value={l.contacted_at || ''} onChange={set('contacted_at')} /></Field>
              <Field label="Follow-up"><input type="date" value={l.followup_at || ''} onChange={set('followup_at')} /></Field>
            </div>
            <div className="grid2">
              <Field label="Prioritate"><select value={l.priority} onChange={set('priority')}>{['A', 'B', 'C'].map((p) => <option key={p}>{p}</option>)}</select></Field>
              <Field label="Segment"><select value={l.segment} onChange={set('segment')}>{Object.entries(SEGMENTS).map(([k, v]) => <option key={k} value={k}>{v.short}</option>)}</select></Field>
            </div>
          </section>

          <section className="panel">
            <h2>Note și activitate</h2>
            <Field label="Note"><textarea value={l.notes || ''} onChange={set('notes')} placeholder="Ce ți-a răspuns, ce obiecții, ce urmează" /></Field>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 6, padding: '8px 10px', background: 'var(--panel)' }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Adaugă o intrare în jurnal" onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) { updateLead(l.id, {}, note.trim()); setNote('') } }} aria-label="Intrare jurnal" />
              <button className="btn sm" onClick={() => { if (note.trim()) { updateLead(l.id, {}, note.trim()); setNote('') } }}>Adaugă</button>
            </div>
            <div className="log">
              {(l.activity || []).length === 0 && <span className="faint">Nicio activitate încă.</span>}
              {(l.activity || []).map((a, i) => <div key={i}><small>{fmtDate(a.t.slice(0, 10))}</small><span>{a.text}</span></div>)}
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
