import { createClient } from '@supabase/supabase-js';

// --- INÍCIO DA CORREÇÃO TEMPORÁRIA ---
// As credenciais foram inseridas diretamente para garantir a conexão.
// O ideal é usar variáveis de ambiente (.env), mas elas não estavam sendo carregadas.
const supabaseUrl = "https://atexvoxukvaqittpqkov.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZXh2b3h1a3ZhcWl0dHBxa292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTYyNjAsImV4cCI6MjA3NjEzMjI2MH0.HptK9KRkqkSQL3jrwAwH0rOSDGhlXOTwGwGqjwNgtU4";
// --- FIM DA CORREÇÃO TEMPORÁRIA ---

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created successfully using hardcoded credentials.');
  } catch (error) {
    console.error('❌ Error initializing Supabase client:', error);
  }
} else {
  console.warn('⚠️ Supabase credentials are not defined.');
}

export { supabase };