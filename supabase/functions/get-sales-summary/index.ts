// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

declare const Deno: any;

// @ts-ignore: Deno-specific import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[get-sales-summary] Missing Supabase env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

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
    // Compras pagas com join nos produtos e modelos
    const { data, error } = await supabaseAdmin
      .from("user_purchases")
      .select(`
        id,
        created_at,
        paid_at,
        amount_cents,
        price_paid_cents,
        products (
          id,
          name,
          type,
          price_cents,
          model_id,
          is_base_membership,
          models (
            id,
            name,
            username
          )
        )
      `)
      .eq("status", "paid");

    if (error) {
      console.error("[get-sales-summary] DB error:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DB_ERROR",
          message: error.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const purchases = data ?? [];

    // Agrupar por modelo
    const byModelMap = new Map<
      string,
      {
        model_id: string;
        model_name: string;
        username: string;
        total_sales: number;
        total_revenue_cents: number;
      }
    >();

    // Lista achatada de vendas
    const salesList: any[] = [];

    for (const p of purchases) {
      const product = p.products;
      const model = product?.models;

      // Prioriza price_paid_cents (valor real pago), depois amount_cents, depois price_cents do produto
      const amountCents = p.price_paid_cents ?? p.amount_cents ?? product?.price_cents ?? 0;

      if (model) {
        const key = model.id;
        const prev = byModelMap.get(key) ?? {
          model_id: model.id,
          model_name: model.name,
          username: model.username,
          total_sales: 0,
          total_revenue_cents: 0,
        };
        prev.total_sales += 1;
        prev.total_revenue_cents += amountCents;
        byModelMap.set(key, prev);
      }

      salesList.push({
        id: p.id,
        created_at: p.created_at,
        paid_at: p.paid_at,
        amount_cents: amountCents,
        product_name: product?.name,
        product_type: product?.type,
        model_name: model?.name ?? null,
        model_username: model?.username ?? null,
      });
    }

    const byModel = Array.from(byModelMap.values()).sort(
      (a, b) => b.total_revenue_cents - a.total_revenue_cents,
    );

    // Ordenar vendas recentes
    salesList.sort((a, b) =>
      (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        byModel,
        salesList,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const e = err as Error;
    console.error("[get-sales-summary] Unexpected error:", e.message);

    return new Response(
      JSON.stringify({
        ok: false,
        code: "UNEXPECTED_ERROR",
        message: e.message ?? "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});