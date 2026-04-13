// api/espn.js — Proxy para ESPN API (evita CORS)
// Uso: /api/espn?path=/soccer/arg.1/scorers
//       /api/espn?path=/soccer/arg.1/standings
//       /api/espn?path=/soccer/eng.1/scorers
//       base: site.api.espn.com/apis/site/v2/sports

const SITE_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const V2_BASE   = 'https://site.api.espn.com/apis/v2/sports';

const memCache = {};
const TTL = 5 * 60 * 1000; // 5 minutos

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if(req.method === 'OPTIONS') return res.status(200).end();

  const { path, v2 } = req.query;
  if(!path) return res.status(400).json({ error: 'Falta path' });

  const base = v2 === '1' ? V2_BASE : SITE_BASE;
  const url  = base + path;
  const now  = Date.now();

  // Cache
  if(memCache[url] && now - memCache[url].ts < TTL){
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(memCache[url].data);
  }

  try{
    const r = await fetch(url, {
      headers:{
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    if(!r.ok) return res.status(r.status).json({ error: 'ESPN error ' + r.status });
    const data = await r.json();
    memCache[url] = { ts: now, data };
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  }catch(e){
    return res.status(500).json({ error: e.message });
  }
}
