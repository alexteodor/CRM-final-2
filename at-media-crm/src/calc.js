export const STAGES = ['Găsit', 'Contactat', 'Răspuns', 'Apel', 'Demo trimis', 'Pilot', 'Semnat', 'Pierdut']
export const OPEN_STAGES = STAGES.filter((s) => s !== 'Semnat' && s !== 'Pierdut')

export const SEGMENTS = {
  'ICP-1 DTC': { label: 'Branduri DTC', short: 'DTC', color: 'var(--seg-dtc)' },
  'ICP-2 Agenție': { label: 'Agenții white-label', short: 'Agenții', color: 'var(--seg-agency)' },
  'ICP-3 Angajează': { label: 'Angajează editori', short: 'Angajează', color: 'var(--seg-hiring)' },
  'ICP-4 YouTube': { label: 'Canale YouTube', short: 'YouTube', color: 'var(--seg-yt)' },
  'C-1 Business': { label: 'Coach-i business', short: 'Business', color: 'var(--seg-c1)' },
  'C-2 Fitness': { label: 'Coach-i fitness', short: 'Fitness', color: 'var(--seg-c2)' },
  'C-3 B2B': { label: 'Experți B2B', short: 'B2B', color: 'var(--seg-c3)' },
}

export const TRACKS = { white_label: 'White label', coach: 'Coach-i' }
export const trackOf = (l) => l.track || (String(l.segment || '').startsWith('C-') ? 'coach' : 'white_label')

export const WAVES = [
  { id: 'S1', label: 'S1', dates: '12–15 nov' },
  { id: 'S2', label: 'S2', dates: '16–20 nov' },
  { id: 'S3', label: 'S3', dates: '23–27 nov' },
  { id: 'S4', label: 'S4', dates: '30 nov–4 dec' },
]

export const DEFAULT_SETTINGS = {
  prices: { Start: 790, Growth: 1490, Scale: 2790 },
  volumes: { Start: '30 variante / lună', Growth: '60 variante / lună', Scale: '120 variante / lună' },
  whitelabelDiscount: 0.3,
  thresholds: { growthAds: 30, scaleAds: 100, growthSubs: 300000 },
  probs: { 'Găsit': 0.02, Contactat: 0.05, 'Răspuns': 0.2, Apel: 0.3, 'Demo trimis': 0.4, Pilot: 0.6, Semnat: 1, Pierdut: 0 },
  goalClients: 2,
  deadline: '2026-12-31',
  pilotPrice: 290,
  coachPrices: { Start: 790, Growth: 1190, Scale: 1690 },
  coachVolumes: { Start: '8 shorts + 1 video lung / lună', Growth: '16 shorts + 2 video lungi / lună', Scale: '24 shorts + 4 video lungi + miniaturi / lună' },
  coachGrowthSubs: 100000,
  daily: { contacts: 8, looms: 4, coachShare: 0.7 },
  followupDays: [3, 4, 7],
}

export const TEMPLATE_KINDS = { linkedin: 'LinkedIn', email: 'Email', loom: 'Mesaj cu Loom', followup: 'Follow-up', reply: 'Răspunsuri', other: 'Altele' }
export const TEMPLATE_VARS = [
  ['prenume', 'prenumele contactului'], ['nume', 'numele lead-ului (fără paranteze)'], ['companie', 'brandul / compania'], ['nisa', 'subnișa'], ['ce_vinde', 'ce vinde el'], ['followers', 'urmăritori / abonați'],
  ['semnal', 'de ce acum'], ['unghi', 'unghiul de abordare'], ['problema', 'prima problemă din câmpul „Probleme”'], ['probleme', 'toate problemele'],
  ['link_loom', 'link Loom / demo'], ['site', 'site'], ['tara', 'țara'],
]
export const DEFAULT_TEMPLATES = [
  ['Prima abordare LinkedIn', 'linkedin'], ['Prima abordare email', 'email'], ['Mesajul care însoțește Loom-ul', 'loom'],
  ['Follow-up 1', 'followup'], ['Follow-up 2', 'followup'], ['Răspuns când zice da', 'reply'], ['Propunere de apel', 'reply'],
].map(([name, kind], i) => ({ id: 't' + (i + 1), name, kind, subject: '', body: '' }))

export function renderTemplate(text = '', l) {
  const coach = trackOf(l) === 'coach'
  const probs = String(l.problems || '').split('\n').map((x) => x.trim()).filter(Boolean)
  const vals = {
    prenume: firstName(l.contact) || (coach ? String(l.name || '').split(/[\s(]/)[0] : ''), nume: String(l.name || '').replace(/\s*\(.*\)\s*$/, ''), companie: (String(l.name || '').match(/\(([^)]+)\)/) || [])[1] || l.name, nisa: l.subniche || l.type, ce_vinde: l.sells, followers: l.followers || (l.subs ? String(l.subs) : ''),
    semnal: l.signal, unghi: l.angle, problema: probs[0] || '', probleme: probs.join('; '), link_loom: l.demo_url, site: l.site, tara: l.country,
  }
  const missing = new Set()
  const out = String(text).replace(/\{([a-z_]+)\}/g, (m, k) => {
    if (!(k in vals)) return m
    if (!vals[k]) { missing.add(k); return m }
    return vals[k]
  })
  return { text: out, missing: [...missing] }
}

export function autoPackage(l, s) {
  if (trackOf(l) === 'coach') return (l.subs || 0) >= (s.coachGrowthSubs ?? 100000) ? 'Growth' : 'Start'
  const t = s.thresholds
  if (l.segment === 'ICP-4 YouTube') return l.subs && l.subs >= t.growthSubs ? 'Growth' : 'Start'
  if (l.ads_count) return l.ads_count >= t.scaleAds ? 'Scale' : l.ads_count >= t.growthAds ? 'Growth' : 'Start'
  const size = (l.size || '').toLowerCase()
  if (l.segment === 'ICP-2 Agenție') {
    if (/mare/.test(size) && !/medie/.test(size)) return 'Scale'
    if (/medie|mare|11-50|20\+|30\+|~50/.test(size)) return 'Growth'
    return 'Start'
  }
  if (/mare|medie/.test(size)) return 'Growth'
  return 'Start'
}

export function pkgOf(l, s) {
  return l.package || autoPackage(l, s)
}

export function revenueOf(l, s) {
  if (l.revenue_override !== null && l.revenue_override !== undefined && l.revenue_override !== '') return Number(l.revenue_override) || 0
  if (trackOf(l) === 'coach') return (s.coachPrices || DEFAULT_SETTINGS.coachPrices)[pkgOf(l, s)] || 0
  const base = s.prices[pkgOf(l, s)] || 0
  return Math.round(l.segment === 'ICP-2 Agenție' ? base * (1 - s.whitelabelDiscount) : base)
}

export function weightedOf(l, s) {
  return Math.round(revenueOf(l, s) * (s.probs[l.stage] ?? 0))
}

export const eur = (n) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + ' €'
export const today = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
}
export const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000)

export function adLibraryLink(l) {
  const c = /uk|marea|regatul/i.test(l.country || '') ? 'GB' : 'US'
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${c}&media_type=video&q=%22${encodeURIComponent(l.name)}%22&search_type=keyword_exact_phrase`
}
export const googleLink = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`

const ROLE = new Set(['head','founder','creative','owner','fondator','director','marketing','recrutare','lead','proprietar','echipă','clientul','e-commerce','co-founder','cofondator','senior','video','editor','agenție','ceo'])
export function firstName(contact = '') {
  const p = contact.trim()
  if (!p || /^[^(]*de identificat/.test(p)) return ''
  const w = p.split(/[\s,(/]+/)[0]
  if (!w || ROLE.has(w.toLowerCase().replace('.', '')) || !/^[A-ZÀ-Ý]/.test(w)) return ''
  return w
}

// Mesaje de pornire în engleză, pentru lead-uri importate sau regenerate.
export function makeMessages(l) {
  const brand = l.name
  const poss = brand + (brand.endsWith('s') ? "'" : "'s")
  const fn = firstName(l.contact)
  const hi = fn ? `Hi ${fn},` : 'Hi there,'
  const sign = '— Alex, AT Media'
  const V = l.demo_note || ''
  const id = (V.match(/\b(\d{9,20})\b/) || [])[1]
  const dur = (V.match(/\b(\d{1,2}:\d{2})\b/) || [])[1]
  const hook = (V.match(/„([^”]+)”/) || [])[1]
  const ads = l.ads_count ? `~${l.ads_count} video ads` : 'a lot of video ads'
  const wantDemo = l.demo && id
  let li, sub, body
  if (l.segment === 'ICP-4 YouTube') {
    const title = hook || 'your latest video'
    const pct = (V.match(/\((\d+)%\)/) || [])[1]
    li = `${hi} I watched "${title}".${pct ? ` It's sitting at about ${pct}% of your channel's usual views, and I think the first minutes are why.` : ' I think the pacing in the first minutes is holding it back.'} I re-edited the opening (tighter intro, faster cuts). Want me to send it over? ${sign}`
    sub = `Re-edit of "${title.slice(0, 60)}"`
    body = `${hi}\n\nI'm Alex from AT Media, a small studio that edits YouTube long-form for channels in home, tools and tech. I watched "${title}" and re-edited the first two minutes: tighter intro, faster pacing, same content.\n\nHere is the cut: [link demo]\n\nIf you like it, I can take on your editing as a monthly package. No pressure either way.\n\nAlex\nAT Media`
  } else if (l.segment === 'ICP-3 Angajează') {
    const role = (l.signal.match(/'([^']+)'/) || [])[1] || 'video editor'
    li = `${hi} I saw ${brand} is hiring a ${role}. Before you spend weeks on that, I run a small editing studio (AT Media) and can cover the same work on a monthly package, starting with a paid test of 3 variants on one of your briefs. Open to a quick look? ${sign}`
    sub = `${brand}: covering your ${role} role`
    body = `${hi}\n\nI saw the open ${role} role at ${brand}. I'm Alex from AT Media, a small studio that edits paid-social video ads: new hooks, cutdowns and format versions.\n\nInstead of a hire, you can try us on a paid test: 3 variants on one of your current briefs, delivered in 48 hours. If it's good, we move to a monthly package.\n\nWorth a 15 minute call this week?\n\nAlex\nAT Media`
  } else if (l.segment === 'ICP-2 Agenție') {
    li = `${hi} I run AT Media, a small video studio. We edit paid-social ads for agencies on a white-label basis: new hooks, cutdowns, UGC edits, 48h turnaround. Happy to edit one ad of yours for free as a test. Who handles overflow editing at ${brand}? ${sign}`
    sub = `White-label ad editing for ${brand}`
    body = `${hi}\n\nI'm Alex from AT Media, a small video studio. We edit paid-social ads for agencies behind the scenes: hook variations, cutdowns, UGC edits, delivered in 48 hours, from 25 to 40 EUR per clip.\n\nI'd like to edit one ad from your current client work as a free test, so you can judge the quality before talking about anything else.\n\nWho is the right person for that at ${brand}?\n\nAlex\nAT Media`
  } else if (wantDemo) {
    const adref = `${dur ? `the ${dur} ad` : 'one ad'} (Library ID ${id})`
    li = `${hi} I was going through ${poss} video ads on Meta and one stood out: ${adref}. I put together a quick cut with 3 new hooks. Want me to send it over? ${sign}`
    sub = dur ? `${brand}: 3 new hooks for your ${dur} ad` : `${brand}: 3 new hooks for one of your ads`
    body = `${hi}\n\nI'm Alex from AT Media, a small studio that makes ad variations for DTC brands. I found ${adref} in the Meta Ad Library and cut 3 new hooks plus a short version of it:\n\n[link demo]\n\nIf it works for you, I can do this every month: new hooks, cutdowns and formats on your best ads.\n\nWant me to set up a free test on another ad?\n\nAlex\nAT Media`
  } else {
    li = `${hi} I noticed ${brand} is running ${ads} on Meta, many of them in a single version. I edit ad variations (new hooks, cutdowns, formats) for DTC brands. Happy to cut 3 free hook variants on one of your current ads. Interested? ${sign}`
    sub = `3 free hook variants for ${brand}`
    body = `${hi}\n\nI'm Alex from AT Media. I make ad variations for DTC brands: new hooks, cutdowns and format versions of the ads that already work.\n\nI saw ${brand} runs ${ads} on Meta, many in a single version. I can cut 3 hook variants on one of them for free, so you can see the difference before deciding anything.\n\nShall I pick an ad and send it over?\n\nAlex\nAT Media`
  }
  const fu = `${hi} quick follow-up on my note about ${poss} ads. ${l.demo ? 'The cut is ready whenever you want to see it. ' : 'Happy to start with a free test on one ad. '}If it's not a priority right now, just say so and I'll stop here. ${sign}`
  return { msg_linkedin: li, msg_email_subject: sub, msg_email: body, msg_followup: fu }
}
