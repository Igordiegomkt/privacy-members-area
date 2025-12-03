// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare the Deno global to satisfy the TypeScript compiler in a non-Deno environment.
declare const Deno: any;

const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')

serve(async (req: Request) => {
  try {
    const { type, data } = await req.json()

    if (type === 'payment') {
      const paymentId = data.id
      
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      })
      
      const paymentDetails = await paymentResponse.json()

      if (paymentDetails.status === 'approved') {
        const { external_reference } = paymentDetails
        const [userId, productId] = external_reference.split('|')
        const pricePaidCents = Math.round(paymentDetails.transaction_amount * 100)

        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const { data: existingPurchase, error: selectError } = await supabaseAdmin
          .from('user_purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('product_id', productId)
          .maybeSingle()

        if (selectError) throw selectError
        
        if (!existingPurchase) {
          const { error: insertError } = await supabaseAdmin
            .from('user_purchases')
            .insert({
              user_id: userId,
              product_id: productId,
              price_paid_cents: pricePaidCents,
              status: 'paid',
            })

          if (insertError) throw insertError
        }
      }
    }

    return new Response(JSON.stringify({ status: 'received' }), { status: 200 })
  } catch (error) {
    const err = error as Error;
    console.error('Webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})