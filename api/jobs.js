export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ltype = '1' } = req.query;
  const serpKey = process.env.SERP_API_KEY;
  const rapidKey = process.env.RAPIDAPI_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const withTimeout = (promise, ms) =>
    Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

  async function googleJobs(q) {
    try {
      const r = await withTimeout(fetch(`https://serpapi.com/search?engine=google_jobs&q=${encodeURIComponent(q)}&ltype=${ltype}&hl=en&api_key=${serpKey}`), 5000);
      const d = await r.json();
      return (d.jobs_results || []).map(j => ({
        titulo: j.title, empresa: j.company_name, local: j.location,
        regime: j.detected_extensions?.schedule_type || 'Full-time',
        salario: j.detected_extensions?.salary || null,
        publicado_em: j.detected_extensions?.posted_at || null,
        descricao: j.description?.slice(0, 600) || '',
        url: j.apply_options?.[0]?.link || j.share_link || '#',
        fonte: 'Google Jobs', extensions: j.detected_extensions || {}
      }));
    } catch(e) { console.error('Google error:', e.message); return []; }
  }

  async function jsearch(q) {
    try {
      const r = await withTimeout(fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q)}&num_pages=1&remote_jobs_only=true`, {
        headers: { 'X-RapidAPI-Key': rapidKey, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' }
      }), 5000);
      const text = await r.text();
      if (!text || text[0] !== '{') return [];
      const d = JSON.parse(text);
      if (d.message || !d.data) return [];
      return d.data.map(j => ({
        titulo: j.job_title, empresa: j.employer_name,
        local: j.job_city ? `${j.job_city}, ${j.job_country}` : 'Remote',
        regime: j.job_employment_type || 'Full-time',
        salario: j.job_min_salary ? `${j.job_min_salary}–${j.job_max_salary} ${j.job_salary_currency || 'USD'}/yr` : null,
        publicado_em: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc).toLocaleDateString('pt-BR') : null,
        descricao: j.job_description?.slice(0, 600) || '',
        url: j.job_apply_link || '#',
        fonte: j.job_publisher || 'LinkedIn', extensions: {}
      }));
    } catch(e) { console.error('JSearch error:', e.message); return []; }
  }

  try {
    const [g1, g2, j1, j2] = await Promise.all([
      googleJobs('product manager remote'),
      googleJobs('product owner remote'),
      jsearch('product manager remote'),
      jsearch('product owner remote')
    ]);

    let jobs = [...g1, ...g2, ...j1, ...j2];
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

    const jobsText = jobs.map((j, i) => `[${i}] ${j.titulo} @ ${j.empresa} | ${j.fonte}\n${j.descricao}`).join('\n---\n');

    const cr = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', max_tokens: 3000,
        messages: [{ role: 'user', content: `Analyze compatibility. Respond ONLY valid JSON array, no markdown.\nCANDIDATE: ${CV}\nJOBS:\n${jobsText}\nReturn: [{"score":85,"matches":["x"],"gaps":["y"],"recomendacao":"Vale candidatar","justificativa":"2 frases pt-BR","dica":"di
