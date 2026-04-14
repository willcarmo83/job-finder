export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ltype = '1' } = req.query;
  const serpKey = process.env.SERP_API_KEY;
  const apifyToken = process.env.APIFY_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  async function googleJobs(q) {
    try {
      const r = await fetch(`https://serpapi.com/search?engine=google_jobs&q=${encodeURIComponent(q)}&ltype=${ltype}&hl=en&api_key=${serpKey}`);
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
    } catch(e) {
