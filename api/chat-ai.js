const OPENAI_MODEL = 'gpt-4o-mini';
const SUPABASE_TIMEOUT_MS = 12000;
const AI_TIMEOUT_MS = 25000;

async function fetchWithTimeout(url, options = {}, timeoutMs = SUPABASE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!geminiApiKey && !openAiApiKey) return jsonError(res, 503, 'Vercel-এ GEMINI_API_KEY সেট করা নেই। Google AI Studio থেকে free API key তৈরি করে যোগ করুন।');
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

    const systemPrompt = [
      'তুমি Homemade Beauty Care-এর লাইভ-চ্যাট কাস্টমার কেয়ার সহকারী। বাংলা, বাংলিশ, ইংরেজি এবং বানান ভুল বুঝবে। স্বাভাবিক, সংক্ষিপ্ত, ভদ্র বাংলায় উত্তর দেবে; সাধারণত ১-৩টি ছোট বাক্য। একই প্রশ্ন বারবার করবে না এবং প্রতিবার customer-এর নাম ধরে ডাকবে না।',
      'শুধু নিচের LIVE PRODUCT DATA-কে পণ্যের তথ্যের নির্ভরযোগ্য উৎস হিসেবে ব্যবহার করবে। দাম, স্টক, উপাদান, উপকারিতা, ব্যবহারবিধি, অফার বা লিংক বানিয়ে বলবে না। কোনো তথ্য নেই বা মিল নিশ্চিত নয়—সেটা স্পষ্ট করে বলবে এবং প্রয়োজন হলে অ্যাডমিনের সাহায্য চাইবে। স্টক 0 হলে পণ্য মজুদ নেই বলবে। পণ্যের নামের typo যেমন harpack/hairpack হলে তালিকার সঙ্গে মিল খুঁজবে।',
      'অর্ডার নিয়ম: “order nin”, “অর্ডার নেন”, “order korbo” মানে নতুন অর্ডার করতে চাওয়া; tracking নয়। কথোপকথনে পণ্য ও অর্ডার করার ইচ্ছা আগেই বলা থাকলে সেটা মনে রাখবে। পণ্য জানা কিন্তু quantity না জানা থাকলে শুধু পরিমাণ জিজ্ঞেস করবে। quantity জানা থাকলে আবার জিজ্ঞেস করবে না।',
      'orderReady=true কেবল তখনই হবে যখন customer-এর অর্ডার করার ইচ্ছা আছে এবং নির্দিষ্ট পণ্য ও পরিমাণ কথোপকথন থেকে নিশ্চিত। তখন reply-তে বলবে নাম, মোবাইল ও ঠিকানা দেওয়ার form দেখানো হচ্ছে। productName হবে catalog-এর সঠিক বাংলা/ইংরেজি নাম; quantity পূর্ণ ধনাত্মক integer; unitPrice catalog-এর বর্তমান price। পণ্য/পরিমাণ নিশ্চিত না হলে orderReady=false।',
      'অর্ডারের ফর্ম পাঠানো মানে অর্ডার নিশ্চিত নয়; অ্যাডমিন স্টক, দাম ও ডেলিভারি যাচাই করবেন। কখনো অর্ডার কনফার্ম হয়েছে বলবে না। অভিযোগ, refund/dispute, অর্ডার tracking, বা পণ্যের বাইরে অনিশ্চিত প্রশ্নে সংক্ষিপ্তভাবে অ্যাডমিনের সাহায্য দেওয়ার কথা বলবে। ডাটাবেসে থাকা নয় এমন পুরোনো অর্ডারের তথ্য কখনো অনুমান করবে না।',
      'product question হলে সম্ভব হলে সঠিক product link এবং image URL reply-তে দেবে। শুধু JSON object ফেরত দেবে, এই schema মেনে: {"reply":"...","orderReady":false,"productName":null,"quantity":null,"unitPrice":null,"handoff":false}.',
      'LIVE PRODUCT DATA: ' + JSON.stringify(productContext).slice(0, 26000),
    ].join('\n\n');

    let raw = '';
    if (geminiApiKey) {
      stage = 'Gemini API';
      const conversationInput = [
        'SYSTEM INSTRUCTIONS:\\n' + systemPrompt,
        'CONVERSATION HISTORY (oldest first):\\n' + messages.map((m) => (m.role === 'assistant' ? 'Assistant: ' : 'Customer: ') + m.content).join('\\n'),
        'Return only the JSON object required by the schema.',
      ].join('\\n\\n');
      const geminiResponse = await fetchWithTimeout('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' + encodeURIComponent(geminiApiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: [
            'CONVERSATION HISTORY (oldest first):',
            messages.map((m) => (m.role === 'assistant' ? 'Assistant: ' : 'Customer: ') + m.content).join('\\n'),
            'Return only the JSON object required by the schema.',
          ].join('\\n\\n') }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                reply: { type: 'STRING' },
                orderReady: { type: 'BOOLEAN' },
                productName: { type: 'STRING', nullable: true },
                quantity: { type: 'INTEGER', nullable: true },
                unitPrice: { type: 'NUMBER', nullable: true },
                handoff: { type: 'BOOLEAN' },
              },
              required: ['reply', 'orderReady', 'productName', 'quantity', 'unitPrice', 'handoff'],
            },
            maxOutputTokens: 700,
            temperature: 0.3,
          },
        }),
      }, AI_TIMEOUT_MS);
      let geminiPayload = {};
      try { geminiPayload = await geminiResponse.json(); } catch { geminiPayload = {}; }
      if (!geminiResponse.ok) {
        const providerError = geminiPayload && geminiPayload.error ? geminiPayload.error : {};
        const providerMessage = String(providerError.message || '').slice(0, 400);
        console.error('Gemini generateContent API request failed', { status: geminiResponse.status, code: providerError.status || '', message: providerMessage });
        if (geminiResponse.status === 400 || geminiResponse.status === 403 || geminiResponse.status === 401) return jsonError(res, 502, 'Gemini API key বা API configuration সঠিক নয়। Google AI Studio-তে key ও API access যাচাই করুন।');
        if (geminiResponse.status === 429) return jsonError(res, 502, 'Gemini API quota বা rate limit আপাতত শেষ হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।');
        return jsonError(res, 502, `Gemini API অনুরোধ ব্যর্থ হয়েছে (HTTP ${geminiResponse.status})।`);
      }
      const parts = geminiPayload && geminiPayload.candidates && geminiPayload.candidates[0] && geminiPayload.candidates[0].content && geminiPayload.candidates[0].content.parts;
      raw = Array.isArray(parts) ? parts.filter((part) => part && typeof part.text === 'string').map((part) => part.text).join('') : '';
      if (!raw.trim()) {
        console.error('Gemini generateContent response did not contain text output', {
          keys: Object.keys(geminiPayload || {}),
          finishReason: geminiPayload && geminiPayload.candidates && geminiPayload.candidates[0] && geminiPayload.candidates[0].finishReason,
        });
        return jsonError(res, 502, 'Gemini API থেকে উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন।');
      }
    } else {
      stage = 'OpenAI API';
      const openAIResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + openAiApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'homemade_beauty_chat_reply',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  reply: { type: 'string' },
                  orderReady: { type: 'boolean' },
                  productName: { type: ['string', 'null'] },
                  quantity: { type: ['integer', 'null'] },
                  unitPrice: { type: ['number', 'null'] },
                  handoff: { type: 'boolean' },
                },
                required: ['reply', 'orderReady', 'productName', 'quantity', 'unitPrice', 'handoff'],
                additionalProperties: false,
              },
            },
          },
          max_completion_tokens: 500,
        }),
      }, AI_TIMEOUT_MS);
      let aiPayload = {};
      try { aiPayload = await openAIResponse.json(); } catch { aiPayload = {}; }
      if (!openAIResponse.ok) {
        const providerError = aiPayload && aiPayload.error ? aiPayload.error : {};
        const providerCode = String(providerError.code || providerError.type || '');
        const providerMessage = String(providerError.message || '').slice(0, 500);
        console.error('OpenAI API request failed', { status: openAIResponse.status, code: providerCode, message: providerMessage });
        if (openAIResponse.status === 401) return jsonError(res, 502, 'OpenAI API key সঠিক নয় বা বাতিল হয়েছে।');
        if (openAIResponse.status === 429 && /insufficient_quota|billing|quota/i.test(providerCode + ' ' + providerMessage)) return jsonError(res, 502, 'OpenAI API account-এ পর্যাপ্ত API credit নেই বা billing limit শেষ।');
        if (openAIResponse.status === 429) return jsonError(res, 502, 'OpenAI API-তে rate limit হয়েছে।');
        return jsonError(res, 502, `OpenAI API request ব্যর্থ হয়েছে (HTTP ${openAIResponse.status})।`);
      }
      raw = aiPayload.choices && aiPayload.choices[0] && aiPayload.choices[0].message && aiPayload.choices[0].message.content;
    }

    if (typeof raw !== 'string' || !raw.trim()) return jsonError(res, 502, 'AI-এর উত্তর সঠিকভাবে তৈরি হয়নি।');
    let result;
    try { result = JSON.parse(raw); } catch { return jsonError(res, 502, 'AI-এর উত্তর পড়া যায়নি।'); }
    if (typeof result.reply !== 'string' || !result.reply.trim()) return jsonError(res, 502, 'AI কোনো উত্তর দেয়নি।');

    const safeResult = {
      reply: result.reply.slice(0, 1800),
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
      return jsonError(res, 504, stage === 'Gemini API' || stage === 'OpenAI API'
        ? 'AI service সময়মতো উত্তর দেয়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।'
        : 'চ্যাটের তথ্য আনতে Supabase দেরি করছে। আবার চেষ্টা করুন।');
    }
    return jsonError(res, 500, 'AI chat-এ সাময়িক সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।');
  }
}
