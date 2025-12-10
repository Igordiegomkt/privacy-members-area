// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare Deno global to satisfy TypeScript compiler in non-Deno environments
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Cria uma resposta de erro padronizada com status 200 para evitar erros non-2xx no invoke.
 */
const createResponse = (ok: boolean, status: number, data: any) => {
  return new Response(
    JSON.stringify({ ok, ...data }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
};

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create a Supabase client with the user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Verify that the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("User not found or not authenticated.");

    // 3. Get email and password from the request body
    const { email, password } = await req.json();
    if (!email || !password) {
      return createResponse(false, 200, { error: 'Email and password are required' });
    }

    // 4. Create the Supabase Admin Client using the Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 5. Create the new user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm the user's email
    });

    if (createError) throw createError;

    return createResponse(true, 200, { user: userData.user });

  } catch (error) {
    const e = error as Error;
    console.error('[create-user] Error:', e.message);
    return createResponse(false, 200, { error: e.message });
  }
})