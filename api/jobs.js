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
        titulo: j.title, empresa: j.company_name, local: j.location,
        regime: j.detected_extensions?.schedule_type || 'Full-time',
        salario: j.detected_extensions?.salary || null,
        publicado_em: j.detected_extensions?.posted_at || null,
        descricao: j.description?.slice(0, 800) || '',
        url: j.apply_options?.[0]?.link || j.share_link || '#',
        fonte: 'Google Jobs', extensions: j.detected_extensions || {}
      }));
    } catch(e) { console.error('GoogleJobs error:', e.message); return []; }
  }

  async function searchJSearch(q) {
    try {
      const url = new URL('https://jsearch.p.rapidapi.com/search');
      url.searchParams.set('query', q);
      url.searchParams.set('num_pages', '1');
      url.searchParams.set('remote_jobs_only', 'true');
      const r = await fetch(url.toString(), {
        headers: {
          'X-RapidAPI-Key': rapidKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      });
      const d = JSON.parse(await r.text());
      return (d.data || []).map(j => ({
        titulo: j.job_title, empresa: j.employer_name,
        local: j.job_city ? `${j.job_city}, ${j.job_country}` : (j.job_country || 'Remote'),
        regime: j.job_employment_type || 'Full-time',
        salario: j.job_min_salary ? `${j.job_min_salary}–${j.job_max_salary} ${j.job_salary_currency || 'USD'}/yr` : null,
        publicado_em: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc).toLocaleDateString('pt-BR') : null,
        descricao: j.job_description?.slice(0, 800) || '',
        url: j.job_apply_link || '#',
        fonte: j.job_publisher || 'JSearch', extensions: {}
      }));
    } catch(e) { console.error('JSearch error:', e.message); return []; }
  }

  try {
    const [googlePM, googlePO, jsearchPM, jsearchPO] = await Promise.all([
      searchGoogleJobs('product manager remote'),
      searchGoogleJobs('product owner remote'),
      searchJSearch('product manager remote'),
      searchJSearch('product owner remote')
    ]);

    let allJobs = [...googlePM, ...googlePO, ...jsearchPM, ...jsearchPO];

    const seen = new Set();
    allJobs = allJobs.filter(j => {
      const key = `${j.titulo?.toLowerCase()}|${j.empresa?.toLowe
