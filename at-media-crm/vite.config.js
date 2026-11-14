import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// NEXT_PUBLIC_ e prefixul pe care îl pune integrarea Supabase din Vercel; cheia service_role nu are acest prefix și nu ajunge în site.
export default defineConfig({ plugins: [react()], envPrefix: ['VITE_', 'NEXT_PUBLIC_'] })
