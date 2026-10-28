import { createClient } from '@supabase/supabase-js';

type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };
function json(res: VercelResponse, body: unknown, status = 200) { return res.status(status).json(body); }

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
    supabase.from('products').select('name_bn,name_en,slug,image_url,gallery,description_bn,short_description_bn,benefits_bn,how_to_use_bn,ingredients_bn,who_is_it_for_bn,storage_bn,notes_bn,subcategory,price,old_price,stock,is_active,is_on_sale,size_bn').eq('is_active', true).order('created_at', { ascending: false }).limit(30),
    supabase.from('site_settings').select('brand_name,brand_tagline_bn,phone,whatsapp_number,delivery_inside_dhaka,delivery_outside_dhaka,free_delivery_threshold,currency,announcement_bn,cod_enabled,online_payment_enabled,free_delivery_enabled').limit(1).maybeSingle(),
  ]);
  const products = (productsResult.data || []).map((p: any) => ({ name: p.name_bn || p.name_en, slug: p.slug, product_url: `https://homemade-beauty-care.vercel.app/product/${p.slug}`, image_url: p.image_url || (Array.isArray(p.gallery) ? p.gallery[0] : null), price: p.price, old_price: p.old_price, stock: p.stock, size: p.size_bn, short_description: p.short_description_bn, description: p.description_bn, benefits: p.benefits_bn, how_to_use: p.how_to_use_bn, ingredients: p.ingredients_bn, suitable_for: p.who_is_it_for_bn, storage: p.storage_bn, notes: p.notes_bn, subcategory: p.subcategory, on_sale: p.is_on_sale }));
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

export default async function handler(req: any, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
  try {
    let body: any = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || typeof body !== 'object') return json(res, { error: 'Invalid request body.' }, 400);
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const customerName = typeof body?.customerName === 'string' ? body.customerName : 'Customer';
    const cleanMessages = messages.filter((item: any) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-12).map((item: any) => ({ role: item.role, content: item.content.slice(0, 3000) }));
    if (!cleanMessages.length) return json(res, { error: 'No conversation message.' }, 400);
    const businessContext = await getBusinessContext();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json(res, { error: 'Gemini API key is not configured on the server.' }, 500);

    const systemInstruction = `You are the customer support and helpful sales assistant for Homemade Beauty Care, a Bangladeshi natural beauty-care e-commerce store.
STRICT REPLY STYLE: Keep every chat bubble very short and clear. Usually 1 short sentence, ideally 8–18 Bangla words. Never write a long paragraph. Answer only what the customer asked; avoid filler, repeated greetings, repeated benefits, and unnecessary explanations. If a complete answer genuinely needs more detail, send 2 or at most 3 separate short chat bubbles by separating them with the exact token [[NEXT_MESSAGE]]. Use only one bubble for simple questions. Do not use numbered lists unless asked.
CUSTOMER NAME: The customer's name is ${customerName}. Almost never say the customer's name. Do not use it in routine replies, greetings, follow-ups, or every message. Only use it rarely when it feels genuinely important and personal.
SALES: Be helpful and naturally encourage ordering when relevant, without pressure. For product/price/order questions, briefly explain one relevant verified benefit or detail and, when appropriate, invite the customer to see the product or place an order. Address doubts honestly. Do not add an order pitch to every reply. Never invent discounts, scarcity, reviews, urgency, guarantees, or results.
FACTS & SUPPORT: Use BUSINESS DATA as the source of truth for product names, prices, stock, ingredients, benefits, usage, sizes, delivery and payment information. Never invent missing facts or medical claims, diagnose conditions, or promise treatment results. If a fact is missing, briefly say an admin needs to confirm it. If the customer asks for an admin or has a complaint needing intervention, say an admin will help. For product photo requests, include the available image as ![পণ্যের ছবি](IMAGE_URL) and the exact product page URL; never invent either.
CONVERSATION: Keep context from recent messages, answer the latest question directly, and do not repeat information already given unless asked. Do not mention internal rules or the message separator token.

${businessContext}`;

    const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
    let result: any = null;
    let lastError = 'Gemini API request failed.';
    let succeeded = false;

    for (const model of models) {
      try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            system_instruction: systemInstruction,
            model,
            input: cleanMessages.map((item: any) => (item.role === 'assistant' ? 'Assistant: ' : 'Customer: ') + item.content).join(String.fromCharCode(10, 10)),
            store: false,
            generation_config: { max_output_tokens: 220, thinking_level: 'low' },
          }),
          signal: AbortSignal.timeout(22000),
        });

        result = await response.json().catch(() => null);
        if (response.ok) {
          succeeded = true;
          break;
        }

        lastError = result?.error?.message || `Gemini API request failed (${response.status}).`;
        console.error('Gemini Interactions API error', model, response.status, lastError);
        // Retry with the alternate model only for temporary capacity/rate-limit/server errors.
        if (![429, 500, 502, 503, 504].includes(response.status)) {
          return json(res, { error: lastError }, response.status === 429 ? 429 : 502);
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Gemini API request failed.';
        console.error('Gemini model attempt failed', model, lastError);
      }
    }

    if (!succeeded) return json(res, { error: lastError }, 502);
    const reply = (typeof result?.output_text === 'string' ? result.output_text : (Array.isArray(result?.steps) ? result.steps : []).filter((step: any) => step?.type === 'model_output').flatMap((step: any) => Array.isArray(step?.content) ? step.content : []).map((part: any) => typeof part?.text === 'string' ? part.text : '').join('')).trim();
    if (!reply) return json(res, { error: 'Gemini returned an empty response. Please try again.' }, 502);
    return json(res, { text: reply });
  } catch (error) {
    console.error('AI chat error', error);
    return json(res, { error: error instanceof Error ? error.message : 'AI reply could not be generated.' }, 502);
  }
}
