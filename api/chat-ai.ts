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
    const mediaUrl = typeof body?.mediaUrl === 'string' ? body.mediaUrl : '';
    const mediaType = body?.mediaType === 'audio' ? 'audio' : body?.mediaType === 'image' ? 'image' : '';
    const customerName = typeof body?.customerName === 'string' ? body.customerName : 'Customer';
    const cleanMessages = messages.filter((item: any) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-12).map((item: any) => ({ role: item.role, content: item.content.slice(0, 3000) }));
    if (!cleanMessages.length && !mediaUrl) return json(res, { error: 'No conversation message.' }, 400);
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

    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    let result: any = null;
    let lastError = 'Gemini API request failed.';
    let succeeded = false;
    const conversationText = cleanMessages.map((item: any) => (item.role === 'assistant' ? 'Assistant: ' : 'Customer: ') + item.content).join(String.fromCharCode(10, 10));
    const parts: any[] = [{ text: `Recent conversation:\n${conversationText}\n\nAnswer the latest customer message. If audio is attached, understand the spoken words and reply to them. If an image is attached, inspect it and answer the customer about it.` }];

    if (mediaUrl && mediaType) {
      try {
        const mediaResponse = await fetch(mediaUrl, { signal: AbortSignal.timeout(12000) });
        if (!mediaResponse.ok) throw new Error('Uploaded attachment could not be read.');
        const contentType = mediaResponse.headers.get('content-type') || '';
        if (mediaType === 'audio' && !contentType.startsWith('audio/')) throw new Error('Voice file format is not supported.');
        if (mediaType === 'image' && !contentType.startsWith('image/')) throw new Error('Image file could not be read.');
        const bytes = await mediaResponse.arrayBuffer();
        if (bytes.byteLength > 12 * 1024 * 1024) throw new Error('Attachment is too large for AI analysis.');
        parts.push({ inline_data: { mime_type: contentType.split(';')[0], data: Buffer.from(bytes).toString('base64') } });
      } catch (mediaError) {
        return json(res, { error: mediaError instanceof Error ? mediaError.message : 'Attachment could not be read.' }, 400);
      }
    }

    for (const model of models) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts }],
            generationConfig: { maxOutputTokens: 260, temperature: 0.4 },
          }),
          signal: AbortSignal.timeout(25000),
        });
        result = await response.json().catch(() => null);
        if (response.ok) { succeeded = true; break; }
        lastError = result?.error?.message || `Gemini API request failed (${response.status}).`;
        console.error('Gemini generateContent API error', model, response.status, lastError);
        if (![429, 500, 502, 503, 504].includes(response.status)) return json(res, { error: lastError }, 502);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Gemini API request failed.';
        console.error('Gemini model attempt failed', model, lastError);
      }
    }

    if (!succeeded) return json(res, { error: lastError }, 502);
    const reply = (Array.isArray(result?.candidates?.[0]?.content?.parts) ? result.candidates[0].content.parts : []).map((part: any) => typeof part?.text === 'string' ? part.text : '').join('').trim();
    if (!reply) return json(res, { error: 'Gemini returned an empty response. Please try again.' }, 502);
    return json(res, { text: reply });
  } catch (error) {
    console.error('AI chat error', error);
    return json(res, { error: error instanceof Error ? error.message : 'AI reply could not be generated.' }, 502);
  }
}
