export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jobs } = req.body;
  if (!jobs || !jobs.length) return res.status(400).json({ error: 'No jobs provided' });

  // Limita a 10 vagas para caber no timeout
  const jobsToAnalyze = jobs.slice(0, 10);
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const CV = `William — Senior PM, 19+ years IT, 9+ years PM. Campinas, Brazil. 100% remote.
iFood: iFood Benefit 500k users, 6B records 99.97% accuracy, SAP, R$5M/month savings.
Ericsson: PO + Scrum Master, global telecom.
Thomson Reuters: PO, foreign trade ERP, GM/Embraer/Dell.
Certs: PSM II, PSPO I&II, Kanban, Agile Coach. English+Spanish (diferencial, não mandatório).`;

  const jobsText = jobsToAnalyze.map((j, i) =>
    `[${i}] ${j.titulo} @ ${j.empresa}\n${j.descricao?.slice(0, 300)}`
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
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Analyze compatibility. Respond ONLY valid JSON array, no markdown.
CANDIDATE: ${CV}
JOBS:
${jobsText}
Return: [{"score":85,"matches":["x"],"gaps":["y"],"recomendacao":"Vale candidatar","justificativa":"2 frases pt-BR","dica":"dica pt-BR"}]`
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
