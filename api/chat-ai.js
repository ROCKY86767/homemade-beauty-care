export const config = { maxDuration: 60 };

const SUPABASE_TIMEOUT_MS = 5000;
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

function buildFallbackResponse(question, productContext, settings) {
  const q = String(question || '').toLowerCase();
  const has = (...words) => words.some((word) => q.includes(word));
  const replies = [];
  const add = (...parts) => parts.filter(Boolean).forEach((part) => replies.push(String(part).slice(0, 600)));
  const money = (value) => value === null || value === undefined || value === '' ? null : '৳' + value;
  const romanHairFall = /\b(?:cul|chul)\b.*\b(?:pore|porche|jhore|jhorche)\b|\b(?:hair\s*fall|hairfall|hair\s*loss)\b/i.test(q);
  const hairFallConcern = romanHairFall || has('চুল পড়ে', 'চুল পড়ে', 'চুল ঝরে', 'চুল ঝরছে', 'অনেক চুল', 'চুল পড়া', 'চুল পড়া', 'hair fall', 'hairfall', 'hair loss');
  const offerIntent = /\\b(?:offer|offers|discount|sale|promo|promotion|deal)\\b/i.test(q) || has('অফার', 'ছাড়', 'ছাড়', 'ডিসকাউন্ট', 'কম্বো', 'কোনো অফার', 'কোন অফার');
  if (offerIntent) {
    const offerParts = [];
    if (settings.combo_offer_enabled === true && settings.combo_offer_title && settings.combo_offer_price !== null && settings.combo_offer_price !== undefined && settings.combo_offer_price !== '') {
      offerParts.push(String(settings.combo_offer_title));
      if (settings.combo_offer_description) offerParts.push(String(settings.combo_offer_description));
      if (settings.combo_offer_original_price) offerParts.push('আগের মূল্য ৳' + settings.combo_offer_original_price + '।');
      offerParts.push('অফার মূল্য ৳' + settings.combo_offer_price + '।');
      if (settings.combo_offer_button_link) offerParts.push('বিস্তারিত: ' + settings.combo_offer_button_link);
      add('জি, বর্তমানে আমাদের একটি Combo Offer চালু আছে।', offerParts.join(' '), 'আপনি চাইলে Combo Offer-টি অর্ডার করতে সাহায্য করতে পারি।');
    } else {
      const saleProducts = (Array.isArray(productContext) ? productContext : [])
        .filter((product) => product.on_sale === true && Number(product.stock || 0) > 0 && Number(product.old_price || 0) > Number(product.price || 0))
        .slice(0, 3);
      if (saleProducts.length) {
        add('জি, বর্তমানে কিছু পণ্যে অফার চলছে:', saleProducts.map((p) => (p.name_bn || p.name_en) + ' — ৳' + p.price + ' (আগের মূল্য ৳' + p.old_price + ')').join('। '), 'কোন পণ্যটির অফার সম্পর্কে জানতে চান?');
      } else {
        add('এই মুহূর্তে ডেটাবেসে কোনো সক্রিয় অফারের তথ্য পাওয়া যায়নি।', 'নতুন অফার চালু হলে ওয়েবসাইটে আপডেট করা হবে; চাইলে নির্দিষ্ট পণ্যের দাম জানাতে পারি।');
      }
    }
    return { reply: replies.join(' '), replies: replies.slice(0, 3), orderReady: false, productName: null, quantity: null, unitPrice: null, handoff: false };
  }
  const isGreeting = has('হ্যালো', 'হ্যালো', 'hello', 'hi', 'আসসালামু', 'assalamu', 'নমস্কার');
  if (isGreeting) {
    add('আসসালামু আলাইকুম! Homemade Beauty Care-এ আপনাকে স্বাগতম।', 'চুলের যত্ন নাকি ত্বকের যত্নের পণ্য খুঁজছেন?');
    return { reply: replies.join(' '), replies, orderReady: false, productName: null, quantity: null, unitPrice: null, handoff: false };
  }
  if (has('ডেলিভারি চার্জ', 'delivery charge', 'ডেলিভারি কত', 'কুরিয়ার চার্জ', 'ঢাকার ভিতর', 'ঢাকার বাইরে')) {
    const inside = settings.delivery_inside_dhaka;
    const outside = settings.delivery_outside_dhaka;
    add('ডেলিভারি চার্জের তথ্য:', inside !== null && inside !== undefined ? 'ঢাকার ভিতরে ' + money(inside) + '.' : 'ঢাকার ভিতরের চার্জটি এখন নিশ্চিত করতে পারছি না.', outside !== null && outside !== undefined ? 'ঢাকার বাইরে ' + money(outside) + '.' : 'ঢাকার বাইরের চার্জটি এখন নিশ্চিত করতে পারছি না.');
    add('আপনার ডেলিভারি এলাকা জানালে টিম সঠিক চার্জ নিশ্চিত করতে পারবে।');
    return { reply: replies.join(' '), replies: replies.slice(0, 3), orderReady: false, productName: null, quantity: null, unitPrice: null, handoff: false };
  }
  if (has('ক্যাশ অন ডেলিভারি', 'cash on delivery', 'cod', 'হাতে পেয়ে', 'পণ্য পেয়ে টাকা')) {
    add(settings.cash_on_delivery_enabled === true ? 'জি, ওয়েবসাইটের সেটিংস অনুযায়ী ক্যাশ অন ডেলিভারি চালু আছে।' : 'ক্যাশ অন ডেলিভারি চালু আছে কি না, এখন নিশ্চিত করতে পারছি না।', 'আপনি চাইলে পছন্দের পণ্যটি জানাতে পারেন, আমি তথ্য খুঁজে দিতে চেষ্টা করব।');
    return { reply: replies.join(' '), replies, orderReady: false, productName: null, quantity: null, unitPrice: null, handoff: false };
  }
  if (hairFallConcern) {
    const hairProducts = (Array.isArray(productContext) ? productContext : [])
      .filter((product) => Number(product.stock || 0) > 0)
      .map((product) => {
        const searchable = [product.name_bn, product.name_en, product.description, product.benefits, product.ingredients, product.how_to_use, product.suitable_for, product.slug].filter(Boolean).join(' ').toLowerCase();
        const relevant = /hair|চুল|হেয়ার|হেয়ার|hair-care|hair-oil|hair-pack/.test(searchable);
        const supportsConcern = /fall|loss|ঝরা|পড়া|পড়া|মজবুত|গোড়া|গোড়া|scalp|স্ক্যাল্প/.test(searchable);
        return { product, score: relevant ? (supportsConcern ? 3 : 1) : 0 };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    if (hairProducts.length) {
      const suggestions = hairProducts.map(({ product }) => {
        const name = product.name_bn || product.name_en || 'পণ্য';
        const price = money(product.price);
        return name + (price ? ' — ' + price : '') + (product.link ? '। বিস্তারিত: ' + product.link : '');
      });
      add('বুঝতে পারছি, আপনার অনেক চুল পড়ছে—এটা নিশ্চয়ই চিন্তার বিষয়।', 'ক্যাটালগে চুলের যত্নের যে পণ্যগুলো আছে, সেগুলো দেখতে পারেন: ' + suggestions.join(' | '), 'চুল পড়া কতদিন ধরে হচ্ছে—সম্প্রতি, নাকি অনেক দিন ধরে?');
      return { reply: replies.join(' '), replies: replies.slice(0, 3), orderReady: false, productName: null, quantity: null, unitPrice: null, handoff: false };
    }
    add('বুঝতে পারছি, আপনার অনেক চুল পড়ছে—এটা নিশ্চয়ই চিন্তার বিষয়।', 'চুল পড়ার কারণ শুধু চ্যাটে নিশ্চিত করা সম্ভব নয়; প্রয়োজনে চর্মরোগ বিশেষজ্ঞের পরামর্শ নিন।', 'চুল পড়া কতদিন ধরে হচ্ছে—সম্প্রতি, নাকি অনেক দিন ধরে?');
    return { reply: replies.join(' '), replies: replies.slice(0, 3), orderReady: false, productName: null, quantity: null, unitPrice: null, handoff: false };
  }
  const queryWords = q.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 2);
  const scored = (Array.isArray(productContext) ? productContext : []).map((product) => {
    const haystack = [product.name_bn, product.name_en, product.description, product.benefits, product.ingredients, product.suitable_for, product.how_to_use, product.slug].filter(Boolean).join(' ').toLowerCase();
    let score = queryWords.reduce((sum, word) => sum + (haystack.includes(word) ? 2 : 0), 0);
    if (has('চুল', 'hair', 'হেয়ার', 'হেয়ার') && /hair|চুল|হেয়ার|হেয়ার/.test(haystack)) score += 2;
    if (has('ত্বক', 'skin', 'face', 'মুখ', 'স্কিন', 'ফেস') && /skin|face|ত্বক|মুখ|স্কিন|ফেস/.test(haystack)) score += 2;
    return { product, score };
  }).filter((item) => item.score > 0 && Number(item.product.stock || 0) > 0).sort((a, b) => b.score - a.score).slice(0, 2);
  if (scored.length) {
    const items = scored.map(({ product }) => {
      const name = product.name_bn || product.name_en || 'পণ্য';
      const price = money(product.price);
      return name + (price ? ' — ' + price : '') + (product.link ? '। বিস্তারিত: ' + product.link : '');
    });
    add('আপনার প্রশ্ন অনুযায়ী ক্যাটালগে এই পণ্যগুলো মিলেছে:', items.join(' | '), 'কোন পণ্যটি সম্পর্কে বিস্তারিত জানতে চান?');
    return { reply: replies.join(' '), replies: replies.slice(0, 3), orderReady: false, productName: null, quantity: null, unitPrice: null, handoff: false };
  }
  const originalQuestion = String(question || '').trim().slice(0, 220);
  if (originalQuestion) add('আপনার প্রশ্নটি পেয়েছি: “' + originalQuestion + '”।');
  add('এই মুহূর্তে ক্যাটালগ বা সেটিংস থেকে নির্ভরযোগ্য উত্তর নিশ্চিত করা যাচ্ছে না।', 'ভুল তথ্য না দিয়ে আপনার মেসেজটি টিমের নজরে রাখছি; চ্যাটটি খোলা রাখুন, অ্যাডমিন উত্তর দেবেন।');
  return { reply: replies.join(' '), replies: replies.slice(0, 3), orderReady: false, productName: null, quantity: null, unitPrice: null, handoff: true };
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
    if (!productsResponse.ok) return res.status(200).json(buildFallbackResponse(latestMessage.message, [], {}));
    const products = await productsResponse.json();

    stage = 'site settings';
    const settingsResponse = await fetchWithTimeout(
      baseUrl + '/rest/v1/site_settings?select=brand_name,brand_tagline_bn,phone,whatsapp_number,email,address_bn,delivery_inside_dhaka,delivery_outside_dhaka,free_delivery_threshold,free_delivery_enabled,free_delivery_minimum,cod_enabled,online_payment_enabled,announcement_bn,combo_offer_enabled,combo_offer_title,combo_offer_description,combo_offer_original_price,combo_offer_price,combo_offer_image_url,combo_offer_button_text,combo_offer_button_link,currency&id=eq.1&limit=1',
      { headers },
      SUPABASE_TIMEOUT_MS
    );
    if (!settingsResponse.ok) return res.status(200).json(buildFallbackResponse(latestMessage.message, [], {}));
    const settingsRows = await settingsResponse.json();
    if (!Array.isArray(settingsRows) || settingsRows.length === 0) {
      return res.status(200).json(buildFallbackResponse(latestMessage.message, [], {}));
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

    const questionWords = String(latestMessage.message || '').toLowerCase().split(/[^\\p{L}\\p{N}]+/u).filter((word) => word.length > 2);
    const modelProductContext = productContext
      .map((product) => {
        const searchable = [product.name_bn, product.name_en, product.slug, product.description, product.benefits, product.ingredients, product.how_to_use, product.suitable_for].filter(Boolean).join(' ').toLowerCase();
        let score = questionWords.reduce((total, word) => total + (searchable.includes(word) ? 2 : 0), 0);
        const question = String(latestMessage.message || '').toLowerCase();
        if (/চুল|hair|হেয়ার|হেয়ার/.test(question) && /hair|চুল|হেয়ার|হেয়ার/.test(searchable)) score += 3;
        if (/ত্বক|skin|face|মুখ|স্কিন|ফেস/.test(question) && /skin|face|ত্বক|মুখ|স্কিন|ফেস/.test(searchable)) score += 3;
        return { product, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(({ product }) => product);

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

    // Approved, static FAQ answers are served directly from the database before calling Gemini.
    // Product price, stock, offers and delivery are deliberately excluded from this reusable memory.
    stage = 'approved AI knowledge';
    try {
      const knowledgeResponse = await fetchWithTimeout(
        baseUrl + '/rest/v1/ai_reply_knowledge?select=title,question_patterns,replies,category&approved=eq.true&is_active=eq.true&category=eq.general&limit=100',
        { headers },
        2500
      );
      if (knowledgeResponse.ok) {
        const knowledgeRows = await knowledgeResponse.json();
        const normalize = (value) => String(value || '').toLowerCase()
          .normalize('NFKC')
          .replace(/[?؟!,.،؛:;'"“”()\\[\\]{}]/g, ' ')
          .replace(/\\s+/g, ' ').trim();
        const normalizedQuestion = normalize(latestMessage.message);
        const matchedKnowledge = (Array.isArray(knowledgeRows) ? knowledgeRows : []).find((row) =>
          Array.isArray(row.question_patterns) && row.question_patterns.some((pattern) => {
            const normalizedPattern = normalize(pattern);
            return normalizedPattern && (normalizedQuestion === normalizedPattern || normalizedQuestion.includes(normalizedPattern));
          })
        );
        if (matchedKnowledge && Array.isArray(matchedKnowledge.replies) && matchedKnowledge.replies.length) {
          const savedReplies = matchedKnowledge.replies
            .filter((part) => typeof part === 'string' && part.trim())
            .slice(0, 3)
            .map((part) => part.trim().slice(0, 600));
          if (savedReplies.length) {
            console.info('Approved AI knowledge matched', { category: matchedKnowledge.category });
            return res.status(200).json({
              reply: savedReplies.join(' '), replies: savedReplies,
              orderReady: false, productName: null, quantity: null, unitPrice: null, handoff: false,
            });
          }
        }
      } else {
        console.warn('Approved AI knowledge lookup unavailable', { status: knowledgeResponse.status });
      }
    } catch (knowledgeError) {
      console.warn('Approved AI knowledge lookup failed; continuing with live Gemini flow', {
        message: String(knowledgeError && knowledgeError.message || knowledgeError).slice(0, 160),
      });
    }

    const systemPrompt = [
      'তুমি Homemade Beauty Care-এর লাইভ-চ্যাট কাস্টমার কেয়ার ও সেলস সহকারী। বাংলা, বাংলিশ, ইংরেজি এবং বানান ভুল বুঝবে। স্বাভাবিক, সংক্ষিপ্ত, ভদ্র বাংলায় উত্তর দেবে; প্রতিটি customer প্রশ্নের উত্তর সাধারণত ২-৩টি আলাদা ছোট chat message-এ দেবে—একটি বড় paragraph লিখবে না। প্রতিটি message-এ মাত্র ১টি ছোট বাক্য (সাধারণত ৮-১৮টি বাংলা শব্দ) থাকবে; প্রতিটি message আলাদা replies array item হবে, যাতে আলাদা chat bubble হিসেবে পাঠানো যায়। প্রথম message-এ সরাসরি প্রশ্নের উত্তর, পরেরটিতে দরকারি তথ্য, আর শেষটিতে প্রাসঙ্গিক হলে নরম next step দেবে। প্রশ্নের জন্য সত্যিই একটিমাত্র ছোট উত্তর যথেষ্ট হলে জোর করে বাড়াবে না, তবে সাধারণ customer প্রশ্নে ২-৩টি ছোট message ব্যবহার করবে। একই কথা ভাগ করে পুনরাবৃত্তি করবে না। একই প্রশ্ন বারবার করবে না এবং প্রতিবার customer-এর নাম ধরে ডাকবে না।',
      'সবচেয়ে গুরুত্বপূর্ণ নিয়ম: সর্বশেষ CUSTOMER MESSAGE-টির সরাসরি উত্তর দেবে। আগের chat শুধু context; আগের প্রশ্নের উত্তর আবার দেবে না, প্রসঙ্গ হারাবে না, এবং customer যা জিজ্ঞেস করেছে তার সঙ্গে উত্তর মিলিয়ে নেবে। প্রশ্ন বুঝতে না পারলে একটি ছোট clarification প্রশ্ন করবে।\nডাটাবেসের LIVE PRODUCT DATA ও LIVE BUSINESS SETTINGS-ই পণ্য, দাম, স্টক, সাইজ, উপাদান, উপকারিতা, ব্যবহারবিধি, ডেলিভারি চার্জ, ফ্রি ডেলিভারি, পেমেন্ট, যোগাযোগ, ঠিকানা ও অফারের একমাত্র নির্ভরযোগ্য উৎস। কোনো তথ্য বানাবে না বা পুরোনো/অনুমান করা তথ্য বলবে না। ডাটাবেসে কোনো তথ্য null/ফাঁকা/অনুপস্থিত হলে নিশ্চিত তথ্য নেই বলবে এবং অ্যাডমিনের সাহায্য অফার করবে। ডাটাবেসে থাকা বর্তমান তথ্য থেকেই উত্তর দেবে।',
      'ডেলিভারি প্রশ্নে ঢাকার ভিতর ও ঢাকার বাইরে আলাদা চার্জ SETTINGS থেকে জানাবে। free_delivery_enabled true না হলে ফ্রি ডেলিভারি আছে বলবে না, threshold/minimum দিয়ে নিজে থেকে ছাড় তৈরি করবে না। cash_on_delivery_enabled true হলে ক্যাশ অন ডেলিভারি আছে বলতে পারবে; online_payment_enabled false হলে অনলাইন পেমেন্ট চালু আছে বলবে না। ডেলিভারি সময় বা নির্দিষ্ট কুরিয়ার সেটিংসে নেই, তাই সময়/কুরিয়ার বানাবে না; জেলা/এলাকা অনুযায়ী নিশ্চিত না হলে অ্যাডমিনের সাহায্য দেবে।',
      'সেলস ও অর্ডার কনভার্সন (গুরুত্বপূর্ণ): তুমি শুধু তথ্য দেওয়ার bot নও—ভদ্র, সহায়ক ও ফলপ্রসূ sales assistant। customer-এর প্রয়োজন/চুল বা ত্বকের concern বুঝে catalog-এ থাকা সবচেয়ে উপযুক্ত পণ্যটি প্রস্তাব করো; database-এ থাকা বাস্তব উপকারিতা, উপাদান, ব্যবহারবিধি, দাম ও প্রাসঙ্গিক delivery/COD তথ্য দিয়ে কেন এটি তার জন্য মানানসই হতে পারে বোঝাও। customer-এর প্রশ্নের উত্তর দেওয়ার পর কথোপকথন স্বাভাবিকভাবে অর্ডারের দিকে এগিয়ে নাও: যেমন “আপনি চাইলে এই পণ্যটি অর্ডার করে দিতে পারি—কয়টি নিতে চান?” অথবা পণ্যের পরিমাণ জানা থাকলে “আপনার জন্য অর্ডার ফর্মটি খুলে দিই?” Customer ইতিবাচক আগ্রহ দেখালে অপ্রয়োজনীয় বিক্রির কথা না বলে product ও quantity নিশ্চিত করে orderReady=true দিয়ে অর্ডার ফর্ম দেখাও। customer দাম/ডেলিভারি/ব্যবহার নিয়ে দ্বিধায় থাকলে সেই আপত্তির সরাসরি উত্তর দাও, তারপর নরমভাবে অর্ডারের প্রস্তাব দাও। প্রতিটি প্রাসঙ্গিক উত্তরে একটি ছোট, সহজ next step রাখবে; তবে customer শুধু তথ্য চাইলে, অভিযোগ করলে বা অর্ডার না করতে চাইলে জোর করবে না। একসঙ্গে অনেক প্রশ্ন করবে না। কখনো মিথ্যা scarcity, discount, guarantee, review, medical claim, নিশ্চিত ফলাফল বা ভয় দেখিয়ে বিক্রি করবে না; database-এর বাইরে কোনো দাবি করবে না.',
      'Combo offer শুধু combo_offer_enabled true হলে উল্লেখ করবে; title/price/description ডাটাবেস থেকে হুবহু তথ্য অনুযায়ী বলবে। Offer button link থাকলে সেটি ব্যবহার করতে পারো। কোনো product/offer stock বা price সম্পর্কে অনিশ্চিত হলে বানিয়ে বলবে না।',
      'অর্ডার নিয়ম: “order nin”, “অর্ডার নেন”, “order korbo” মানে নতুন অর্ডার করতে চাওয়া; tracking নয়। কথোপকথনে পণ্য ও অর্ডার করার ইচ্ছা আগেই বলা থাকলে সেটা মনে রাখবে। পণ্য জানা কিন্তু quantity না জানা থাকলে শুধু পরিমাণ জিজ্ঞেস করবে। quantity জানা থাকলে আবার জিজ্ঞেস করবে না।',
      'orderReady=true কেবল তখনই হবে যখন customer-এর অর্ডার করার ইচ্ছা আছে এবং নির্দিষ্ট পণ্য ও পরিমাণ কথোপকথন থেকে নিশ্চিত। তখন reply-তে বলবে নাম, মোবাইল ও ঠিকানা দেওয়ার form দেখানো হচ্ছে। productName হবে catalog-এর সঠিক বাংলা/ইংরেজি নাম; quantity পূর্ণ ধনাত্মক integer; unitPrice catalog-এর বর্তমান price। পণ্য/পরিমাণ নিশ্চিত না হলে orderReady=false।',
      'অর্ডারের ফর্ম পাঠানো মানে অর্ডার নিশ্চিত নয়; অ্যাডমিন স্টক, দাম ও ডেলিভারি যাচাই করবেন। কখনো অর্ডার কনফার্ম হয়েছে বলবে না। অভিযোগ, refund/dispute, অর্ডার tracking, বা ডাটাবেসে অনুপস্থিত/অনিশ্চিত তথ্যের প্রশ্নে সংক্ষিপ্তভাবে অ্যাডমিনের সাহায্য দেওয়ার কথা বলবে। ডাটাবেসে থাকা নয় এমন পুরোনো অর্ডারের তথ্য কখনো অনুমান করবে না।',
      'product question হলে সম্ভব হলে সঠিক product link এবং image URL reply-তে দেবে। সবসময় শুধু JSON object ফেরত দেবে, এই schema মেনে: {"reply":"...","replies":["ছোট উত্তর ১","ছোট উত্তর ২"],"orderReady":false,"productName":null,"quantity":null,"unitPrice":null,"handoff":false}.',
      'LIVE PRODUCT DATA (question-relevant products prioritized): ' + JSON.stringify(modelProductContext).slice(0, 14000),
      'LIVE BUSINESS SETTINGS: ' + JSON.stringify(publicBusinessContext).slice(0, 5000),
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
      messages.slice(-6).map((m) => (m.role === 'assistant' ? 'Assistant: ' : 'Customer: ') + m.content.slice(0, 1000)).join('\n'),
      'LATEST CUSTOMER MESSAGE — ANSWER THIS MESSAGE, NOT AN OLDER ONE: ' + String(latestMessage.message || '').slice(0, 1800),
      'Return only the JSON object required by the schema.',
    ].join('\n\n');

    // Gemini-only resilience: try the newest stable Flash first, with one bounded retry per model.
    // Keep total attempts bounded so Vercel can return a response before its function deadline.
    const geminiModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
    if (geminiApiKey) {
      for (const model of geminiModels) {
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          stage = 'Gemini API (' + model + ', attempt ' + attempt + ')';
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
                  maxOutputTokens: 350,
                  ...(model === 'gemini-3.8-flash' ? { thinkingConfig: { thinkingLevel: 'LOW' } } : { temperature: 0.2 }),
                },
              }),
            }, AI_TIMEOUT_MS);
            const payload = await response.json().catch(() => ({}));
            const parts = payload && payload.candidates && payload.candidates[0] && payload.candidates[0].content && payload.candidates[0].content.parts;
            const candidateText = Array.isArray(parts) ? parts.filter((part) => part && typeof part.text === 'string').map((part) => part.text).join('') : '';
            if (response.ok && candidateText.trim()) {
              raw = candidateText;
              console.info('Gemini model replied', { model, attempt });
              break;
            }
            const providerStatus = response.status;
            const modelFailure = model + ' attempt ' + attempt + ' HTTP ' + providerStatus + (payload?.error?.message ? ': ' + String(payload.error.message).slice(0, 180) : '');
            geminiFailure = geminiFailure ? geminiFailure + ' | ' + modelFailure : modelFailure;
            console.warn('Gemini model attempt failed', { model, attempt, status: providerStatus, providerMessage: String(payload?.error?.message || '').slice(0, 220), hasText: Boolean(candidateText.trim()) });
            // Retry transient provider failures once; move to the next model for permanent errors.
            if (attempt >= 2 || ![408, 429, 500, 502, 503, 504].includes(providerStatus)) break;
          } catch (error) {
            const modelFailure = model + ' attempt ' + attempt + ': ' + String(error && error.message || error).slice(0, 180);
            geminiFailure = geminiFailure ? geminiFailure + ' | ' + modelFailure : modelFailure;
            console.warn('Gemini model attempt timed out/failed', { model, attempt, name: error && error.name, message: String(error && error.message || error).slice(0, 180) });
            if (attempt >= 2) break;
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        if (raw.trim()) break;
      }
    }
    if (!raw.trim()) {
      console.error('All Gemini models failed; using catalog-grounded fallback', { geminiFailure });
      const fallback = buildFallbackResponse(latestMessage.message, productContext, publicBusinessContext);
      return res.status(200).json(fallback);
    }

    if (typeof raw !== 'string' || !raw.trim()) return jsonError(res, 502, 'AI-এর উত্তর সঠিকভাবে তৈরি হয়নি।');
    let result;
    try { result = parseJsonObject(raw); } catch { console.warn('Gemini response was not valid JSON; using catalog-grounded fallback', { responseLength: raw.length }); return res.status(200).json(buildFallbackResponse(latestMessage.message, productContext, publicBusinessContext)); }
    if (typeof result.reply !== 'string' || !result.reply.trim()) return res.status(200).json(buildFallbackResponse(latestMessage.message, productContext, publicBusinessContext));

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
