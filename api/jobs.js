export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const serpKey = process.env.SERP_API_KEY;
    const url = `https://serpapi.com/search?engine=google_jobs&q=product+manager+remote&ltype=1&hl=en&api_key=${serpKey}`;
    const r = await fetch(url);
    const d = await r.json();
    return res.status(200).json({ ok: true, total: d.jobs_results?.length || 0 });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
