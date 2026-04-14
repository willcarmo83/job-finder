export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { chips = '', ltype = '1' } = req.query;
  const serpKey = process.env.SERP_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    const [r1, r2] = await Promise.all([
      fetch(`https://serpapi.com/search?engine=google_jobs&q=product+manager+remote&ltype=${ltype}&hl=en&api_key=${serpKey}`),
      fetch(`https://serpapi.com/search?engine=google_jobs&q=product+owner+remote&ltype=${ltype}&hl=en&api_key=${serpKey}`)
    ]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);

    let jobs = [...(d1.jobs_results || []), ...(d2.jobs_results || [])].map(j => ({
      titulo: j.title, empresa: j.company_name, local: j.location,
      regime: j.detected_extensions?.schedule_type || 'Full-time',
      salario: j.detected_extensions?.salary || null,
      publicado_em: j.detected_extensions?.posted_at || null,
      descricao: j.description?.slice(0, 600) || '',
      url: j.apply_options?.[0]?.link || j.share_link || '#',
      fonte: 'Google Jobs', extensions: j.detected_extensions || {}
    }));

    const seen = new Set();
    jobs = jobs.filter(j => {
      const key = `${j.titulo?.toLowerCase()}|${j.empresa?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 15);

    if (jobs.length === 0) return res.status(200).json({ jobs: [], total: 0 });

    const CV = `William Silva do Carmo — Senior PM, 19+ years IT, 9+ years PM. Campinas, Brazil. 100% remote.
iFood (2022–now): iFood Benefit 500k users, 6B records 99.97% accuracy, SAP, R$5M/month savings.
Ericsson (2019–2022): PO + Scrum Master, global telecom.
Thomson Reuters (2006–2018): PO, foreign trade ERP, GM/Embraer/Dell.
Certs: PSM II, PSPO I&II, Kanban, Agile Coach. English+Spanish advanced.`;

    const jobsText = jobs.map((j, i) => `[${i}] ${j.titulo} @ ${j.empresa}\n${j.descricao}`).join('\n---\n');

    const cr = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 3000,
        messages: [{ role: 'user', content: `Analyze compatibility. Respond ONLY valid JSON array, no markdown.\nCANDIDATE: ${CV}\nJOBS:\n${jobsText}\nReturn: [{"score":85,"matches":["x"],"gaps":["y"],"recomendacao":"Vale candidatar","justificativa":"2 frases pt-BR","dica":"dica pt-BR"}]` }]
      })
    });

    const cd = await cr.json();
    const text = cd.content?.map(c => c.text || '').join('') || '[]';
    const analises = JSON.parse(text.replace(/```json|```/g, '').trim());
    jobs = jobs.map((j, i) => ({ ...j, analise: analises[i] || null }));
    jobs.sort((a, b) => (b.analise?.score || 0) - (a.analise?.score || 0));

    return res.status(200).json({ jobs, total: jobs.length });
  } catch(err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
