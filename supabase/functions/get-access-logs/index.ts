// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Supabase client for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

declare const Deno: any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[get-access-logs] Missing Supabase env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

interface AccessRangesBody {
  todayISO?: string;
  sevenDaysAgoISO?: string;
  firstDayOfMonthISO?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        ok: false,
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // (Opcional) validar Authorization se quiser restringir ao painel admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "UNAUTHORIZED",
          message: "Authorization header missing.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Tentar ler os ranges enviados pelo frontend (para manter o mesmo cálculo de datas)
    let body: AccessRangesBody = {};
    try {
      body = (await req.json()) as AccessRangesBody;
    } catch {
      body = {};
    }

    let { todayISO, sevenDaysAgoISO, firstDayOfMonthISO } = body;

    // Se o frontend não mandar, calculamos aqui (fallback)
    if (!todayISO || !sevenDaysAgoISO || !firstDayOfMonthISO) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      todayISO = today.toISOString();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      sevenDaysAgoISO = sevenDaysAgo.toISOString();

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      firstDayOfMonthISO = firstDayOfMonth.toISOString();
    }

    // 1) Logs recentes
    const logsPromise = supabaseAdmin
      .from("first_access")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    // 2) Contador de hoje
    const todayCountPromise = supabaseAdmin
      .from("first_access")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayISO!);

    // 3) Contador últimos 7 dias
    const sevenDaysCountPromise = supabaseAdmin
      .from("first_access")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgoISO!);

    // 4) Contador mês atual
    const monthCountPromise = supabaseAdmin
      .from("first_access")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonthISO!);

    const [logsResult, todayResult, sevenDaysResult, monthResult] =
      await Promise.all([
        logsPromise,
        todayCountPromise,
        sevenDaysCountPromise,
        monthCountPromise,
      ]);

    if (logsResult.error) {
      console.error("[get-access-logs] logsResult error:", logsResult.error);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DB_ERROR_LOGS",
          message: logsResult.error.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (todayResult.error) {
      console.error("[get-access-logs] todayResult error:", todayResult.error);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DB_ERROR_TODAY",
          message: todayResult.error.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (sevenDaysResult.error) {
      console.error(
        "[get-access-logs] sevenDaysResult error:",
        sevenDaysResult.error,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DB_ERROR_7_DAYS",
          message: sevenDaysResult.error.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (monthResult.error) {
      console.error(
        "[get-access-logs] monthResult error:",
        monthResult.error,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DB_ERROR_MONTH",
          message: monthResult.error.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const logs = logsResult.data ?? [];
    const totalToday = todayResult.count ?? 0;
    const totalLast7Days = sevenDaysResult.count ?? 0;
    const totalThisMonth = monthResult.count ?? 0;

    return new Response(
      JSON.stringify({
        ok: true,
        logs,
        totals: {
          today: totalToday,
          last7Days: totalLast7Days,
          month: totalThisMonth,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const e = err as Error;
    console.error("[get-access-logs] Unexpected error:", e.message);
    return new Response(
      JSON.stringify({
        ok: false,
        code: "UNEXPECTED_ERROR",
        message: e.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});