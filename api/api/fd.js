// api/fd.js — Proxy server-side para football-data.org
// Sin límite diario, pero cacheamos igual para ser eficientes

const FD_KEY = 'a59b0e873bd34dcfa1de9fafd856a2ba';
const BASE   = 'https://api.football-data.org/v4';

const memCache = {};
const TTL = {
  matches:   5  * 60 * 1000,      // partidos del día: 5 min
  standings: 6  * 60 * 60 * 1000, // tablas: 6 hs
  scorers:   6  * 60 * 60 * 1000, // goleadores: 6 hs
  default:   10 * 60 * 1000,
};

function getTTL(endpoint) {
  if(endpoint.includes('/matches'))   return TTL.matches;
  if(endpoint.includes('/standings')) return TTL.standings;
  if(endpoint.includes('/scorers'))   return TTL.scorers;
  return TTL.default;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint } = req.query;
  if(!endpoint) return res.status(400).json({ error: 'Falta el parámetro endpoint' });

  const cacheKey = endpoint;
  const ttl = getTTL(endpoint);
  const now = Date.now();

  if(memCache[cacheKey] && now - memCache[cacheKey].ts < ttl) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(memCache[cacheKey].data);
  }

  try {
    const url = BASE + endpoint;
    console.log('[fd proxy]', url);

    const response = await fetch(url, {
      headers: { 'X-Auth-Token': FD_KEY }
    });

    if(!response.ok) {
      return res.status(response.status).json({ error: `football-data error: ${response.status}` });
    }

    const data = await response.json();
    memCache[cacheKey] = { ts: now, data };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);

  } catch(e) {
    console.error('[fd proxy error]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
