// api/fd.js — Proxy para football-data.org
const FD_KEY = 'a59b0e873bd34dcfa1de9fafd856a2ba';
const BASE   = 'https://api.football-data.org/v4';

const memCache = {};
const TTL_SHORT = 5  * 60 * 1000;
const TTL_LONG  = 6  * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if(req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint } = req.query;
  if(!endpoint) return res.status(400).json({ error: 'Falta endpoint' });

  const now = Date.now();
  const ttl = endpoint.includes('/matches') ? TTL_SHORT : TTL_LONG;

  if(memCache[endpoint] && now - memCache[endpoint].ts < ttl) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(memCache[endpoint].data);
  }

  try {
    const response = await fetch(BASE + endpoint, {
      headers: { 'X-Auth-Token': FD_KEY }
    });
    if(!response.ok) return res.status(response.status).json({ error: 'FD error ' + response.status });
    const data = await response.json();
    memCache[endpoint] = { ts: now, data };
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
