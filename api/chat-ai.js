const SUPABASE_TIMEOUT_MS = 12000;
const AI_TIMEOUT_MS = 7000;

async function fetchWithTimeout(url, options = {}, timeoutMs = SUPABASE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonObject(text) {
  const source = String(text || '').trim();
  const candidates = [
    source,
    source.replace(/^\uFEFF/, '').replace(/^\x60{3}(?:json)?\s*/i, '').replace(/\s*\x60{3}\s*$/, '').trim(),
  ];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {}
  }

  // Some model responses include a short preamble or Markdown around the JSON.
  // Extract the first complete JSON object without breaking on braces inside strings.
  for (const candidate of candidates) {
    const start = candidate.indexOf('{');
    if (start < 0) continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < candidate.length; i += 1) {
      const ch = candidate[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(candidate.slice(start, i + 1));
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
          } catch {}
          break;
        }
      }
    }
  }
  throw new Error('Model response did not contain a valid JSON object');
}

function jsonError(res, status, message) {
  return res.status(status).json({ error: message });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'Method not allowed');
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!geminiApiKey) return jsonError(res, 503, 'Vercel-এ GEMINI_API_KEY সেট করা নেই। Google AI Studio থেকে API key যোগ করুন।');
  if (!supabaseUrl || !supabaseAnonKey) return jsonError(res, 503, 'Supabase server configuration পাওয়া যায়নি।');

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const conversationId = typeof body.conversationId === 'string' ? body.conversationId : '';
  const visitorToken = typeof body.visitorToken === 'string' ? body.visitorToken : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)) {
    return jsonError(res, 400, 'Chat conversation ID সঠিক নয়।');
  }
  if (visitorToken.length < 20 || visitorToken.length > 200) return jsonError(res, 400, 'Visitor token সঠিক নয়।');

  const baseUrl = supabaseUrl.replace(/\/+$/, '');
  const headers = {
    apikey: supabaseAnonKey,
    Authorization: 'Bearer ' + supabaseAnonKey,
    'Content-Type': 'application/json',
  };

  let stage = 'chat history';
  try {
    console.info('AI chat request started');
    const historyResponse = await fetchWithTimeout(baseUrl + '/rest/v1/rpc/get_guest_chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_visitor_token: visitorToken, p_conversation_id: conversationId }),
    }, SUPABASE_TIMEOUT_MS);
    if (!historyResponse.ok) return jsonError(res, 403, 'এই chat যাচাই করা যায়নি। Chat refresh করে আবার চেষ্টা করুন।');
    const history = await historyResponse.json();
    if (!Array.isArray(history) || history.length === 0) return jsonError(res, 400, 'এই chat-এ এখনো কোনো message পাওয়া যায়নি।');
    const latestMessage = history[history.length - 1];
    if (latestMessage.sender_type !== 'customer' || latestMessage.message_type !== 'text') {
      return jsonError(res, 409, 'এই message-এর উত্তর ইতিমধ্যে দেওয়া হয়েছে অথবা এটি text message নয়।');
    }

    stage = 'product catalog';
    const productsResponse = await fetchWithTimeout(
      baseUrl + '/rest/v1/products?select=name_en,name_bn,slug,short_description_bn,description_bn,benefits_bn,how_to_use_bn,ingredients_bn,who_is_it_for_bn,storage_bn,price,old_price,stock,is_on_sale,image_url,size_bn&is_active=eq.true&order=created_at.desc&limit=100',
      { headers },
      SUPABASE_TIMEOUT_MS
    );
    if (!productsResponse.ok) return jsonError(res, 502, 'ওয়েবসাইটের পণ্যের তথ্য এখন পাওয়া যাচ্ছে না।');
    const products = await productsResponse.json();

    stage = 'site settings';
    const settingsResponse = await fetchWithTimeout(
      baseUrl + '/rest/v1/site_settings?select=brand_name,brand_tagline_bn,phone,whatsapp_number,email,address_bn,delivery_inside_dhaka,delivery_outside_dhaka,free_delivery_threshold,free_delivery_enabled,free_delivery_minimum,cod_enabled,online_payment_enabled,announcement_bn,combo_offer_enabled,combo_offer_title,combo_offer_description,combo_offer_original_price,combo_offer_price,combo_offer_image_url,combo_offer_button_text,combo_offer_button_link,currency&id=eq.1&limit=1',
      { headers },
      SUPABASE_TIMEOUT_MS
    );
    if (!settingsResponse.ok) return jsonError(res, 502, 'ডেলিভারি ও ওয়েবসাইটের সেটিংস এখন ডাটাবেস থেকে পাওয়া যাচ্ছে না।');
    const settingsRows = await settingsResponse.json();
    if (!Array.isArray(settingsRows) || settingsRows.length === 0) {
      return jsonError(res, 502, 'ওয়েবসাইটের ডেলিভারি ও পেমেন্টের তথ্য ডাটাবেসে পাওয়া যায়নি।');
    }
    const siteSettings = settingsRows[0];
    const origin = 'https://homemade-beauty-care.vercel.app';

    const productContext = (Array.isArray(products) ? products : []).map((p) => ({
      name_bn: p.name_bn,
      name_en: p.name_en,
      slug: p.slug,
      price: p.price,
      old_price: p.old_price,
      stock: p.stock,
      on_sale: p.is_on_sale,
      size: p.size_bn,
      description: p.short_description_bn || p.description_bn,
      benefits: p.benefits_bn,
      ingredients: p.ingredients_bn,
      how_to_use: p.how_to_use_bn,
      suitable_for: p.who_is_it_for_bn,
      storage: p.storage_bn,
      image: p.image_url,
      link: origin + '/product/' + p.slug,
    }));

    const messages = history.slice(-18).map((m) => {
      let text = typeof m.message === 'string' ? m.message : '';
      if (/নতুন অর্ডার রিকোয়েস্ট|মোবাইল:\s*|সম্পূর্ণ ঠিকানা:/i.test(text)) {
        text = '[Customer submitted an order request. Personal details hidden.]';
      }
      if (m.sender_type === 'customer') return { role: 'user', content: text.slice(0, 3000) };
      const isAI = String(m.sender_name || '').toLowerCase().includes('ai assistant');
      return {
        role: 'assistant',
        content: (isAI ? text : 'মানব অ্যাডমিনের পূর্বের উত্তর: ' + text).slice(0, 3000),
      };
    }).filter((m) => m.content.trim());

    const publicBusinessContext = {
      brand_name: siteSettings.brand_name,
      tagline_bn: siteSettings.brand_tagline_bn,
      contact_phone: siteSettings.phone,
      whatsapp_number: siteSettings.whatsapp_number,
      contact_email: siteSettings.email,
      business_address: siteSettings.address_bn,
      delivery_inside_dhaka: siteSettings.delivery_inside_dhaka,
      delivery_outside_dhaka: siteSettings.delivery_outside_dhaka,
      free_delivery_enabled: siteSettings.free_delivery_enabled,
      free_delivery_threshold: siteSettings.free_delivery_threshold,
      free_delivery_minimum: siteSettings.free_delivery_minimum,
      cash_on_delivery_enabled: siteSettings.cod_enabled,
      online_payment_enabled: siteSettings.online_payment_enabled,
      announcement: siteSettings.announcement_bn,
      combo_offer_enabled: siteSettings.combo_offer_enabled,
      combo_offer_title: siteSettings.combo_offer_title,
      combo_offer_description: siteSettings.combo_offer_description,
      combo_offer_original_price: siteSettings.combo_offer_original_price,
      combo_offer_price: siteSettings.combo_offer_price,
      combo_offer_image_url: siteSettings.combo_offer_image_url,
      combo_offer_button_text: siteSettings.combo_offer_button_text,
      combo_offer_button_link: siteSettings.combo_offer_button_link,
      currency: siteSettings.currency,
    };

    const systemPrompt = [
      'তুমি Homemade Beauty Care-এর লাইভ-চ্যাট কাস্টমার কেয়ার ও সেলস সহকারী। বাংলা, বাংলিশ, ইংরেজি এবং বানান ভুল বুঝবে। স্বাভাবিক, সংক্ষিপ্ত, ভদ্র বাংলায় উত্তর দেবে; প্রতিটি customer প্রশ্নের উত্তর সাধারণত ২-৩টি আলাদা ছোট chat message-এ দেবে—একটি বড় paragraph লিখবে না। প্রতিটি message-এ মাত্র ১টি ছোট বাক্য (সাধারণত ৮-১৮টি বাংলা শব্দ) থাকবে; প্রতিটি message আলাদা replies array item হবে, যাতে আলাদা chat bubble হিসেবে পাঠানো যায়। প্রথম message-এ সরাসরি প্রশ্নের উত্তর, পরেরটিতে দরকারি তথ্য, আর শেষটিতে প্রাসঙ্গিক হলে নরম next step দেবে। প্রশ্নের জন্য সত্যিই একটিমাত্র ছোট উত্তর যথেষ্ট হলে জোর করে বাড়াবে না, তবে সাধারণ customer প্রশ্নে ২-৩টি ছোট message ব্যবহার করবে। একই কথা ভাগ করে পুনরাবৃত্তি করবে না। একই প্রশ্ন বারবার করবে না এবং প্রতিবার customer-এর নাম ধরে ডাকবে না।',
      'ডাটাবেসের LIVE PRODUCT DATA ও LIVE BUSINESS SETTINGS-ই পণ্য, দাম, স্টক, সাইজ, উপাদান, উপকারিতা, ব্যবহারবিধি, ডেলিভারি চার্জ, ফ্রি ডেলিভারি, পেমেন্ট, যোগাযোগ, ঠিকানা ও অফারের একমাত্র নির্ভরযোগ্য উৎস। কোনো তথ্য বানাবে না বা পুরোনো/অনুমান করা তথ্য বলবে না। ডাটাবেসে কোনো তথ্য null/ফাঁকা/অনুপস্থিত হলে নিশ্চিত তথ্য নেই বলবে এবং অ্যাডমিনের সাহায্য অফার করবে। ডাটাবেসে থাকা বর্তমান তথ্য থেকেই উত্তর দেবে।',
      'ডেলিভারি প্রশ্নে ঢাকার ভিতর ও ঢাকার বাইরে আলাদা চার্জ SETTINGS থেকে জানাবে। free_delivery_enabled true না হলে ফ্রি ডেলিভারি আছে বলবে না, threshold/minimum দিয়ে নিজে থেকে ছাড় তৈরি করবে না। cash_on_delivery_enabled true হলে ক্যাশ অন ডেলিভারি আছে বলতে পারবে; online_payment_enabled false হলে অনলাইন পেমেন্ট চালু আছে বলবে না। ডেলিভারি সময় বা নির্দিষ্ট কুরিয়ার সেটিংসে নেই, তাই সময়/কুরিয়ার বানাবে না; জেলা/এলাকা অনুযায়ী নিশ্চিত না হলে অ্যাডমিনের সাহায্য দেবে।',
      'সেলস ও অর্ডার কনভার্সন (গুরুত্বপূর্ণ): তুমি শুধু তথ্য দেওয়ার bot নও—ভদ্র, সহায়ক ও ফলপ্রসূ sales assistant। customer-এর প্রয়োজন/চুল বা ত্বকের concern বুঝে catalog-এ থাকা সবচেয়ে উপযুক্ত পণ্যটি প্রস্তাব করো; database-এ থাকা বাস্তব উপকারিতা, উপাদান, ব্যবহারবিধি, দাম ও প্রাসঙ্গিক delivery/COD তথ্য দিয়ে কেন এটি তার জন্য মানানসই হতে পারে বোঝাও। customer-এর প্রশ্নের উত্তর দেওয়ার পর কথোপকথন স্বাভাবিকভাবে অর্ডারের দিকে এগিয়ে নাও: যেমন “আপনি চাইলে এই পণ্যটি অর্ডার করে দিতে পারি—কয়টি নিতে চান?” অথবা পণ্যের পরিমাণ জানা থাকলে “আপনার জন্য অর্ডার ফর্মটি খুলে দিই?” Customer ইতিবাচক আগ্রহ দেখালে অপ্রয়োজনীয় বিক্রির কথা না বলে product ও quantity নিশ্চিত করে orderReady=true দিয়ে অর্ডার ফর্ম দেখাও। customer দাম/ডেলিভারি/ব্যবহার নিয়ে দ্বিধায় থাকলে সেই আপত্তির সরাসরি উত্তর দাও, তারপর নরমভাবে অর্ডারের প্রস্তাব দাও। প্রতিটি প্রাসঙ্গিক উত্তরে একটি ছোট, সহজ next step রাখবে; তবে customer শুধু তথ্য চাইলে, অভিযোগ করলে বা অর্ডার না করতে চাইলে জোর করবে না। একসঙ্গে অনেক প্রশ্ন করবে না। কখনো মিথ্যা scarcity, discount, guarantee, review, medical claim, নিশ্চিত ফলাফল বা ভয় দেখিয়ে বিক্রি করবে না; database-এর বাইরে কোনো দাবি করবে না.',
      'Combo offer শুধু combo_offer_enabled true হলে উল্লেখ করবে; title/price/description ডাটাবেস থেকে হুবহু তথ্য অনুযায়ী বলবে। Offer button link থাকলে সেটি ব্যবহার করতে পারো। কোনো product/offer stock বা price সম্পর্কে অনিশ্চিত হলে বানিয়ে বলবে না।',
      'অর্ডার নিয়ম: “order nin”, “অর্ডার নেন”, “order korbo” মানে নতুন অর্ডার করতে চাওয়া; tracking নয়। কথোপকথনে পণ্য ও অর্ডার করার ইচ্ছা আগেই বলা থাকলে সেটা মনে রাখবে। পণ্য জানা কিন্তু quantity না জানা থাকলে শুধু পরিমাণ জিজ্ঞেস করবে। quantity জানা থাকলে আবার জিজ্ঞেস করবে না।',
      'orderReady=true কেবল তখনই হবে যখন customer-এর অর্ডার করার ইচ্ছা আছে এবং নির্দিষ্ট পণ্য ও পরিমাণ কথোপকথন থেকে নিশ্চিত। তখন reply-তে বলবে নাম, মোবাইল ও ঠিকানা দেওয়ার form দেখানো হচ্ছে। productName হবে catalog-এর সঠিক বাংলা/ইংরেজি নাম; quantity পূর্ণ ধনাত্মক integer; unitPrice catalog-এর বর্তমান price। পণ্য/পরিমাণ নিশ্চিত না হলে orderReady=false।',
      'অর্ডারের ফর্ম পাঠানো মানে অর্ডার নিশ্চিত নয়; অ্যাডমিন স্টক, দাম ও ডেলিভারি যাচাই করবেন। কখনো অর্ডার কনফার্ম হয়েছে বলবে না। অভিযোগ, refund/dispute, অর্ডার tracking, বা ডাটাবেসে অনুপস্থিত/অনিশ্চিত তথ্যের প্রশ্নে সংক্ষিপ্তভাবে অ্যাডমিনের সাহায্য দেওয়ার কথা বলবে। ডাটাবেসে থাকা নয় এমন পুরোনো অর্ডারের তথ্য কখনো অনুমান করবে না।',
      'product question হলে সম্ভব হলে সঠিক product link এবং image URL reply-তে দেবে। সবসময় শুধু JSON object ফেরত দেবে, এই schema মেনে: {"reply":"...","orderReady":false,"productName":null,"quantity":null,"unitPrice":null,"handoff":false}.',
      'LIVE PRODUCT DATA: ' + JSON.stringify(productContext).slice(0, 26000),
      'LIVE BUSINESS SETTINGS: ' + JSON.stringify(publicBusinessContext).slice(0, 10000),
    ].join('\n\n');

    let raw = '';
    let geminiFailure = '';
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        reply: { type: 'STRING' },
        replies: { type: 'ARRAY', items: { type: 'STRING' } },
        orderReady: { type: 'BOOLEAN' },
        productName: { type: 'STRING', nullable: true },
        quantity: { type: 'INTEGER', nullable: true },
        unitPrice: { type: 'NUMBER', nullable: true },
        handoff: { type: 'BOOLEAN' },
      },
      required: ['reply', 'replies', 'orderReady', 'productName', 'quantity', 'unitPrice', 'handoff'],
    };
    const conversationText = [
      'CONVERSATION HISTORY (oldest first):',
      messages.slice(-10).map((m) => (m.role === 'assistant' ? 'Assistant: ' : 'Customer: ') + m.content).join('\n'),
      'Return only the JSON object required by the schema.',
    ].join('\n\n');

    // Try two Gemini models in order. If the first is slow/unavailable, quickly try the second.
    const geminiModels = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'];
    if (geminiApiKey) {
      for (const model of geminiModels) {
        stage = 'Gemini API (' + model + ')';
        try {
          const response = await fetchWithTimeout('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(geminiApiKey), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: conversationText }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema,
                maxOutputTokens: 500,
                temperature: 0.2,
              },
            }),
          }, 9000);
          const payload = await response.json().catch(() => ({}));
          const parts = payload && payload.candidates && payload.candidates[0] && payload.candidates[0].content && payload.candidates[0].content.parts;
          const candidateText = Array.isArray(parts) ? parts.filter((part) => part && typeof part.text === 'string').map((part) => part.text).join('') : '';
          if (response.ok && candidateText.trim()) {
            raw = candidateText;
            console.info('Gemini model replied', { model });
            break;
          }
          const modelFailure = model + ' HTTP ' + response.status + (payload?.error?.message ? ': ' + String(payload.error.message).slice(0, 180) : '');
          geminiFailure = geminiFailure ? geminiFailure + ' | ' + modelFailure : modelFailure;
          console.warn('Gemini model failed; trying next model', { model, status: response.status, providerMessage: String(payload?.error?.message || '').slice(0, 220), hasText: Boolean(candidateText.trim()) });
        } catch (error) {
          const modelFailure = model + ': ' + String(error && error.message || error).slice(0, 180);
          geminiFailure = geminiFailure ? geminiFailure + ' | ' + modelFailure : modelFailure;
          console.warn('Gemini model timed out/failed; trying next model', { model, name: error && error.name, message: String(error && error.message || error).slice(0, 180) });
        }
      }
    }

    if (!raw.trim()) {
      console.error('Both Gemini models failed', { geminiFailure });
      return jsonError(res, 502, 'দুইটি Gemini মডেলই এখন উত্তর দিতে পারেনি। একটু পরে আবার চেষ্টা করুন।');
    }

    if (typeof raw !== 'string' || !raw.trim()) return jsonError(res, 502, 'AI-এর উত্তর সঠিকভাবে তৈরি হয়নি।');
    let result;
    try { result = parseJsonObject(raw); } catch { console.warn('Gemini response was not valid JSON', { responseLength: raw.length }); return jsonError(res, 502, 'AI-এর উত্তর সঠিকভাবে তৈরি হয়নি। আবার চেষ্টা করুন।'); }
    if (typeof result.reply !== 'string' || !result.reply.trim()) return jsonError(res, 502, 'AI কোনো উত্তর দেয়নি।');

    const safeResult = {
      reply: result.reply.slice(0, 1800),
      replies: (Array.isArray(result.replies) ? result.replies : [result.reply])
        .filter((part) => typeof part === 'string' && part.trim())
        .slice(0, 3)
        .map((part) => part.trim().slice(0, 600)),
      orderReady: result.orderReady === true
        && typeof result.productName === 'string'
        && Number.isInteger(result.quantity)
        && result.quantity > 0
        && result.quantity <= 100,
      productName: typeof result.productName === 'string' ? result.productName.slice(0, 160) : null,
      quantity: Number.isInteger(result.quantity) ? result.quantity : null,
      unitPrice: typeof result.unitPrice === 'number' && Number.isFinite(result.unitPrice) ? result.unitPrice : null,
      handoff: result.handoff === true,
    };

    if (safeResult.orderReady) {
      const matched = productContext.find((p) => p.name_bn === safeResult.productName || p.name_en === safeResult.productName);
      if (!matched || Number(matched.stock || 0) <= 0) {
        safeResult.orderReady = false;
        safeResult.productName = null;
        safeResult.quantity = null;
        safeResult.unitPrice = null;
      } else {
        safeResult.productName = matched.name_bn || matched.name_en;
        safeResult.unitPrice = Number(matched.price);
      }
    }
    console.info('AI chat request completed');
    return res.status(200).json(safeResult);
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    console.error('AI chat handler failed', { stage, name: error && error.name, message: String(error && error.message || error).slice(0, 300) });
    if (timedOut) {
      return jsonError(res, 504, stage.startsWith('Gemini API')
        ? 'Gemini AI service সময়মতো উত্তর দেয়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।'
        : 'চ্যাটের তথ্য আনতে Supabase দেরি করছে। আবার চেষ্টা করুন।');
    }
    return jsonError(res, 500, 'AI chat-এ সাময়িক সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।');
  }
}
