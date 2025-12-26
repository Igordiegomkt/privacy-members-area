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
    let { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    // 2. Se o login falhar por credenciais inválidas ou email não confirmado, tenta criar o usuário
    if (signInError) {
      const isAuthError = signInError.message.includes('Invalid login credentials') || signInError.message.includes('Email not confirmed');

      if (isAuthError) {
        
        // Tenta criar o usuário (usando o cliente ADMIN)
        const { error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // FORÇA A CONFIRMAÇÃO
          user_metadata: userData,
        });

        if (signUpError) {
          // Se o erro for que o usuário já existe, ignoramos e prosseguimos para o login.
          // Se for outro erro (ex: senha fraca, DB down), lançamos.
          if (!signUpError.message.includes('User already exists')) {
            console.error("[create-user-and-login] Admin SignUp Error:", signUpError);
            return createResponse(false, { code: "SIGNUP_FAILED", message: signUpError.message });
          }
          // Se o usuário já existe, isNewUser permanece false e tentamos o login abaixo.
        } else {
          isNewUser = true;
        }
        
        // 3. Tenta fazer login novamente (agora o usuário deve estar confirmado)
        ({ data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
          email,
          password,
        }));

        if (signInError) {
            console.error("[create-user-and-login] Final SignIn Error:", signInError);
            return createResponse(false, { code: "SIGNIN_FAILED", message: signInError.message });
        }
      } else {
        // Outro erro de login (ex: rate limit)
        console.error("[create-user-and-login] Initial SignIn Error:", signInError);
        return createResponse(false, { code: "SIGNIN_FAILED", message: signInError.message });
      }
    }

    // 4. Verifica o resultado final
    user = signInData.user;
    session = signInData.session;

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