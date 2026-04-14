import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Mancano VITE_SUPABASE_URL e/o VITE_SUPABASE_ANON_KEY nelle variabili di ambiente.\n' +
    'Copia .env.example → .env e compila con i dati del tuo progetto Supabase.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
