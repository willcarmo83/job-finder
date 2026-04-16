// api/analyze.js - analisa UMA vaga com Claude
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { job } = req.body;
  if (!job) return res.status(400).json({ error: 'No job provided' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const CV = `William Silva do Carmo — Senior Product Manager
19+ years in IT, 9+ years in product management. Based in Campinas, São Paulo, Brazil. Open to 100% remote global positions.
- iFood (2022–present): PM — iFood Benefit (500k users in 6 months, 4.8 App Store), 6B records at 99.97% accuracy, SAP integration, R$5M/month savings, modular accounting platform.
- Ericsson (2019–2022): Product Owner + Scrum Master — global telecom clients.
- Thomson Reuters/Softway (2006–2018): Senior Analyst, PO — foreign trade ERP, clients: GM, Embraer, Caterpillar, Dell.
Certifications: PSM II, PSPO I & II, Kanban, Agile Coach, Management 3.0.
Languages: Advanced English and Spanish (differentials, not requirements).
Skills: discovery, roadmap, A/B testing, KPIs/OKRs, financial data, APIs, ERP/SAP, fintech, team leadership.`;

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
          content: `Analyze this job for compatibility with the candidate. Respond ONLY with a valid JSON object, no markdown.

CANDIDATE:
${CV}

JOB:
${job.titulo} @ ${job.empresa} | ${job.local}
${job.descricao}

Return exactly:
{"score":85,"matches":["skill1","skill2"],"gaps":["gap1"],"recomendacao":"Vale candidatar","justificativa":"2 frases em português explicando o fit","dica":"dica específica em português para se destacar nessa vaga"}`
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
