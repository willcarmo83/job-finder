export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const serpKey = process.env.SERP_API_KEY;
  const { type = 'internacional', chips = '' } = req.query;

  try {
    let url;
    if (type === 'brasil') {
      // Brasil: busca em português, sem filtro ltype, sem chips de data que podem quebrar
      url = `https://serpapi.com/search?engine=google_jobs&q=product+manager+remoto&hl=pt-br&gl=br&api_key=${serpKey}`;
    } else {
      // Internacional: com filtro remote e chips
      const chipsParam = chips ? `&chips=${encodeURIComponent(chips)}` : '';
      url = `https://serpapi.com/search?engine=google_jobs&q=product+manager+remote&ltype=1&hl=en${chipsParam}&api_key=${serpKey}`;
    }

    const r = await fetch(url);
    const d = await r.json();

    const jobs = (d.jobs_results || []).map(j => ({
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
    }));

    return res.status(200).json({ jobs, total: jobs.length });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
