// api/jobs.js - Vercel Serverless Function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { chips = '', ltype = '1' } = req.query;
  const serpKey = process.env.SERP_API_KEY;
  const rapidKey = process.env.RAPIDAPI_KEY;

  async function searchGoogleJobs(q) {
    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.set('engine', 'google_jobs');
      url.searchParams.set('q', q);
      url.searchParams.set('ltype', ltype);
      url.searchParams.set('hl', 'en');
      if (chips) url.searchParams.set('chips', chips);
      url.searchParams.set('api_key', serpKey);
      const r = await fetch(url.toString());
      const d = JSON.parse(await r.text());
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
