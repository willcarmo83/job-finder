export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const serpKey = process.env.SERP_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // 1 busca apenas
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_jobs');
    url.searchParams.set('q', 'product manager OR product owner remote');
    url.searchParams.set('ltype', '1');
    url.searchParams.set('hl', 'en');
    url.searchParams.set('api_key', serpKey);
    const r = await fetch(url.toString());
    const d = JSON.parse(await r.text());
    const jobs = (d.jobs_results || []).slice(0, 10).map(j => ({
      titulo: j.title, empresa: j.company_name, local: j.location,
      regime: j.detected_extensions?.schedule_type || 'Full-time',
      salario: j.detected_extensions?.salary || null,
      publicado_em: j.detected_extensions?.posted_at || null,
      descricao: j.description?.slice(0, 600) || '',
      url: j.apply_options?.[0]?.link || j.share_link || '#',
      fonte: 'Google Jobs', extensions: j.detected_extensions || {}
    }));

    if (jobs.length === 0) return res.status(200).json({ jobs: [], total: 0 });

    const CV = `William Silva do Carmo — Senior PM, 19+ years IT, 9+ years PM. Campinas, Brazil. 100% remote.
iFood (2022–now): launched iFood Benefit 500k users, 6B records 99.97% accuracy, SAP, R$5M/month savings.
Ericsson (2019–2022): PO + Scrum Master, global telecom.
Thomson Reuters (2006–2018): PO, foreign trade ERP, GM/Embraer/Dell.
Certs: PSM II, PSPO I&II, Kanban, Agile Coach. English+Spanish advanced.`;

    const jobsText = j
