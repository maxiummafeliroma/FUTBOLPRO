// api/football.js — Proxy para api-sports (Argentina)
const API_KEY = '3ee7870931dc083abe0da60576870de5';
const BASE    = 'https://v3.football.api-sports.io';

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
  const ttl = endpoint.includes('fixtures') ? TTL_SHORT : TTL_LONG;

  if(memCache[endpoint] && now - memCache[endpoint].ts < ttl) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(memCache[endpoint].data);
  }

  try {
    const response = await fetch(BASE + endpoint, {
      headers: { 'x-apisports-key': API_KEY }
    });
    if(!response.ok) return res.status(response.status).json({ error: 'api-sports error ' + response.status });
    const data = await response.json();
    memCache[endpoint] = { ts: now, data };
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
