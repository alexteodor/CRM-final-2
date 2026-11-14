// Doar pentru testare locală: copiază datele în public/ ca să meargă butonul de încărcare rapidă.
// public/seed.json nu e în Git, deci nu ajunge niciodată pe site-ul publicat.
import { copyFileSync, existsSync } from 'node:fs'
if (existsSync('data/seed.json')) copyFileSync('data/seed.json', 'public/seed.json')
