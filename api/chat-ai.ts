import { generateText, gateway } from 'ai';
import { createClient } from '@supabase/supabase-js';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function supabaseServer() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getBusinessContext() {
  const supabase = supabaseServer();
  if (!supabase) return '';
  const [productsResult, settingsResult] = await Promise.all([
    supabase.from('products').select('name_bn,name_en,slug,description_bn,short_description_bn,benefits_bn,how_to_use_bn,ingredients_bn,who_is_it_for_bn,storage_bn,notes_bn,subcategory,price,old_price,stock,is_active,is_on_sale,size_bn').eq('is_active', true).order('created_at', { ascending: false }).limit(100),
    supabase.from('site_settings').select('brand_name,brand_tagline_bn,phone,whatsapp_number,delivery_inside_dhaka,delivery_outside_dhaka,free_delivery_threshold,currency,announcement_bn,cod_enabled,online_payment_enabled,free_delivery_enabled').limit(1).maybeSingle(),
  ]);
  const products = (productsResult.data || []).map((p: any) => ({ name: p.name_bn || p.name_en, slug: p.slug, price: p.price, old_price: p.old_price, stock: p.stock, size: p.size_bn, short_description: p.short_description_bn, description: p.description_bn, benefits: p.benefits_bn, how_to_use: p.how_to_use_bn, ingredients: p.ingredients_bn, suitable_for: p.who_is_it_for_bn, storage: p.storage_bn, notes: p.notes_bn, subcategory: p.subcategory, on_sale: p.is_on_sale }));
  const settings = settingsResult.data;
  return `BUSINESS DATA — source of truth. Never invent missing facts.
Store: ${settings?.brand_name || 'Homemade Beauty Care'}
Tagline: ${settings?.brand_tagline_bn || ''}
Phone: ${settings?.phone || ''}
WhatsApp: ${settings?.whatsapp_number || ''}
Delivery inside Dhaka: ${settings?.delivery_inside_dhaka ?? ''} BDT
Delivery outside Dhaka: ${settings?.delivery_outside_dhaka ?? ''} BDT
Free delivery threshold: ${settings?.free_delivery_threshold ?? ''} BDT
Currency: ${settings?.currency || 'BDT'}
COD enabled: ${settings?.cod_enabled ?? ''}
Online payment enabled: ${settings?.online_payment_enabled ?? ''}
Free delivery enabled: ${settings?.free_delivery_enabled ?? ''}
Announcement: ${settings?.announcement_bn || ''}
ACTIVE PRODUCTS:\n${JSON.stringify(products)}`;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const customerName = typeof body?.customerName === 'string' ? body.customerName : 'Customer';
    const cleanMessages = messages.filter((item: any) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-12).map((item: any) => ({ role: item.role, content: item.content.slice(0, 3000) }));
    if (!cleanMessages.length) return json({ error: 'No conversation message.' }, 400);
    const businessContext = await getBusinessContext();
    const { text } = await generateText({
      model: gateway('openai/gpt-5.5'),
      system: `You are the customer support assistant for Homemade Beauty Care, a Bangladeshi natural beauty-care e-commerce store.
Reply naturally in Bangla unless the customer uses English. Keep replies concise, friendly and helpful.
Use BUSINESS DATA as the source of truth for product names, prices, stock, ingredients, benefits, usage, sizes, delivery and payment information.
Never invent prices, stock, ingredients, delivery charges, policies, order status or medical claims.
If a fact is missing, say you need to check it and offer an admin handover. Do not make medical diagnoses or promise treatment results. If the customer asks for a human/admin, say an admin will take over.
Customer name: ${customerName}

${businessContext}`,
      messages: cleanMessages,
      temperature: 0.2,
    });
    return json({ text: text.trim() });
  } catch (error) {
    console.error('AI chat error', error);
    return json({ error: error instanceof Error ? error.message : 'AI reply could not be generated.' }, 500);
  }
}
