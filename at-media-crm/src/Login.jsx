import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) setErr('Email sau parolă greșită.')
    setBusy(false)
  }
  return (
    <div className="login">
      <form onSubmit={submit}>
        <h1>CRM AT Media</h1>
        <div className="field"><label htmlFor="em">Email</label><input id="em" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="field"><label htmlFor="pw">Parolă</label><input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
        {err && <div className="errbar">{err}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Se verifică…' : 'Intră'}</button>
      </form>
    </div>
  )
}
