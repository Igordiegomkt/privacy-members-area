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
    // 1. Verify that the calling user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user: callingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!callingUser) throw new Error("User not found or not authenticated.");

    // 2. Get the user ID to delete from the request body
    const { userIdToDelete } = await req.json();
    if (!userIdToDelete) {
      return createResponse(false, 200, { error: 'User ID to delete is required' });
    }

    // Prevent a user from deleting themselves
    if (callingUser.id === userIdToDelete) {
      return createResponse(false, 200, { error: 'You cannot delete your own account.' });
    }

    // 3. Create the Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 4. Delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteError) throw deleteError;

    return createResponse(true, 200, { message: 'User deleted successfully' });

  } catch (error) {
    const e = error as Error;
    console.error('[delete-user] Error:', e.message);
    return createResponse(false, 200, { error: e.message });
  }
})