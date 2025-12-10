import { createClient } from '@supabase/supabase-js';

// Use environment variables provided by Vite/Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if the variables are defined. If not, the app cannot function.
// Throwing an error here will stop the build/execution, which is the desired behavior
// to prevent a broken app from being deployed or run.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are missing from environment variables.');
  throw new Error('Supabase credentials are not configured. Please check your .env file or Vercel environment variables.');
}

// Create and export the Supabase client.
// It is now guaranteed to be non-null throughout the app.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Optional: log success for easier debugging (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('✅ Supabase client initialized successfully.');
}