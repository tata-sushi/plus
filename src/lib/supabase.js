import { createClient } from '@supabase/supabase-js'

// Chaves públicas (seguras no client) — a proteção real é via RLS no Supabase.
const SUPABASE_URL = 'https://aoqsbusfrffapjglpqjk.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvcXNidXNmcmZmYXBqZ2xwcWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MzcxMjQsImV4cCI6MjA5ODUxMzEyNH0.Dd9Z3SR3-18mQVX_yqUbIi0PG-eltLNjmOZB1Xu7W9o'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'tata_plus' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
