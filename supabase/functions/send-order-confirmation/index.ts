import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character] ?? character));

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Only POST is allowed.' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return response({ error: 'Please sign in before requesting an email.' }, 401);

  try {
    const { orderId } = await request.json();
    if (!orderId) return response({ error: 'Order number is required.' }, 400);
    const projectUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const apiKey = Deno.env.get('MAILGUN_API_KEY');
    const from = Deno.env.get('MAILGUN_FROM') || Deno.env.get('MAILGUN_FROM_EMAIL');
    if (!projectUrl || !anonKey || !apiKey || !from) {
      return response({ error: 'Email service settings are incomplete.' }, 500);
    }

    const userClient = createClient(projectUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return response({ error: 'Your sign-in session is no longer valid.' }, 401);
    const { data: order, error: orderError } = await userClient.from('orders')
      .select('id, customer_name, customer_email, items, total, user_id')
      .eq('id', orderId).eq('user_id', user.id).single();
    if (orderError || !order) return response({ error: 'Order was not found for this account.' }, 404);

    const lines = (Array.isArray(order.items) ? order.items : []).map((item: { name?: string; quantity?: number; unit_price?: number }) =>
      `<li>${escapeHtml(String(item.name ?? 'Item'))} Ã— ${Number(item.quantity ?? 0)} â€” â‚¦${Number(item.unit_price ?? 0).toLocaleString('en-NG')}</li>`).join('');
    const safeName = escapeHtml(order.customer_name);
    const total = Number(order.total).toLocaleString('en-NG');
    const domain = Deno.env.get('MAILGUN_DOMAIN');
    const apiBase = Deno.env.get('MAILGUN_API_BASE_URL') || 'https://api.mailgun.net';
    const form = new URLSearchParams({
      from,
      to: order.customer_email,
      subject: `Order received — ${order.id}`,
      text: `Hello ${order.customer_name}, your order ${order.id} has been received. Total: ₦${total}.`,
      html: `<div style="font-family:Arial,sans-serif;color:#282921"><h2>Thanks for your order, ${safeName}!</h2><p>We’ve received order <b>${order.id}</b>.</p><ul>${lines}</ul><p><b>Total: ₦${total}</b></p><p>We’ll keep you updated as it is prepared.</p></div>`,
    });
    const mailgunResponse = await fetch(`${apiBase}/v3/${domain}/messages`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`api:${apiKey}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    if (!mailgunResponse.ok) return response({ error: 'Order saved, but the email provider could not send the confirmation.' }, 502);
    return response({ sent: true, orderId: order.id });
  } catch (error) {
    console.error('Confirmation email failed:', error);
    return response({ error: 'Order confirmation email could not be sent.' }, 500);
  }
});





