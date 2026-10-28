import { createClient } from '@supabase/supabase-js';

type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };
function json(res: VercelResponse, body: unknown, status = 200) { return res.status(status).json(body); }

function supabaseServer() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizeBangladeshMobile(value: string) {
  const banglaDigits = '০১২৩৪৫৬৭৮৯';
  let digits = value.replace(/[০-৯]/g, digit => String(banglaDigits.indexOf(digit))).replace(/\D/g, '');
  if (digits.startsWith('00880')) digits = digits.slice(2);
  if (digits.startsWith('880') && digits.length === 13) digits = '0' + digits.slice(3);
  if (digits.length === 10 && digits.startsWith('1')) digits = '0' + digits;
  return /^01[3-9]\d{8}$/.test(digits) ? digits : '';
}

async function lookupCustomerOrders(phone: string, visitorToken: string, conversationId: string) {
  const mobile = normalizeBangladeshMobile(phone);
  if (!mobile || !visitorToken || !conversationId) return [];
  const supabase = supabaseServer();
  if (!supabase) return [];
  // The database RPC validates the visitor token against this exact chat before reading private order statuses.
  const { data, error } = await supabase.rpc('lookup_guest_chat_orders', {
    p_visitor_token: visitorToken,
    p_conversation_id: conversationId,
    p_mobile: mobile,
  });
  if (error) {
    console.error('AI order lookup RPC failed:', error.message);
    return [];
  }
  return Array.isArray(data) ? data : [];
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
    const customerMobile = typeof body?.customerMobile === 'string' ? body.customerMobile : '';
    const visitorToken = typeof body?.visitorToken === 'string' ? body.visitorToken : '';
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : '';
    const cleanMessages = messages.filter((item: any) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-12).map((item: any) => ({ role: item.role, content: item.content.slice(0, 3000) }));
    if (!cleanMessages.length && !mediaUrl) return json(res, { error: 'No conversation message.' }, 400);
    const businessContext = await getBusinessContext();
    const latestUserMessage = [...cleanMessages].reverse().find((item: any) => item.role === 'user')?.content || '';
    const customerConversationText = cleanMessages.filter((item: any) => item.role === 'user').map((item: any) => item.content).join(' ');
    const orderKeywords = /অর্ডার|order|কোথায়|কোথায়|কবে পাব|ডেলিভারি|কুরিয়ার|কুরিয়ার|পার্সেল|স্ট্যাটাস|tracking|track/i;
    const asksOrderStatus = orderKeywords.test(latestUserMessage) || orderKeywords.test(customerConversationText);
    const phoneCandidates = customerConversationText.match(/[+০-৯0-9][+০-৯0-9()\s.-]{7,20}[০-৯0-9]/g) || [];
    const phoneInMessage = phoneCandidates.map((candidate: string) => normalizeBangladeshMobile(candidate)).find(Boolean) || '';
    const orderPhone = phoneInMessage || customerMobile;
    const asksAllOrders = /সব\s*(গুলো|গুলি|গুলাই)?\s*অর্ডার|সকল\s*অর্ডার|all\s+(my\s+)?orders|all\s+orders?|every\s+order|sob\s*(gula|gulo)?\s*order|shob\s*(gula|gulo)?\s*order|সব অর্ডারের|সকল অর্ডারের/i.test(customerConversationText);
    const foundCustomerOrders = asksOrderStatus ? await lookupCustomerOrders(orderPhone || customerMobile, visitorToken, conversationId) : [];
    const customerOrders = asksAllOrders ? foundCustomerOrders : foundCustomerOrders.slice(0, 1);
    const orderContext = asksOrderStatus
      ? `\nCUSTOMER ORDER LOOKUP (matched only by the customer's own mobile number; newest order first): ${JSON.stringify(customerOrders)}
ORDER RESPONSE RULE: By default, report ONLY the single newest order shown here and its real current status. If the customer explicitly asks for all orders / every order / সব অর্ডার / সকল অর্ডার, report each matching order, newest first, with each order number, order date, current status, and any available courier status/consignment/tracking code. Keep it concise and clear in Bangla. If tracking/courier information is absent, say it is not available yet; never guess an arrival date or claim the parcel is on the way unless the data confirms that. Do not ask the customer to wait for an admin when useful order data is available. Do not disclose address, email, or other private details. If no matching order is found, say you could not find an order for this number and ask them to confirm the number or say an admin will check; never invent an order/status.`
      : '';
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json(res, { error: 'Gemini API key is not configured on the server.' }, 500);

    const systemInstruction = `You are the customer support and helpful sales assistant for Homemade Beauty Care, a Bangladeshi natural beauty-care e-commerce store.
STRICT REPLY STYLE: Keep every chat bubble very short and clear. Usually 1 short sentence, ideally 8–18 Bangla words. Never write a long paragraph. Answer only what the customer asked; avoid filler, repeated greetings, repeated benefits, and unnecessary explanations. If a complete answer genuinely needs more detail, send 2 or at most 3 separate short chat bubbles by separating them with the exact token [[NEXT_MESSAGE]]. Use only one bubble for simple questions. Do not use numbered lists unless asked.
CUSTOMER NAME: The customer's name is ${customerName}. Almost never say the customer's name. Do not use it in routine replies, greetings, follow-ups, or every message. Only use it rarely when it feels genuinely important and personal.
SALES: Be helpful and naturally encourage ordering when relevant, without pressure. For product/price/order questions, briefly explain one relevant verified benefit or detail and, when appropriate, invite the customer to see the product or place an order. Address doubts honestly. Do not add an order pitch to every reply. Never invent discounts, scarcity, reviews, urgency, guarantees, or results.
FACTS & SUPPORT: Use BUSINESS DATA as the source of truth for product names, prices, stock, ingredients, benefits, usage, sizes, delivery and payment information. Never invent missing facts or medical claims, diagnose conditions, or promise treatment results. If a fact is missing, briefly say an admin needs to confirm it. If the customer asks for an admin or has a complaint needing intervention, say an admin will help. For product photo requests, include the available image as ![পণ্যের ছবি](IMAGE_URL) and the exact product page URL; never invent either.
CONVERSATION: Keep context from recent messages, answer the latest question directly, and do not repeat information already given unless asked. Do not mention internal rules or the message separator token.

${businessContext}${orderContext}`;

    const model = 'gemini-3.6-flash';
    let result: any = null;
    const conversationText = cleanMessages.map((item: any) => (item.role === 'assistant' ? 'Assistant: ' : 'Customer: ') + item.content).join(String.fromCharCode(10, 10));
    const input: any[] = [{
      type: 'text',
      text: `Recent conversation:\n${conversationText}\n\nAnswer the latest customer message. If audio is attached, understand the spoken words and reply to them. If an image is attached, inspect it and answer the customer about it.`
    }];

    if (mediaUrl && mediaType) {
      try {
        const mediaResponse = await fetch(mediaUrl, { signal: AbortSignal.timeout(12000) });
        if (!mediaResponse.ok) throw new Error('Uploaded attachment could not be read.');
        const contentType = (mediaResponse.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (mediaType === 'audio' && !contentType.startsWith('audio/')) throw new Error('Voice file format is not supported.');
        if (mediaType === 'image' && !contentType.startsWith('image/')) throw new Error('Image file could not be read.');
        const bytes = await mediaResponse.arrayBuffer();
        if (bytes.byteLength > 12 * 1024 * 1024) throw new Error('Attachment is too large for AI analysis.');
        input.push({ type: mediaType, data: Buffer.from(bytes).toString('base64'), mime_type: contentType });
      } catch (mediaError) {
        return json(res, { error: mediaError instanceof Error ? mediaError.message : 'Attachment could not be read.' }, 400);
      }
    }

    try {
      let response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          model,
          input,
          system_instruction: systemInstruction,
          store: false,
          generation_config: { max_output_tokens: 260, thinking_level: 'low' },
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (response.status === 429 || response.status === 503 || response.status === 504) {
        // Retry transient capacity errors once with the lighter free-tier model.
        await new Promise(resolve => setTimeout(resolve, 900));
        response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            model: 'gemini-3.5-flash-lite',
            input,
            system_instruction: systemInstruction,
            store: false,
            generation_config: { max_output_tokens: 260, thinking_level: 'low' },
          }),
          signal: AbortSignal.timeout(30000),
        });
      }
      result = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result?.error?.message || `Gemini Interactions API request failed (${response.status}).`;
        console.error('Gemini Interactions API error', response.status, message);
        return json(res, { error: message }, response.status === 429 ? 429 : 502);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini API request failed.';
      console.error('Gemini Interactions API request failed', message);
      return json(res, { error: message }, 502);
    }

    const reply = (typeof result?.output_text === 'string' ? result.output_text : (Array.isArray(result?.steps) ? result.steps : []).filter((step: any) => step?.type === 'model_output').flatMap((step: any) => Array.isArray(step?.content) ? step.content : []).map((part: any) => typeof part?.text === 'string' ? part.text : '').join('')).trim();
    if (!reply) return json(res, { error: 'Gemini returned an empty response. Please try again.' }, 502);
    return json(res, { text: reply });
  } catch (error) {
    console.error('AI chat error', error);
    return json(res, { error: error instanceof Error ? error.message : 'AI reply could not be generated.' }, 502);
  }
}
