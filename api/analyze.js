// api/analyze.js - analisa vagas com Claude
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jobs } = req.body;
  if (!jobs || !jobs.length) return res.status(400).json({ error: 'No jobs provided' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const CV = `William Silva do Carmo — Senior PM, 19+ years IT, 9+ years PM. Campinas, Brazil. 100% remote.
iFood (2022–now): iFood Benefit 500k users, 6B records 99.97% accuracy, SAP, R$5M/month savings.
Ericsson (2019–2022): PO + Scrum Master, global telecom clients.
Thomson Reuters (2006–2018): PO, foreign trade ERP, clients: GM, Embraer, Caterpillar, Dell.
Certifications: PSM II, PSPO I & II, Kanban, Agile Coach, Management 3.0.
Languages: Advanced English, Advanced Spanish.
Skills: discovery, roadmap, A/B testing, KPIs/OKRs, financial data, APIs, ERP/SAP, team leadership, fintech.`;

  const jobsText = jobs.map((j, i) =>
    `[${i}] ${j.titulo} @ ${j.empresa} | ${j.local}\n${j.descricao}`
  ).join('\n---\n');

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
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `Analyze these job listings for compatibility with this candidate. Respond ONLY with valid JSON array, no markdown.

CANDIDATE:
${CV}

JOBS:
${jobsText}

Return JSON array with one object per job (same order):
[{"score":85,"matches":["skill1"],"gaps":["gap1"],"recomendacao":"Vale candidatar","justificativa":"2 frases em português","dica":"dica específica em português"}]`
        }]
      })
    });

    const cd = await cr.json();
    const text = cd.content?.map(c => c.text || '').join('') || '[]';
    const analises = JSON.parse(text.replace(/```json|```/g, '').trim());

    return res.status(200).json({ analises });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
