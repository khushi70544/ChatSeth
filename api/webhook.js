export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'chatseth_verify_123';
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (req.method === 'GET') {
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
      return res.status(200).send(req.query['hub.challenge']);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    try {
      const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (msg && msg.type === 'text') {
        const prompt = `You are Chat Seth AI for Sharma General Store. Catalogue: Basmati Rice 1kg ₹120, 5kg ₹560, Atta 10kg ₹430, Mustard Oil 1L ₹145. Reply politely under 40 words in customer's language (Hindi/Hinglish/English).\n\nCustomer: ${msg.text.body}`;
        const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const gData = await gRes.json();
        const reply = gData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Namaste! Welcome to Chat Seth.';

        await fetch(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: msg.from, type: 'text', text: { body: reply } })
        });
      }
      return res.status(200).send('OK');
    } catch (e) {
      return res.status(200).send('ERR');
    }
  }
  return res.status(405).send('Method Not Allowed');
}
