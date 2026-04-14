// api/jobs.js - Vercel Serverless Function
// Busca vagas em múltiplas fontes via SerpAPI + analisa com Claude

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query = 'product manager', chips = '', ltype = '1' } = req.query;
  const serpKey = process.env.SERP_API_KEY;

  async function searchGoogleJobs(q) {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_jobs');
    url.searchParams.set('q', q + ' remote');
    url.searchParams.set('ltype', ltype);
    url.searchParams.set('hl', 'en');
    if (chips) url.searchParams.set('chips', chips);
    url.searchParams.set('api_key', serpKey);
    const r = await fetch(url.toString());
    const d = await r.json();
    return (d.jobs_results || []).map(j => ({
      titulo: j.title,
      empresa: j.company_name,
      local: j.location,
      regime: j.detected_extensions?.schedule_type || 'Full-time',
      salario: j.detected_extensions?.salary || null,
      publicado_em: j.detected_extensions?.posted_at || null,
      descricao: j.description?.slice(0, 800) || '',
      url: j.apply_options?.[0]?.link || j.share_link || '#',
      fonte: 'Google Jobs',
      extensions: j.detected_extensions || {}
    }));
  }

  async function searchLinkedIn(q) {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'linkedin_jobs');
    url.searchParams.set('keywords', q);
    url.searchParams.set('location', 'Worldwide');
    url.searchParams.set('f_WT', '2');
    url.searchParams.set('api_key', serpKey);
    const r = await fetch(url.toString());
    const d = await r.json();
    return (d.jobs || []).map(j => ({
      titulo: j.title,
      empresa: j.company,
      local: j.location || 'Remote',
      regime: 'Full-time',
      salario: null,
      publicado_em: j.ago || null,
      descricao: j.description?.slice(0, 800) || '',
      url: j.link || '#',
      fonte: 'LinkedIn',
      extensions: {}
    }));
  }

  try {
    const [googlePM, googlePO, linkedinPM, linkedinPO] = await Promise.allSettled([
      searchGoogleJobs('product manager'),
      searchGoogleJobs('product owner remote'),
      searchLinkedIn('product manager remote'),
      searchLinkedIn('product owner remote')
    ]);

    let allJobs = [
      ...(googlePM.status === 'fulfilled' ? googlePM.value : []),
      ...(googlePO.status === 'fulfilled' ? googlePO.value : []),
      ...(linkedinPM.status === 'fulfilled' ? linkedinPM.value : []),
      ...(linkedinPO.status === 'fulfilled' ? linkedinPO.value : []),
    ];

    const seen = new Set();
    allJobs = allJobs.filter(j => {
      const key = `${j.titulo?.toLowerCase()}|${j.empresa?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    allJobs = allJobs.slice(0, 20);

    if (allJobs.length === 0) {
      return res.status(200).json({ jobs: [], total: 0 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const CV = `William Silva do Carmo — Senior Product Manager, 19+ years in IT, 9+ years in product management. Based in Campinas, São Paulo, Brazil. Open to 100% remote global positions.
EXPERIENCE:
- iFood (2022–present): PM — launched iFood Benefit (500k users in 6 months, 4.8 App Store), managed financial data flow of 6 billion records at 99.97% accuracy, SAP integration, R$5M/month savings from tax reform, built modular accounting platform.
- Ericsson (2019–2022): Product Owner + Scrum Master — global telecom clients, backlog, sprints.
- Thomson Reuters/Softway (2006–2018): Senior Analyst, PO — foreign trade ERP, clients: GM, Embraer, Caterpillar, Dell.
CERTIFICATIONS: PSM II, PSPO I & II, Kanban, Agile Coach, Management 3.0.
LANGUAGES: Advanced English, Advanced Spanish.
SKILLS: discovery, roadmap, A/B testing, KPIs/OKRs, financial data, APIs, ERP/SAP, team leadership, fintech.`;

    const jobsText = allJobs.map((j, i) =>
      `[${i}] ${j.titulo} @ ${j.empresa} | ${j.local} | fonte: ${j.fonte}\n${j.descricao}`
    ).join('\n\n---\n\n');

    const prompt = `Analyze these job listings for compatibility with this candidate. Respond ONLY with valid JSON array, no markdown.

CANDIDATE:
${CV}

JOBS:
${jobsText}

Return JSON array with one object per job (same order):
[{"score": 85, "matches": ["skill1","skill2"], "gaps": ["gap1"], "recomendacao": "Vale candidatar", "justificativa": "2 sentences in Portuguese", "dica": "specific tip in Portuguese"}]`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const claudeData = await claudeRes.json();
    const text = claudeData.content?.map(c => c.text || '').join('') || '[]';
    const analises = JSON.parse(text.replace(/```json|```/g, '').trim());

    const resultado = allJobs.map((j, i) => ({ ...j, analise: analises[i] || null }));
    resultado.sort((a, b) => (b.analise?.score || 0) - (a.analise?.score || 0));

    return res.status(200).json({
      jobs: resultado,
      total: resultado.length,
      fontes: [...new Set(resultado.map(j => j.fonte))]
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
