// api/cv-analyze-cv.js - Analisa CV e sugere tipos de vaga
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cvText } = req.body;
  if (!cvText || cvText.trim().length < 50) {
    return res.status(400).json({ error: 'CV muito curto ou vazio.' });
  }

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Analyze this CV/resume and suggest 3 to 5 job search queries for Google Jobs. Respond ONLY with valid JSON, no markdown.

CV:
${cvText.slice(0, 3000)}

Return exactly this format:
{
  "nome": "candidate first name or 'Candidato' if not found",
  "resumo": "2 sentence summary of the candidate's profile in Portuguese",
  "sugestoes": [
    {
      "cargo": "Job title in English for searching",
      "query_internacional": "search query for international remote jobs in English (e.g. 'product manager remote')",
      "query_brasil": "search query for Brazil jobs in English (e.g. 'product manager brasil')",
      "motivo": "1 sentence in Portuguese explaining why this role fits the candidate"
    }
  ]
}`
        }]
      })
    });

    const cd = await cr.json();
    const text = cd.content?.map(c => c.text || '').join('') || '{}';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    return res.status(200).json(result);
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
