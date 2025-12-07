import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Criar cliente do Supabase apenas se as variáveis estiverem definidas
let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Erro ao inicializar Supabase:', error);
  }
} else {
  console.warn('Variáveis do Supabase não configuradas. O registro de acessos não funcionará.');
}

export { supabase };

