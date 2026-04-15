// api/search.js - busca vagas via SerpAPI
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const serpKey = process.env.SERP_API_KEY;
  const { ltype = '1' } = req.query;

  const queries = [
    'product manager remote',
    'product owner remote'
  ];

  try {
    const results = await Promise.all(queries.map(q =>
      fetch(`https://serpapi.com/search?engine=google_jobs&q=${encodeURIComponent(q)}&ltype=${ltype}&hl=en&api_key=${serpKey}`)
        .then(r => r.json())
        .then(d => (d.jobs_results || []).map(j => ({
          titulo: j.title,
          empresa: j.company_name,
          local: j.location,
          regime: j.detected_extensions?.schedule_type || 'Full-time',
          salario: j.detected_extensions?.salary || null,
          publicado_em: j.detected_extensions?.posted_at || null,
          descricao: j.description?.slice(0, 600) || '',
          url: j.apply_options?.[0]?.link || j.share_link || '#',
          fonte: 'Google Jobs',
          extensions: j.detected_extensions || {}
        })))
        .catch(() => [])
    ));

    let jobs = results.flat();

    // Remove duplicatas
    const seen = new Set();
    jobs = jobs.filter(j => {
      const key = `${j.titulo?.toLowerCase()}|${j.empresa?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 20);

    return res.status(200).json({ jobs, total: jobs.length });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
