export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const serpKey = process.env.SERP_API_KEY;
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_jobs');
    url.searchParams.set('q', 'product manager OR product owner remote');
    url.searchParams.set('ltype', '1');
    url.searchParams.set('hl', 'en');
    url.searchParams.set('api_key', serpKey);
    const r = await fetch(url.toString());
    const d = JSON.parse(await r.text());
    return res.status(200).json({ ok: true, total: d.jobs_results?.length || 0 });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
