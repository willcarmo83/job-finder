// api/cv-analyze-job.js - Analisa compatibilidade de UMA vaga com o CV
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { job, cvText } = req.body;
  if (!job || !cvText) return res.status(400).json({ error: 'Job and CV required' });

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
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Analyze this job listing for compatibility with the candidate's CV. Respond ONLY with valid JSON, no markdown.

CV (summary):
${cvText.slice(0, 1500)}

JOB:
${job.titulo} @ ${job.empresa} | ${job.local}
${job.descricao}

Return exactly:
{"score":85,"matches":["skill1","skill2"],"gaps":["gap1"],"recomendacao":"Vale candidatar","justificativa":"2 sentences in Portuguese","dica":"specific tip in Portuguese"}`
        }]
      })
    });

    const cd = await cr.json();
    const text = cd.content?.map(c => c.text || '').join('') || '{}';
    const analise = JSON.parse(text.replace(/```json|```/g, '').trim());

    return res.status(200).json({ analise });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
