import { generateText } from 'ai';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return json({ error: 'AI is not configured yet.' }, 503);

  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const customerName = typeof body?.customerName === 'string' ? body.customerName : 'Customer';

    const cleanMessages = messages
      .filter((item: any) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
      .slice(-12)
      .map((item: any) => ({ role: item.role, content: item.content.slice(0, 3000) }));

    if (!cleanMessages.length) return json({ error: 'No conversation message.' }, 400);

    const { text } = await generateText({
      model: 'openai/gpt-5.5',
      system: `You are the customer support assistant for Homemade Beauty Care, a Bangladeshi natural beauty-care e-commerce store.
Reply naturally in Bangla unless the customer uses English.
Keep replies concise, friendly and helpful.
Never invent product prices, stock, ingredients, delivery charges, policies, order status or medical claims.
If the required business information is not present in the conversation, say that you need to check the information and offer to connect the customer with an admin.
Do not claim to be human.
If the customer asks for a human/admin, clearly say that an admin will take over.
Customer name: ${customerName}`,
      messages: cleanMessages,
      temperature: 0.2,
    });

    return json({ text: text.trim() });
  } catch (error) {
    console.error('AI chat error', error);
    return json({ error: 'AI reply could not be generated.' }, 500);
  }
}
