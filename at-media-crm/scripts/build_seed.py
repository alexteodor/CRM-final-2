import json,re,sys,unicodedata
src=sys.argv[1]; out=sys.argv[2]
t=open(src).read(); v=json.loads(t[t.index('{'):])['values']
rows=[r+['']*(24-len(r)) for r in v[1:]]
WAVE={'S1':'S1','S2':'S2','S3':'S3','S4':'S4'}
MON={'ian':'Jan','feb':'Feb','mar':'Mar','apr':'Apr','mai':'May','iun':'Jun','iul':'Jul','aug':'Aug','sep':'Sep','oct':'Oct','nov':'Nov','dec':'Dec','jan':'Jan','may':'May','jun':'Jun','jul':'Jul'}
ROLE={'head','founder','creative','owner','fondator','director','marketing','recrutare','lead','proprietar','echipă','clientul','e-commerce','co-founder','cofondator','senior','video','editor','agenție','agentie','fractional','ceo'}
def slug(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')[:40]
def fname(p):
    p=p.strip()
    if not p or 'de identificat' in p.split('(')[0]: return ''
    w=re.split(r'[\s,(/]+',p)[0]
    if not w or w.lower().strip('.') in ROLE or not w[0].isupper(): return ''
    return w
def country_group(c):
    c=c.lower()
    if c.startswith('sua') or 'statele' in c: return 'SUA'
    if c.startswith('uk') or 'marea britanie' in c or 'regatul unit' in c: return 'UK'
    if 'nespecificat' in c: return '—'
    return 'UE / alte țări'
def months_since(s):
    m=re.search(r'(\d{1,2})\s+([A-Za-zăâîșț]+)\.?\s+(20\d\d)',s)
    if not m: return None
    mo=MON.get(m.group(2)[:3].lower())
    if not mo: return None
    mi=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].index(mo)+1
    return (2026-int(m.group(3)))*12+(11-mi), f"{mo} {m.group(3)}"
def en_date(s):
    r=months_since(s); return r[1] if r else ''
def segment(r):
    if r[22]: return r[22]
    if r[20]=='Job activ': return 'ICP-3 Angajează'
    if r[19].startswith('2'): return 'ICP-2 Agenție'
    if r[19].startswith('3') or 'YouTube' in r[3]: return 'ICP-4 YouTube'
    return 'ICP-1 DTC'
def msgs(r,seg,demo):
    brand=r[2]; fn=fname(r[12]); hi=f"Hi {fn}," if fn else "Hi there,"
    V=r[21]; sig=r[8]
    idm=re.search(r'\b(\d{9,20})\b',V); dur=re.search(r'\b(\d{1,2}:\d{2})\b',V)
    hook=re.search(r'„([^”]+)”',V)
    ads=re.search(r'~?(\d{2,3})\+?\s+(?:de\s+)?reclame',sig+' '+r[7])
    ago=months_since(V)
    sign="— Alex, AT Media"
    poss=brand+("'" if brand.endswith('s') else "'s")
    if seg=='ICP-4 YouTube':
        title=hook.group(1) if hook else 'your latest video'
        pct=re.search(r'\((\d+)%\)',V); p=pct.group(1) if pct else None
        li=f"{hi} I watched \"{title}\"."+(f" It's sitting at about {p}% of your channel's usual views, and I think the first minutes are why." if p else " I think the pacing in the first minutes is holding it back.")+f" I re-edited the opening (tighter intro, faster cuts). Want me to send it over? {sign}"
        sub=f"Re-edit of \"{title[:60]}\"" if hook else f"A re-edit for {brand}"
        body=f"{hi}\n\nI'm Alex from AT Media, a small studio that edits YouTube long-form for channels in home, tools and tech. I watched \"{title}\" and re-edited the first two minutes: tighter intro, faster pacing, same content.\n\nHere is the cut: [link demo]\n\nIf you like it, I can take on your editing as a monthly package. No pressure either way.\n\nAlex\nAT Media"
    elif seg=='ICP-3 Angajează':
        role=re.search(r"'([^']+)'",sig); role=role.group(1) if role else 'video editor'
        li=f"{hi} I saw {brand} is hiring a {role}. Before you spend weeks on that, I run a small editing studio (AT Media) and can cover the same work on a monthly package, starting with a paid test of 3 variants on one of your briefs. Open to a quick look? {sign}"
        sub=f"{brand}: covering your {role} role"
        body=f"{hi}\n\nI saw the open {role} role at {brand}. I'm Alex from AT Media, a small studio that edits paid-social video ads: new hooks, cutdowns and format versions.\n\nInstead of a hire, you can try us on a paid test: 3 variants on one of your current briefs, delivered in 48 hours. If it's good, we move to a monthly package.\n\nWorth a 15 minute call this week?\n\nAlex\nAT Media"
        if demo and idm: li+=f" (I also cut a version of your ad, Library ID {idm.group(1)}.)"
    elif seg=='ICP-2 Agenție':
        li=f"{hi} I run AT Media, a small video studio. We edit paid-social ads for agencies on a white-label basis: new hooks, cutdowns, UGC edits, 48h turnaround. Happy to edit one ad of yours for free as a test. Who handles overflow editing at {brand}? {sign}"
        sub=f"White-label ad editing for {brand}"
        body=f"{hi}\n\nI'm Alex from AT Media, a small video studio. We edit paid-social ads for agencies behind the scenes: hook variations, cutdowns, UGC edits, delivered in 48 hours, from 25 to 40 EUR per clip.\n\nI'd like to edit one ad from your current client work as a free test, so you can judge the quality before talking about anything else.\n\nWho is the right person for that at {brand}?\n\nAlex\nAT Media"
    else:
        adref=''
        if demo and idm:
            adref=(f"the {dur.group(1)} ad" if dur else "one ad")+f" (Library ID {idm.group(1)})"
        if demo and adref:
            obs=''
            if dur:
                m,s=dur.group(1).split(':')
                if int(m)>=1: obs=f"At {dur.group(1)} it's a single long version, so there's room for shorter cuts. "
            if ago and ago[0]>=3 and not obs: obs=f"It has been live since {ago[1]} with no new version. "
            li=f"{hi} I was going through {poss} video ads on Meta and one stood out: {adref}. {obs}I put together a quick cut with 3 new hooks. Want me to send it over? {sign}"
            sub=f"{brand}: 3 new hooks for your {dur.group(1)} ad" if dur else f"{brand}: 3 new hooks for one of your ads"
            body=f"{hi}\n\nI'm Alex from AT Media, a small studio that makes ad variations for DTC brands. I found {adref} in the Meta Ad Library and cut 3 new hooks plus a short version of it:\n\n[link demo]\n\nIf it works for you, I can do this every month: new hooks, cutdowns and formats on your best ads, from 790 EUR for 30 variants.\n\nWant me to set up a free test on another ad?\n\nAlex\nAT Media"
        else:
            n=f"~{ads.group(1)} video ads" if ads else "a lot of video ads"
            li=f"{hi} I noticed {brand} is running {n} on Meta, many of them in a single version. I edit ad variations (new hooks, cutdowns, formats) for DTC brands. Happy to cut 3 free hook variants on one of your current ads. Interested? {sign}"
            sub=f"3 free hook variants for {brand}"
            body=f"{hi}\n\nI'm Alex from AT Media. I make ad variations for DTC brands: new hooks, cutdowns and format versions of the ads that already work.\n\nI saw {brand} runs {n} on Meta, many in a single version. I can cut 3 hook variants on one of them for free, so you can see the difference before deciding anything.\n\nShall I pick an ad and send it over?\n\nAlex\nAT Media"
    fu=f"{hi} quick follow-up on my note about {poss} ads. "+("The cut is ready whenever you want to see it. " if demo else "Happy to start with a free test on one ad. ")+"If it's not a priority right now, just say so and I'll stop here. "+sign
    return li,sub,body,fu
def num(s):
    m=re.search(r'(\d+(?:[.,]\d+)?)\s*k\s+abona',s,re.I)
    return int(float(m.group(1).replace(',','.'))*1000) if m else None
leads=[]
seen={}
for i,r in enumerate(rows,2):
    seg=segment(r); demo=bool(r[21])
    wave=''
    m=re.match(r'(S\d)',r[23])
    if m: wave=m.group(1)
    li,sub,body,fu=msgs(r,seg,demo)
    ads=re.search(r'~?(\d{2,3})\+?\s+(?:de\s+)?reclame',r[8]+' '+r[7])
    email=re.search(r'[\w.+-]+@[\w-]+\.[\w.]+',r[12])
    base=slug(r[2]) or f'lead-{i}'
    seen[base]=seen.get(base,0)+1
    lid=base if seen[base]==1 else f"{base}-{seen[base]}"
    leads.append(dict(id=lid,priority=r[0],score=int(r[1]) if r[1].isdigit() else 0,name=r[2],type=r[3],country=r[4],country_group=country_group(r[4]),city=r[5],size=r[6],what=r[7],signal=r[8],angle=r[9],site=r[10],linkedin_company=r[11],contact=r[12],contact_linkedin=r[13],contact_email=email.group(0) if email else '',stage='Găsit' if r[14] in ('','Găsit') else r[14],contacted_at='',followup_at='',notes=r[16],source=r[17],found_at=r[18],offer=r[19],approach=r[20],demo=demo,demo_note=r[21],demo_wave=wave,demo_done=False,demo_url='',segment=seg,package='',revenue_override=None,ads_count=int(ads.group(1)) if ads else None,subs=num(r[7]+' '+r[8]),msg_linkedin=li,msg_email_subject=sub,msg_email=body,msg_followup=fu,activity=[]))
json.dump(leads,open(out,'w'),ensure_ascii=False,indent=0)
import collections
print(len(leads),collections.Counter(l['segment'] for l in leads),collections.Counter(l['country_group'] for l in leads),sum(l['demo'] for l in leads),sum(1 for l in leads if l['ads_count']),sum(1 for l in leads if l['subs']))
for l in leads[40:43]+leads[160:162]: print(l['name'],'\n',l['msg_linkedin'],'\n')
