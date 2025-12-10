import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use environment variables provided by Vite/Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL ERROR: Supabase URL and Anon Key are missing from environment variables. Authentication and DB features will be disabled.');
  
  // Create a dummy client to prevent module initialization crash (which causes a blank screen)
  // This allows the React tree to mount and display the UI, even if the backend calls fail later.
  // Using placeholder values.
  supabaseClient = createClient('http://dummy-url', 'dummy-key');
} else {
  // Create and export the Supabase client.
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  
  // Optional: log success for easier debugging (apenas em desenvolvimento)
  if (import.meta.env.DEV) {
    console.log('✅ Supabase client initialized successfully.');
  }
}

export const supabase = supabaseClient;