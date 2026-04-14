export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { chips = '', ltype = '1', analyze = '0' } = req.query;
  const serpKey = process.env.SERP_API_KEY;

  try {
    // PASSO 1: busca vagas
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

    // Remove duplicatas
    const seen = new Set();
    jobs = jobs.filter(j => {
      const key = `${j.titulo?.toLowerCase()}|${j.empresa?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 15);

    // PASSO 2: analisa com Claude (só se analyze=1)
    if (analyze === '1' && jobs.length > 0) {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      const CV = `William Silva do Carmo — Senior PM, 19+ years IT, 9+ years PM. Campinas, Brazil. 100% remote.
iFood (2022–now): iFood Benefit 500k users, 6B records 99.97% accuracy, SAP, R$5M/month savings.
Ericsson (2019–2022): PO + Scrum Master, global telecom.
Thomson Reuters (2006–2018): PO, foreign trade ERP, GM/Embraer/Dell.
Certs: PSM II, PSPO I&II, Kanban, Agile Coach. English+Spanish advanced.`;

      const jobsText = jobs.map((j, i) => `[${i}] ${j.titulo} @ ${j.empresa}\n${j.descri
