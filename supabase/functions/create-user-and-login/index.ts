// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Supabase client for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

declare const Deno: any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const createResponse = (ok: boolean, data: any) => {
  return new Response(
    JSON.stringify({ ok, ...data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error("[create-user-and-login] Missing Supabase env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const supabaseAnon = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createResponse(false, { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" });
  }

  try {
    const { email, password, userData } = await req.json();

    if (!email || !password) {
      return createResponse(false, { code: "BAD_REQUEST", message: "Email e senha são obrigatórios." });
    }

    let user;
    let session;
    let isNewUser = false;

    // 1. Tenta fazer login (usando o cliente ANÔNIMO)
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Se o erro for credenciais inválidas, o usuário não existe ou não está confirmado.
      if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Email not confirmed')) {
        
        // 2. Tenta criar o usuário (usando o cliente ADMIN)
        const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // FORÇA A CONFIRMAÇÃO
          user_metadata: userData,
        });

        if (signUpError) {
          // Se o erro for que o usuário já existe (race condition), tenta buscar o usuário
          if (signUpError.message.includes('User already exists')) {
            const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
            if (fetchError || !existingUser.user) throw fetchError || new Error("Usuário existente não encontrado.");
            user = existingUser.user;
          } else {
            console.error("[create-user-and-login] Admin SignUp Error:", signUpError);
            return createResponse(false, { code: "SIGNUP_FAILED", message: signUpError.message });
          }
        } else {
          user = signUpData.user;
          isNewUser = true;
        }
        
        // 3. Após criar/encontrar, tenta fazer login novamente (usando o cliente ANÔNIMO)
        const { data: finalSignInData, error: finalSignInError } = await supabaseAnon.auth.signInWithPassword({
          email,
          password,
        });

        if (finalSignInError) {
            console.error("[create-user-and-login] Final SignIn Error:", finalSignInError);
            return createResponse(false, { code: "SIGNIN_FAILED", message: finalSignInError.message });
        }
        
        session = finalSignInData.session;
        user = finalSignInData.user;

      } else {
        // Outro erro de login (ex: rate limit)
        console.error("[create-user-and-login] Initial SignIn Error:", signInError);
        return createResponse(false, { code: "SIGNIN_FAILED", message: signInError.message });
      }
    } else {
      // Login bem-sucedido
      user = signInData.user;
      session = signInData.session;
    }

    if (!user || !session) {
        return createResponse(false, { code: "NO_SESSION", message: "Falha ao obter sessão após autenticação." });
    }

    return createResponse(true, { 
        user, 
        session,
        isNewUser,
    });

  } catch (err) {
    const e = err as Error;
    console.error("[create-user-and-login] Unexpected Error:", e.message);
    return createResponse(false, { code: "UNEXPECTED_ERROR", message: e.message });
  }
});