import { addDays, daysBetween, fmtDate, trackOf } from './calc'

// Ordinea secțiunilor = ordinea în care lucrezi: mai întâi oamenii care deja răspund, la urmă contactările noi.
export const SECTIONS = [
  ['reply', 'Răspunsuri și apeluri', 'Oameni care au răspuns deja. Aici sunt banii cei mai aproape.'],
  ['followup', 'Follow-up-uri scadente', 'Mesaje trimise la care n-ai primit răspuns.'],
  ['decide', 'De decis', 'Au primit toate follow-up-urile și tot nu răspund.'],
  ['send', 'Gata de trimis', 'Loom-ul sau demo-ul e făcut, mai trebuie trimis.'],
  ['loom', 'Loom-uri de făcut', 'Pregătirea înainte de primul mesaj.'],
  ['contact', 'Contactări noi', 'Primul mesaj, fără demo.'],
]

const PRI = { A: 0, B: 1, C: 2 }
const byPriority = (a, b) => (PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3) || (b.score || 0) - (a.score || 0)

export const dayOf = (iso) => (iso || '').slice(0, 10)

// Câte acțiuni de un anumit fel ai făcut azi (din jurnalul fiecărui lead).
export function doneToday(leads, t) {
  const c = { sent: 0, followup: 0, loom: 0, reply: 0 }
  leads.forEach((l) => (l.activity || []).forEach((a) => { if (a.k && dayOf(a.t) === t && a.k in c) c[a.k]++ }))
  return c
}

// Amestecă două liste după proporția ceruta (ex. 70% coach-i), fără să rămână locuri goale dacă una e mai scurtă.
function mix(coach, wl, n, share) {
  if (n <= 0) return []
  const wantC = Math.min(coach.length, Math.round(n * share))
  const pickC = coach.slice(0, wantC)
  const pickW = wl.slice(0, n - pickC.length)
  const rest = n - pickC.length - pickW.length
  const extra = rest > 0 ? coach.slice(wantC, wantC + rest) : []
  return [...pickC, ...pickW, ...extra].sort(byPriority)
}

export function buildTasks(leads, settings, t, track) {
  const maxFu = (settings.followupDays || [3, 4, 7]).length
  const q = settings.daily || { contacts: 8, looms: 4, coachShare: 0.7 }
  const done = doneToday(leads, t)
  const open = leads.filter((l) => l.stage !== 'Pierdut' && l.stage !== 'Semnat' && (!track || trackOf(l) === track) && !(l.snooze_until && l.snooze_until > t))
  const out = []
  const mk = (kind, l, text, why, extra = {}) => out.push({ kind, lead: l, text, why, key: kind + ':' + l.id, ...extra })

  open.filter((l) => l.stage === 'Răspuns').sort(byPriority).forEach((l) => {
    const since = l.contacted_at ? daysBetween(l.contacted_at, t) : null
    mk('reply', l, `Răspunde lui ${l.name}`, since !== null && since >= 0 ? `a răspuns la mesajul de acum ${since} zile` : 'a răspuns la mesajul tău')
  })
  open.filter((l) => l.stage === 'Apel' && (!l.followup_at || l.followup_at <= t)).sort(byPriority).forEach((l) => {
    mk('reply', l, `Apel cu ${l.name}: ține-l sau fixează ora`, l.followup_at ? `era programat pentru ${fmtDate(l.followup_at)}` : 'încă nu e fixată data')
  })

  open.filter((l) => ['Contactat', 'Demo trimis', 'Pilot'].includes(l.stage) && l.followup_at && l.followup_at <= t)
    .sort((a, b) => a.followup_at.localeCompare(b.followup_at) || byPriority(a, b))
    .forEach((l) => {
      const n = l.followups || 0
      const late = daysBetween(l.followup_at, t)
      const lateTxt = late > 0 ? `întârziat cu ${late} ${late === 1 ? 'zi' : 'zile'}` : 'scadent azi'
      if (n >= maxFu) mk('decide', l, `${l.name} nu răspunde: mai încerci sau închizi?`, `${n} follow-up-uri trimise, ${lateTxt}`)
      else mk('followup', l, `Follow-up ${n + 1} pentru ${l.name}`, `mesaj trimis ${l.contacted_at ? fmtDate(l.contacted_at) : '—'}, ${lateTxt}`, { n })
    })

  const fresh = open.filter((l) => l.stage === 'Găsit')
  fresh.filter((l) => l.demo_done || l.demo_url).sort(byPriority).forEach((l) => {
    mk('send', l, `Trimite lui ${l.name} ${trackOf(l) === 'coach' ? 'Loom-ul' : 'demo-ul'}`, l.demo_url ? 'link adăugat, gata de trimis' : 'marcat făcut; adaugă linkul în pagina lead-ului')
  })

  const pool = (cond) => {
    const c = fresh.filter((l) => trackOf(l) === 'coach' && cond(l)).sort(byPriority)
    const w = fresh.filter((l) => trackOf(l) !== 'coach' && cond(l)).sort(byPriority)
    return [c, w]
  }
  const share = track === 'coach' ? 1 : track === 'white_label' ? 0 : q.coachShare ?? 0.7
  const [lc, lw] = pool((l) => l.demo && !l.demo_done && !l.demo_url)
  mix(lc, lw, Math.max(0, (q.looms ?? 4) - done.loom), share).forEach((l) => {
    mk('loom', l, `Fă ${trackOf(l) === 'coach' ? 'Loom' : 'demo'} pentru ${l.name}`, trackOf(l) === 'coach' ? `${l.subniche || l.type}${l.followers ? ' · ' + l.followers : ''}` : (l.demo_note || '').slice(0, 90))
  })
  const [cc, cw] = pool((l) => !l.demo)
  mix(cc, cw, Math.max(0, (q.contacts ?? 8) - done.sent), share).forEach((l) => {
    mk('contact', l, trackOf(l) === 'coach' ? `Contactează coach-ul ${l.name}` : `Contactează ${l.name}`, `${l.type || ''}${l.country_group && l.country_group !== '—' ? ' · ' + l.country_group : ''}`)
  })
  return out
}

// Estimare grosieră de timp, ca să știi dacă ziua e realistă.
export function estimateMinutes(tasks) {
  const m = { reply: 10, followup: 4, decide: 2, send: 3, loom: 25, contact: 6 }
  return tasks.reduce((a, x) => a + (m[x.kind] || 5), 0)
}

// n = câte follow-up-uri erau trimise înainte de cel de acum; următorul vine după intervalul următor din listă.
export const nextFollowup = (n, days, t) => addDays(t, days[Math.min(n + 1, days.length - 1)])
