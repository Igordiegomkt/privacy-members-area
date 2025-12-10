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
    // 1. Create a Supabase client with the user's auth token to verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("User not found or not authenticated.");

    // 2. Create the Supabase Admin Client to perform admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 3. List all users
    const { data: userData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100, // Adjust as needed
    });

    if (listError) throw listError;

    return createResponse(true, 200, { users: userData.users });

  } catch (error) {
    const e = error as Error;
    console.error('[get-users] Error:', e.message);
    return createResponse(false, 200, { error: e.message });
  }
})