import { useState } from 'react'
import { useCrm } from './store'
import { DEFAULT_SETTINGS, STAGES, eur } from './calc'

export default function Settings() {
  const { settings, saveSettings, updateLead, leads, notify } = useCrm()
  const [s, setS] = useState(settings)
  const num = (v) => (v === '' ? 0 : Number(v))
  const save = () => { saveSettings(s); notify('Setări salvate') }
  const clearOverrides = () => {
    if (!confirm('Revii la pachetele calculate automat pentru toate lead-urile?')) return
    leads.filter((l) => l.package).forEach((l) => updateLead(l.id, { package: '' }))
    notify('Pachetele sunt din nou automate')
  }
  return (
    <>
      <div className="page-head"><div><h1>Setări</h1><p>Prețurile și pragurile care calculează potențialul de revenue pentru fiecare lead. Se aplică imediat peste tot.</p></div><button className="btn primary" onClick={save}>Salvează setările</button></div>
      <div className="settings-grid">
        <section className="panel">
          <h2>Prețuri pachete (€ / lună)</h2>
          {Object.keys(s.prices).map((p) => (
            <div className="setrow" key={p}><label htmlFor={'p' + p}><b>{p}</b> <span className="muted">{s.volumes[p]}</span></label><input id={'p' + p} type="number" min="0" value={s.prices[p]} onChange={(e) => setS({ ...s, prices: { ...s.prices, [p]: num(e.target.value) } })} /></div>
          ))}
          <div className="setrow"><label htmlFor="wl">Reducere agenții white-label (0–1)</label><input id="wl" type="number" step="0.05" min="0" max="1" value={s.whitelabelDiscount} onChange={(e) => setS({ ...s, whitelabelDiscount: num(e.target.value) })} /></div>
          <div className="setrow"><label htmlFor="pi">Preț pilot</label><input id="pi" type="number" value={s.pilotPrice} onChange={(e) => setS({ ...s, pilotPrice: num(e.target.value) })} /></div>
          <p className="faint" style={{ fontSize: 13 }}>Prețurile inițiale sunt cu ~15% peste cele actuale (690, 1.290, 2.490 €). Exemplu: Growth = {eur(s.prices.Growth)}.</p>
        </section>
        <section className="panel">
          <h2>Pachete coach-i (€ / lună)</h2>
          {Object.keys(DEFAULT_SETTINGS.coachPrices).map((p) => (
            <div className="setrow" key={p}><label htmlFor={'c' + p}><b>{p}</b> <span className="muted">{(s.coachVolumes || DEFAULT_SETTINGS.coachVolumes)[p]}</span></label><input id={'c' + p} type="number" min="0" value={(s.coachPrices || DEFAULT_SETTINGS.coachPrices)[p]} onChange={(e) => setS({ ...s, coachPrices: { ...(s.coachPrices || DEFAULT_SETTINGS.coachPrices), [p]: num(e.target.value) } })} /></div>
          ))}
          <div className="setrow"><label htmlFor="cg">Growth de la abonați (YouTube)</label><input id="cg" type="number" step="10000" value={s.coachGrowthSubs ?? DEFAULT_SETTINGS.coachGrowthSubs} onChange={(e) => setS({ ...s, coachGrowthSubs: num(e.target.value) })} /></div>
          <p className="faint" style={{ fontSize: 13 }}>Sub prag sau fără număr de abonați = Start. Pe fiecare lead poți alege alt pachet.</p>
        </section>
        <section className="panel">
          <h2>Ritm zilnic (tab-ul Azi)</h2>
          <div className="setrow"><label htmlFor="dc">Mesaje noi pe zi</label><input id="dc" type="number" min="0" value={(s.daily || DEFAULT_SETTINGS.daily).contacts} onChange={(e) => setS({ ...s, daily: { ...(s.daily || DEFAULT_SETTINGS.daily), contacts: num(e.target.value) } })} /></div>
          <div className="setrow"><label htmlFor="dl2">Loom-uri / demo-uri pe zi</label><input id="dl2" type="number" min="0" value={(s.daily || DEFAULT_SETTINGS.daily).looms} onChange={(e) => setS({ ...s, daily: { ...(s.daily || DEFAULT_SETTINGS.daily), looms: num(e.target.value) } })} /></div>
          <div className="setrow"><label htmlFor="ds">Cât din ele pentru coach-i (0–1)</label><input id="ds" type="number" step="0.1" min="0" max="1" value={(s.daily || DEFAULT_SETTINGS.daily).coachShare} onChange={(e) => setS({ ...s, daily: { ...(s.daily || DEFAULT_SETTINGS.daily), coachShare: num(e.target.value) } })} /></div>
          <div className="setrow"><label htmlFor="fd">Zile până la follow-up (1, 2, 3)</label><input id="fd" value={(s.followupDays || DEFAULT_SETTINGS.followupDays).join(', ')} onChange={(e) => { const a = e.target.value.split(/[,\s]+/).map(Number).filter((n) => n > 0); setS({ ...s, followupDays: a.length ? a : DEFAULT_SETTINGS.followupDays }) }} /></div>
          <p className="faint" style={{ fontSize: 13 }}>Dacă ai marcat deja mesaje azi, ținta rămasă scade. După ultimul follow-up lead-ul trece la „De decis”.</p>
        </section>
        <section className="panel">
          <h2>Cum se alege pachetul automat (white label)</h2>
          <div className="setrow"><label htmlFor="ga">Growth de la reclame active</label><input id="ga" type="number" value={s.thresholds.growthAds} onChange={(e) => setS({ ...s, thresholds: { ...s.thresholds, growthAds: num(e.target.value) } })} /></div>
          <div className="setrow"><label htmlFor="sa">Scale de la reclame active</label><input id="sa" type="number" value={s.thresholds.scaleAds} onChange={(e) => setS({ ...s, thresholds: { ...s.thresholds, scaleAds: num(e.target.value) } })} /></div>
          <div className="setrow"><label htmlFor="gs">YouTube: Growth de la abonați</label><input id="gs" type="number" step="10000" value={s.thresholds.growthSubs} onChange={(e) => setS({ ...s, thresholds: { ...s.thresholds, growthSubs: num(e.target.value) } })} /></div>
          <p className="faint" style={{ fontSize: 13, marginBottom: 12 }}>Sub prag = Start. Agențiile și lead-urile fără număr de reclame se încadrează după mărime.</p>
          <button className="btn" onClick={clearOverrides}>Șterge pachetele alese manual</button>
        </section>
        <section className="panel">
          <h2>Șanse pe etapă (pentru revenue ponderat)</h2>
          {STAGES.map((st) => (
            <div className="setrow" key={st}><label htmlFor={'s' + st}>{st}</label><input id={'s' + st} type="number" step="0.05" min="0" max="1" value={s.probs[st]} onChange={(e) => setS({ ...s, probs: { ...s.probs, [st]: num(e.target.value) } })} /></div>
          ))}
        </section>
        <section className="panel">
          <h2>Obiectiv</h2>
          <div className="setrow"><label htmlFor="gc">Clienți noi țintă</label><input id="gc" type="number" value={s.goalClients} onChange={(e) => setS({ ...s, goalClients: num(e.target.value) })} /></div>
          <div className="setrow"><label htmlFor="dl">Termen</label><input id="dl" type="date" value={s.deadline} onChange={(e) => setS({ ...s, deadline: e.target.value })} /></div>
          <button className="btn ghost" onClick={() => setS({ ...DEFAULT_SETTINGS, templates: s.templates })}>Revino la valorile inițiale</button>
        </section>
      </div>
    </>
  )
}
