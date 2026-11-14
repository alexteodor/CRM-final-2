# CRM AT Media

CRM pentru campania de outreach: toate lead-urile, potențialul de revenue, mesajele personalizate, pipeline și panou de progres. Interfața e în română.

- **Azi**: lista zilei, concretă: „Răspunde lui X”, „Follow-up 1 pentru Y”, „Fă Loom pentru Z”, „Contactează coach-ul W”, în ordinea priorității, cu „Unde am rămas” și țintele zilnice. Butoanele („Am trimis mesajul”, „Loom făcut”) actualizează lead-ul singure.
- **Șabloane**: mesajele tale, scrise de tine, cu variabile ({prenume}, {nume}, {problema}, {link_loom}…) completate automat pe fiecare lead.
- **Panou**: funnel față de plan, bani (potențial, ponderat, semnat), segmente, valuri de demo, follow-up-uri.
- **Lead-uri**: tabel cu filtre și sortare. Click pe un lead deschide pagina lui: ce face, semnal, unghi, demo, mesaje (LinkedIn, email, follow-up), linkuri, contact, revenue, status, note.
- **Pipeline**: coloane pe etape, lead-urile se trag dintr-o coloană în alta.
- **Demo-uri**: candidații grupați pe valuri S1–S4, cu bifă „demo făcut” și linkul demo-ului.
- **Import / Export**: import din Excel, CSV sau seed.json; export în Excel și CSV.
- **Setări**: prețurile pachetelor, reducerea pentru agenții, pragurile pentru alegerea pachetului, șansele pe etapă.

## Publicare în 4 pași (GitHub, Supabase, Vercel)

### 1. Supabase (baza de date și contul tău)
1. Creează un proiect gratuit pe supabase.com.
2. **SQL Editor, New query**: lipește conținutul fișierului `supabase/schema.sql` și apasă Run.
3. **Authentication, Users, Add user**: creează contul tău cu email și parolă (bifează „Auto confirm user”).
4. **Authentication, Sign In / Providers, Email**: dezactivează „Allow new users to sign up”. Fără asta, oricine ar putea crea un cont și ar vedea lead-urile.
5. **Project Settings, API**: copiază `Project URL` și cheia `anon public`.

### 2. GitHub
Creează un repository **privat** și urcă proiectul:

```bash
git init
git add .
git commit -m "CRM AT Media"
git branch -M main
git remote add origin https://github.com/UTILIZATORUL-TAU/at-media-crm.git
git push -u origin main
```

Fișierul `.gitignore` exclude `node_modules` și `.env`.

### 3. Vercel
1. Pe vercel.com apasă **Add New, Project** și alege repository-ul.
2. Framework: Vite (se detectează singur). Build command `npm run build`, output `dist`.
3. La **Environment Variables** adaugă:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = cheia anon public
4. Deploy. Fișierul `vercel.json` face ca toate paginile să meargă.

### 4. Prima intrare
Deschide site-ul, intră cu emailul și parola de la Supabase, mergi la **Import / Export** și importă `data/seed.json` (342 de lead-uri: 287 white label și 55 de coach-i/experți). Dacă ai importat deja varianta veche, importă doar `data/coach-leads.json` (cele 55 noi); lead-urile existente nu se dublează. De acum datele sunt în Supabase și le vezi de pe orice device.

Dacă ai conectat Supabase prin integrarea din Vercel, variabilele `NEXT_PUBLIC_SUPABASE_URL` și `NEXT_PUBLIC_SUPABASE_ANON_KEY` sunt recunoscute și ele. După orice modificare de variabile, fă **Redeploy** (Vercel citește variabilele doar la build).

Dacă variabilele de mediu lipsesc, site-ul rulează în **mod local** (date doar în browserul tău, fără login) și apare un avertisment în bara laterală.

## Cum se calculează revenue-ul
- Pachetul se alege automat din numărul de reclame active: sub 30 = Start, 30–99 = Growth, 100+ = Scale. Canalele YouTube: sub 300k abonați = Start, altfel Growth. Agențiile și lead-urile fără număr de reclame: după mărime.
- Prețuri implicite (cu ~15% peste cele actuale): Start 790 €, Growth 1.490 €, Scale 2.790 €. Agențiile white-label plătesc cu 30% mai puțin. Le schimbi din **Setări**.
- Pe fiecare lead poți alege alt pachet sau scrie manual revenue-ul lunar.
- Revenue ponderat = revenue lunar înmulțit cu șansa etapei (Setări).

## Date din Google Sheets
Descarcă Sheet-ul ca .xlsx (File, Download) și importă-l din **Import / Export**. Lead-urile noi se adaugă, iar la cele existente poți actualiza datele de bază; etapa, notele și mesajele tale rămân.

## Rulare locală
```bash
npm install
npm run dev
```
Fără `.env`, aplicația pornește în mod local. Pentru testare rapidă, `npm run dev` copiază `data/seed.json` în `public/` (fișier ignorat de Git), iar butonul „Încarcă rapid” din pagina goală funcționează.

## Securitate
- `data/seed.json` nu se publică pe site. Nu-l muta în `public/`.
- Cheia `anon` din Vercel e publică prin natura ei; datele sunt protejate de politicile RLS din `schema.sql` (doar utilizatorii autentificați) și de dezactivarea înscrierilor.
- Mesajele sunt ciorne în engleză. Trimiți tu fiecare mesaj; înlocuiește `[link demo]` și verifică numele contactului.
