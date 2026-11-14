import { useEffect, useMemo, useRef, useState } from 'react'
import { useCrm } from './store'
import { DEFAULT_TEMPLATES, TEMPLATE_KINDS, TEMPLATE_VARS, renderTemplate, trackOf } from './calc'
import { CopyBtn } from './ui'

export default function Templates() {
  const { settings, saveSettings, leads } = useCrm()
  const [list, setList] = useState(settings.templates || DEFAULT_TEMPLATES)
  const [sel, setSel] = useState((settings.templates || DEFAULT_TEMPLATES)[0]?.id)
  const [leadId, setLeadId] = useState('')
  const [saved, setSaved] = useState(true)
  const ta = useRef()
  const first = useRef(true)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    if (first.current) { first.current = false; return }
    setSaved(false)
    const id = setTimeout(async () => { await saveSettings({ ...settingsRef.current, templates: list }); setSaved(true) }, 800)
    return () => clearTimeout(id)
  }, [list, saveSettings])

  const cur = list.find((x) => x.id === sel) || list[0]
  const patch = (p) => setList((a) => a.map((x) => (x.id === cur.id ? { ...x, ...p } : x)))
  const sample = useMemo(() => [...leads].sort((a, b) => (trackOf(b) === 'coach') - (trackOf(a) === 'coach') || (b.score || 0) - (a.score || 0)), [leads])
  const lead = leads.find((l) => l.id === leadId) || sample[0]
  const prevBody = cur && lead ? renderTemplate(cur.body, lead) : { text: '', missing: [] }
  const prevSub = cur && lead ? renderTemplate(cur.subject, lead) : { text: '', missing: [] }
  const missing = [...new Set([...prevBody.missing, ...prevSub.missing])]

  const insert = (v) => {
    const el = ta.current
    const tag = `{${v}}`
    if (!el) return patch({ body: (cur.body || '') + tag })
    const a = el.selectionStart ?? cur.body.length, b = el.selectionEnd ?? a
    patch({ body: cur.body.slice(0, a) + tag + cur.body.slice(b) })
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + tag.length, a + tag.length) })
  }
  const add = () => {
    const id = 't' + Date.now()
    setList((a) => [...a, { id, name: 'Șablon nou', kind: 'linkedin', subject: '', body: '' }])
    setSel(id)
  }
  const dup = () => { const id = 't' + Date.now(); setList((a) => [...a, { ...cur, id, name: cur.name + ' (copie)' }]); setSel(id) }
  const del = () => {
    if (!confirm(`Ștergi șablonul „${cur.name}”?`)) return
    const rest = list.filter((x) => x.id !== cur.id)
    setList(rest); setSel(rest[0]?.id)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Șabloane</h1>
          <p>Mesajele rămân ale tale: scrii tu textul, iar variabilele (ex. {'{prenume}'}) se completează singure din lead. {saved ? 'Salvat.' : 'Se salvează…'}</p>
        </div>
        <button className="btn primary" onClick={add}>Șablon nou</button>
      </div>
      <div className="tpl-grid">
        <aside className="panel tpl-list">
          {Object.entries(TEMPLATE_KINDS).map(([k, label]) => {
            const items = list.filter((x) => x.kind === k)
            if (!items.length) return null
            return (
              <div key={k}>
                <h3 className="muted">{label}</h3>
                {items.map((x) => (
                  <button key={x.id} className="tpl-item" aria-current={cur?.id === x.id ? 'true' : undefined} onClick={() => setSel(x.id)}>
                    <span>{x.name}</span>
                    <small className={x.body.trim() ? 'good' : 'faint'}>{x.body.trim() ? `${x.body.trim().split(/\s+/).length} cuvinte` : 'gol'}</small>
                  </button>
                ))}
              </div>
            )
          })}
        </aside>

        {cur ? (
          <div className="stack">
            <section className="panel">
              <div className="grid2">
                <div className="field"><label>Nume șablon</label><input value={cur.name} onChange={(e) => patch({ name: e.target.value })} /></div>
                <div className="field"><label>Pentru</label><select value={cur.kind} onChange={(e) => patch({ kind: e.target.value })}>{Object.entries(TEMPLATE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              {cur.kind === 'email' && <div className="field"><label>Subiect</label><input value={cur.subject} onChange={(e) => patch({ subject: e.target.value })} placeholder="Subiectul emailului" /></div>}
              <div className="field">
                <label>Mesaj</label>
                <textarea ref={ta} style={{ minHeight: 220 }} value={cur.body} onChange={(e) => patch({ body: e.target.value })} placeholder="Scrie mesajul tău aici, cu vocea ta. Apasă pe o variabilă de mai jos ca s-o pui în text." />
                <div className="faint" style={{ fontSize: 13 }}>{cur.body.length} caractere</div>
              </div>
              <div className="vars" aria-label="Variabile">
                {TEMPLATE_VARS.map(([v, d]) => <button key={v} className="chip" title={d} onClick={() => insert(v)}>{`{${v}}`}</button>)}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn sm" onClick={dup}>Duplică</button>
                <button className="btn sm danger" onClick={del}>Șterge</button>
              </div>
            </section>

            <section className="panel">
              <div className="msg-head">
                <h2>Cum arată pe un lead real</h2>
                <select value={lead?.id || ''} onChange={(e) => setLeadId(e.target.value)} aria-label="Lead pentru previzualizare" style={{ maxWidth: 260 }}>
                  {sample.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              {missing.length > 0 && <div className="errbar" style={{ margin: '4px 0 10px' }}><span>Pentru acest lead lipsesc: {missing.map((m) => `{${m}}`).join(', ')}. Completează-le în pagina lead-ului înainte să trimiți.</span></div>}
              {cur.kind === 'email' && prevSub.text && <p style={{ marginBottom: 8 }}><b>Subiect:</b> {prevSub.text}</p>}
              <pre className="preview">{prevBody.text || 'Scrie șablonul ca să-l vezi aici.'}</pre>
              <CopyBtn text={prevBody.text} label="Copiază textul" />
            </section>
          </div>
        ) : <div className="empty">Niciun șablon. Apasă „Șablon nou”.</div>}
      </div>
    </>
  )
}
