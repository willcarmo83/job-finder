// api/cv-read-pdf.js - Lê PDF via Claude no backend
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { base64, mediaType } = req.body;
  if (!base64) return res.status(400).json({ error: 'PDF data required' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    const cr = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType || 'application/pdf',
                data: base64
              }
            },
            {
              type: 'text',
              text: 'Extract and return the full text content of this CV/resume. Return only the text content, no commentary or formatting.'
            }
          ]
        }]
      })
    });

    const cd = await cr.json();
    const text = cd.content?.map(c => c.text || '').join('') || '';

    if (!text) return res.status(422).json({ error: 'Não foi possível extrair texto do PDF.' });

    return res.status(200).json({ text });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
