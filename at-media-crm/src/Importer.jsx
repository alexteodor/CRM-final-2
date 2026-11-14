import { useRef, useState } from 'react'
import { useCrm } from './store'
import { makeMessages } from './calc'
import { download } from './ui'

const MAP = {
  'Prioritate': 'priority', 'Scor (0-10)': 'score', 'Scor': 'score', 'Firmă': 'name', 'Tip': 'type', 'Țară': 'country', 'Oraș': 'city', 'Mărime': 'size',
  'Ce fac': 'what', 'Semnal (de ce acum)': 'signal', 'Semnal': 'signal', 'Unghi pentru mesaj': 'angle', 'Site': 'site', 'LinkedIn firmă': 'linkedin_company',
  'Persoană de contact': 'contact', 'LinkedIn persoană': 'contact_linkedin', 'Etapă': 'stage', 'Data contact': 'contacted_at', 'Răspuns / note': 'notes',
  'Sursă semnal': 'source', 'Găsit la': 'found_at', 'Ofertă': 'offer', 'Cale de abordare': 'approach', 'Particularitate pentru demo': 'demo_note',
  'Segment': 'segment', 'Valul de demo': 'demo_wave',
  'Pistă': 'track', 'Nișă': 'subniche', 'Urmăritori': 'followers', 'Ce vinde': 'sells', 'Probleme': 'problems',
}
const SEGS = ['ICP-1 DTC', 'ICP-2 Agenție', 'ICP-3 Angajează', 'ICP-4 YouTube', 'C-1 Business', 'C-2 Fitness', 'C-3 B2B']
const slug = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const cg = (c = '') => { const x = c.toLowerCase(); return x.startsWith('sua') ? 'SUA' : /^uk|marea britanie|regatul unit/.test(x) ? 'UK' : x.includes('nespecificat') || !x ? '—' : 'UE / alte țări' }

function toLead(r, i) {
  const o = {}
  Object.entries(MAP).forEach(([h, k]) => { if (r[h] !== undefined) o[k] = String(r[h] ?? '').trim() })
  if (!o.name) return null
  const demoNote = o.demo_note || ''
  const wave = (o.demo_wave || '').match(/S\d/)?.[0] || ''
  const seg = SEGS.includes(o.segment) ? o.segment : /agen/i.test(o.offer || o.type || '') || (o.offer || '').startsWith('2') ? 'ICP-2 Agenție' : /youtube/i.test(o.offer || o.type || '') ? 'ICP-4 YouTube' : o.approach === 'Job activ' ? 'ICP-3 Angajează' : 'ICP-1 DTC'
  const ads = (`${o.signal || ''} ${o.what || ''}`.match(/~?(\d{2,3})\+?\s+(?:de\s+)?reclame/) || [])[1]
  const lead = {
    id: slug(o.name) || 'lead-' + i, priority: ['A', 'B', 'C'].includes(o.priority) ? o.priority : 'B', score: Number(o.score) || 0,
    name: o.name, type: o.type || '', country: o.country || 'Nespecificat', country_group: cg(o.country), city: o.city || '', size: o.size || '', what: o.what || '', signal: o.signal || '', angle: o.angle || '',
    site: o.site || '', linkedin_company: o.linkedin_company || '', contact: o.contact || '', contact_linkedin: o.contact_linkedin || '',
    contact_email: (o.contact || '').match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] || '', stage: ['Găsit', 'Contactat', 'Răspuns', 'Apel', 'Demo trimis', 'Pilot', 'Semnat', 'Pierdut'].includes(o.stage) ? o.stage : 'Găsit',
    contacted_at: o.contacted_at || '', followup_at: '', notes: o.notes || '', source: o.source || '', found_at: o.found_at || '', offer: o.offer || '', approach: o.approach || '',
    demo: Boolean(demoNote), demo_note: demoNote, demo_wave: wave, demo_done: false, demo_url: '', segment: seg, package: '', revenue_override: null,
    ads_count: ads ? Number(ads) : null, subs: null, activity: [],
    track: ['coach', 'white_label'].includes(o.track) ? o.track : seg.startsWith('C-') ? 'coach' : 'white_label', subniche: o.subniche || '', followers: o.followers || '', sells: o.sells || '', problems: o.problems || '',
  }
  return lead.track === 'coach' ? { ...lead, msg_linkedin: '', msg_email_subject: '', msg_email: '', msg_loom: '', msg_followup: '' } : { ...lead, ...makeMessages(lead) }
}

export default function Importer() {
  const { leads, addLeads, mergeLeads, resetToSeed, notify } = useCrm()
  const [prep, setPrep] = useState(null)
  const [mode, setMode] = useState('new')
  const [err, setErr] = useState('')
  const ref = useRef()

  const onFile = async (f) => {
    if (!f) return
    setErr('')
    try {
      let rows, parsed0
      if (/\.json$/i.test(f.name)) {
        rows = JSON.parse(await f.text())
        if (!Array.isArray(rows) || !rows[0]?.name) throw new Error('Fișierul JSON nu e o listă de lead-uri.')
        parsed0 = rows
      } else {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' })
        const sheet = wb.Sheets['Lead-uri'] || wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        parsed0 = rows.map(toLead)
      }
      const known = new Set(leads.map((l) => l.id))
      const seen = new Set()
      const parsed = parsed0.filter(Boolean).filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true })
      const fresh = parsed.filter((l) => !known.has(l.id))
      const existing = parsed.filter((l) => known.has(l.id))
      if (!parsed.length) throw new Error('Nu am găsit lead-uri. Prima coloană-cheie trebuie să se numească „Firmă”.')
      setPrep({ name: f.name, rows: rows.length, fresh, existing })
    } catch (e) { setErr(e.message || String(e)); setPrep(null) }
  }
  const confirm = () => {
    addLeads(prep.fresh)
    if (mode === 'update' && prep.existing.length) {
      const keep = ({ priority, score, type, country, country_group, city, size, what, signal, angle, site, linkedin_company, contact, contact_linkedin, contact_email, source, offer, approach, id }) => ({ priority, score, type, country, country_group, city, size, what, signal, angle, site, linkedin_company, contact, contact_linkedin, contact_email, source, offer, approach, id })
      mergeLeads(prep.existing.map(keep))
    }
    notify(`${prep.fresh.length} lead-uri adăugate${mode === 'update' ? `, ${prep.existing.length} actualizate` : ''}`)
    setPrep(null)
  }

  const exportRows = () => leads.map((l) => ({
    'Prioritate': l.priority, 'Scor (0-10)': l.score, 'Firmă': l.name, 'Tip': l.type, 'Țară': l.country, 'Oraș': l.city, 'Mărime': l.size, 'Ce fac': l.what, 'Semnal (de ce acum)': l.signal,
    'Unghi pentru mesaj': l.angle, 'Site': l.site, 'LinkedIn firmă': l.linkedin_company, 'Persoană de contact': l.contact, 'LinkedIn persoană': l.contact_linkedin, 'Email': l.contact_email,
    'Etapă': l.stage, 'Data contact': l.contacted_at, 'Follow-up': l.followup_at, 'Răspuns / note': l.notes, 'Sursă semnal': l.source, 'Găsit la': l.found_at, 'Ofertă': l.offer,
    'Cale de abordare': l.approach, 'Particularitate pentru demo': l.demo_note, 'Segment': l.segment, 'Valul de demo': l.demo_wave, 'Demo făcut': l.demo_done ? 'DA' : '', 'Link demo': l.demo_url,
    'Pachet': l.package, 'Revenue manual': l.revenue_override ?? '', 'Pistă': l.track || '', 'Nișă': l.subniche || '', 'Urmăritori': l.followers || '', 'Ce vinde': l.sells || '', 'Probleme': l.problems || '', 'Mesaj LinkedIn': l.msg_linkedin, 'Subiect email': l.msg_email_subject, 'Mesaj email': l.msg_email, 'Mesaj Loom': l.msg_loom || '', 'Follow-up mesaj': l.msg_followup,
  }))
  const exportXlsx = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows()), 'Lead-uri')
    XLSX.writeFile(wb, 'crm-at-media-lead-uri.xlsx')
  }
  const exportCsv = async () => { const XLSX = await import('xlsx'); download('crm-at-media-lead-uri.csv', new Blob(['﻿' + XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportRows()))], { type: 'text/csv;charset=utf-8' })) }

  return (
    <>
      <div className="page-head"><div><h1>Import / Export</h1><p>Importă Excelul cu lead-uri (aceleași coloane ca în Sheet-ul tău) sau descarcă tot ce ai în CRM, cu etape, note și mesaje.</p></div></div>
      <div className="two">
        <section className="panel">
          <h2>Importă din Excel, CSV sau seed.json</h2>
          <div className="import-drop">
            <p style={{ marginBottom: 12 }}>Alege un fișier .xlsx, .csv sau .json. Pentru lead-urile din campanie alege data/seed.json din proiect; pentru doar lead-urile de coach-i, data/coach-leads.json. La Excel, foaia „Lead-uri” se folosește automat, altfel prima foaie.</p>
            <input ref={ref} type="file" accept=".xlsx,.xls,.csv,.json" onChange={(e) => onFile(e.target.files[0])} aria-label="Fișier de importat" />
          </div>
          {err && <div className="errbar" style={{ marginTop: 12 }}>{err}</div>}
          {prep && (
            <div style={{ marginTop: 14 }}>
              <p><b>{prep.name}</b>: {prep.rows} rânduri citite, {prep.fresh.length} lead-uri noi, {prep.existing.length} există deja (după nume).</p>
              <div className="field" style={{ marginTop: 10 }}>
                <label><input type="radio" checked={mode === 'new'} onChange={() => setMode('new')} /> Adaugă doar lead-urile noi</label>
                <label><input type="radio" checked={mode === 'update'} onChange={() => setMode('update')} /> Adaugă noile lead-uri și actualizează datele celor existente (etapa, notele și mesajele tale rămân)</label>
              </div>
              <button className="btn primary" onClick={confirm} disabled={!prep.fresh.length && !(mode === 'update' && prep.existing.length)}>Importă</button>{' '}
              <button className="btn ghost" onClick={() => { setPrep(null); if (ref.current) ref.current.value = '' }}>Anulează</button>
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Exportă</h2>
          <p className="muted" style={{ marginBottom: 12 }}>{leads.length} lead-uri, cu toate câmpurile.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={exportXlsx}>Descarcă Excel</button>
            <button className="btn" onClick={exportCsv}>Descarcă CSV</button>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '20px 0' }} />
          <h2>Date inițiale</h2>
          <p className="muted" style={{ margin: '8px 0 12px' }}>Șterge tot și reîncarcă lead-urile din campanie (merge direct doar la testare locală; pe site importă data/seed.json). Etapele, notele și modificările tale se pierd.</p>
          <button className="btn danger" onClick={async () => { if (confirm('Ștergi tot ce ai în CRM și reîncarci datele inițiale?')) { try { await resetToSeed() } catch (e) { setErr(e.message) } } }}>Resetează la datele inițiale</button>
        </section>
      </div>
    </>
  )
}
