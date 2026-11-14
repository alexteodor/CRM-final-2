import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { hasSupabase, supabase } from './supabase'
import { DEFAULT_SETTINGS, today, addDays } from './calc'

const Ctx = createContext(null)
export const useCrm = () => useContext(Ctx)

const LS_LEADS = 'atm_crm_leads_v1'
const LS_SET = 'atm_crm_settings_v1'

const safeGet = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const safeSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* plin sau blocat */ } }

async function fetchSeed() {
  const r = await fetch('/seed.json')
  if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('Datele inițiale nu sunt pe site (intenționat, ca să nu fie publice). Importă fișierul data/seed.json din pagina Import / Export.')
  return r.json()
}

async function loadRemote() {
  let all = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('leads').select('id,data').range(from, from + 999)
    if (error) throw error
    all = all.concat(data.map((x) => x.data))
    if (data.length < 1000) break
  }
  const { data: s } = await supabase.from('settings').select('value').eq('key', 'app').maybeSingle()
  return { leads: all, settings: s?.value || null }
}

export function CrmProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!hasSupabase)
  const [leads, setLeads] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('saved')
  const [toast, setToast] = useState('')
  const pending = useRef(new Set())
  const timer = useRef(null)
  const leadsRef = useRef([])
  leadsRef.current = leads
  const settingsRef = useRef(DEFAULT_SETTINGS)
  settingsRef.current = settings

  const notify = useCallback((m) => {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }, [])

  useEffect(() => {
    if (!hasSupabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!authReady) return
    if (hasSupabase && !session) { setReady(false); return }
    let cancelled = false
    ;(async () => {
      try {
        if (hasSupabase) {
          const r = await loadRemote()
          if (cancelled) return
          setLeads(r.leads)
          setSettings({ ...DEFAULT_SETTINGS, ...(r.settings || {}) })
        } else {
          let l = safeGet(LS_LEADS)
          if (!l || !l.length) { try { l = await fetchSeed(); safeSet(LS_LEADS, l) } catch { l = [] } }
          if (cancelled) return
          setLeads(l)
          setSettings({ ...DEFAULT_SETTINGS, ...(safeGet(LS_SET) || {}) })
        }
        setReady(true)
      } catch (e) {
        setError(e.message || String(e))
        setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [authReady, session])

  const flush = useCallback(async () => {
    const ids = [...pending.current]
    pending.current.clear()
    if (!ids.length) return
    try {
      if (hasSupabase) {
        const byId = new Map(leadsRef.current.map((l) => [l.id, l]))
        const rows = ids.filter((id) => byId.has(id)).map((id) => ({ id, data: byId.get(id), updated_at: new Date().toISOString() }))
        for (let i = 0; i < rows.length; i += 200) {
          const { error: e } = await supabase.from('leads').upsert(rows.slice(i, i + 200))
          if (e) throw e
        }
      } else {
        safeSet(LS_LEADS, leadsRef.current)
      }
      setSaving('saved')
    } catch (e) {
      setSaving('error')
      setError('Nu s-a salvat: ' + (e.message || e))
    }
  }, [])

  const queue = useCallback((ids) => {
    ids.forEach((id) => pending.current.add(id))
    setSaving('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 600)
  }, [flush])

  const updateLead = useCallback((id, patch, logText, kind) => {
    setLeads((prev) => prev.map((l) => {
      if (l.id !== id) return l
      const next = { ...l, ...patch }
      const log = []
      if (patch.stage && patch.stage !== l.stage) {
        log.push(`Etapă: ${l.stage} → ${patch.stage}`)
        if (patch.stage === 'Pierdut') next.lost_from = l.stage
      }
      if (logText) log.push(logText)
      if (log.length) next.activity = [...log.map((text, i) => ({ t: new Date().toISOString(), text, ...(kind && text === logText ? { k: kind } : {}) })), ...(l.activity || [])]
      return next
    }))
    queue([id])
  }, [queue])

  const markContacted = useCallback((id) => {
    const l = leadsRef.current.find((x) => x.id === id)
    if (!l) return
    const d0 = (settingsRef.current.followupDays || [3])[0]
    updateLead(id, { stage: l.stage === 'Găsit' ? 'Contactat' : l.stage, contacted_at: today(), followup_at: addDays(today(), d0), followups: 0 }, `Mesaj trimis; follow-up peste ${d0} zile`, 'sent')
  }, [updateLead])

  const addLeads = useCallback((list) => {
    setLeads((prev) => [...prev, ...list])
    queue(list.map((l) => l.id))
  }, [queue])

  const mergeLeads = useCallback((list) => {
    setLeads((prev) => {
      const map = new Map(list.map((l) => [l.id, l]))
      return prev.map((l) => (map.has(l.id) ? { ...l, ...map.get(l.id) } : l))
    })
    queue(list.map((l) => l.id))
  }, [queue])

  const deleteLead = useCallback(async (id) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    if (hasSupabase) await supabase.from('leads').delete().eq('id', id)
    else safeSet(LS_LEADS, leadsRef.current.filter((l) => l.id !== id))
  }, [])

  const resetToSeed = useCallback(async () => {
    const seed = await fetchSeed()
    if (hasSupabase) {
      await supabase.from('leads').delete().neq('id', '')
      for (let i = 0; i < seed.length; i += 200) {
        const { error: e } = await supabase.from('leads').upsert(seed.slice(i, i + 200).map((d) => ({ id: d.id, data: d })))
        if (e) throw e
      }
    } else safeSet(LS_LEADS, seed)
    setLeads(seed)
    notify('Date reîncărcate din seed')
  }, [notify])

  const loadSeedIfEmpty = useCallback(async () => {
    let seed
    try { seed = await fetchSeed() } catch (e) { setError(e.message); return }
    if (hasSupabase) {
      for (let i = 0; i < seed.length; i += 200) {
        const { error: e } = await supabase.from('leads').upsert(seed.slice(i, i + 200).map((d) => ({ id: d.id, data: d })))
        if (e) { setError(e.message); return }
      }
    } else safeSet(LS_LEADS, seed)
    setLeads(seed)
    notify(`${seed.length} lead-uri importate`)
  }, [notify])

  const saveSettings = useCallback(async (next) => {
    setSettings(next)
    if (hasSupabase) {
      const { error: e } = await supabase.from('settings').upsert({ key: 'app', value: next })
      if (e) setError(e.message)
    } else safeSet(LS_SET, next)
  }, [])

  const signOut = useCallback(() => supabase?.auth.signOut(), [])

  const value = useMemo(() => ({
    leads, settings, ready, error, setError, saving, toast, notify, session, authReady,
    updateLead, markContacted, addLeads, mergeLeads, deleteLead, resetToSeed, loadSeedIfEmpty, saveSettings, signOut,
    mode: hasSupabase ? 'cloud' : 'local',
  }), [leads, settings, ready, error, saving, toast, session, authReady, updateLead, markContacted, addLeads, mergeLeads, deleteLead, resetToSeed, loadSeedIfEmpty, saveSettings, signOut, notify])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
