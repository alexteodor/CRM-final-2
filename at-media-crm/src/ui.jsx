import { useEffect, useState } from 'react'
import { SEGMENTS, STAGES } from './calc'
import { useCrm } from './store'

export function useHash() {
  const [h, setH] = useState(window.location.hash.slice(1) || '/azi')
  useEffect(() => {
    const f = () => setH(window.location.hash.slice(1) || '/azi')
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return h
}
export const go = (p) => { window.location.hash = p }

export function SegChip({ seg }) {
  const s = SEGMENTS[seg]
  if (!s) return null
  return <span className="chip"><i style={{ background: s.color }} />{s.short}</span>
}
export const Pri = ({ p }) => <span className={`pri ${p}`}>{p}</span>
export const DemoChip = () => <span className="chip good">Demo</span>

export function StageSelect({ lead }) {
  const { updateLead } = useCrm()
  return (
    <select value={lead.stage} onClick={(e) => e.stopPropagation()} onChange={(e) => updateLead(lead.id, { stage: e.target.value })} aria-label="Etapă">
      {STAGES.map((s) => <option key={s}>{s}</option>)}
    </select>
  )
}

export function CopyBtn({ text, label = 'Copiază' }) {
  const { notify } = useCrm()
  return (
    <button className="btn sm" onClick={async () => {
      try { await navigator.clipboard.writeText(text); notify('Copiat') } catch { notify('Nu am putut copia; selectează textul manual') }
    }}>{label}</button>
  )
}

export function download(name, blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function TrackToggle({ track, setTrack }) {
  const opts = [['', 'Toate'], ['coach', 'Coach-i'], ['white_label', 'White label']]
  return (
    <div className="tabs trackbar" role="group" aria-label="Pistă">
      {opts.map(([k, n]) => <button key={k} aria-pressed={track === k} onClick={() => setTrack(k)}>{n}</button>)}
    </div>
  )
}
