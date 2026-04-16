// api/search.js - busca vagas via SerpAPI com paginação
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const serpKey = process.env.SERP_API_KEY;
  const { start = '0', type = 'internacional' } = req.query;

  // Google Jobs usa "start" para paginação (0, 10, 20...)
  const queries = type === 'brasil'
    ? [`https://serpapi.com/search?engine=google_jobs&q=product+manager+remoto&hl=pt-br&gl=br&start=${start}&api_key=${serpKey}`]
    : [`https://serpapi.com/search?engine=google_jobs&q=product+manager+remote&ltype=1&hl=en&start=${start}&api_key=${serpKey}`];

  try {
    const results = await Promise.all(queries.map(url =>
      fetch(url).then(r => r.json()).then(d => (d.jobs_results || []).map(j => ({
        titulo: j.title,
        empresa: j.company_name,
        local: j.location,
        regime: j.detected_extensions?.schedule_type || 'Full-time',
        salario: j.detected_extensions?.salary || null,
        publicado_em: j.detected_extensions?.posted_at || null,
        descricao: j.description?.slice(0, 800) || '',
        url: j.apply_options?.[0]?.link || j.share_link || '#',
        fonte: 'Google Jobs',
        tipo: type,
        extensions: j.detected_extensions || {}
      }))).catch(() => [])
    ));

    const jobs = results.flat();
    return res.status(200).json({ jobs, total: jobs.length, nextStart: parseInt(start) + 10 });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
