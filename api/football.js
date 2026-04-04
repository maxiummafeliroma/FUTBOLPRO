// api/football.js — Proxy server-side para api-sports
// Cachea respuestas para no quemar los 100 req/día

const API_KEY = '3ee7870931dc083abe0da60576870de5';
const BASE    = 'https://v3.football.api-sports.io';

// Cache en memoria (se resetea con cada deploy, pero aguanta mientras la función está caliente)
const memCache = {};
const TTL = {
  fixtures: 5  * 60 * 1000,   // 5 min
  standings: 6 * 60 * 60 * 1000, // 6 hs
  topscorers: 6 * 60 * 60 * 1000,
  default: 10 * 60 * 1000,
};

function getTTL(endpoint) {
  if(endpoint.includes('fixtures'))    return TTL.fixtures;
  if(endpoint.includes('standings'))   return TTL.standings;
  if(endpoint.includes('topscorers'))  return TTL.topscorers;
  return TTL.default;
}

export default async function handler(req, res) {
  // CORS — permite que tu frontend llame a esta función
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();

  const { endpoint } = req.query;
  if(!endpoint) return res.status(400).json({ error: 'Falta el parámetro endpoint' });

  // Revisar caché en memoria
  const cacheKey = endpoint;
  const ttl = getTTL(endpoint);
  const now = Date.now();

  if(memCache[cacheKey] && now - memCache[cacheKey].ts < ttl) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(memCache[cacheKey].data);
  }

  // Llamar a api-sports
  try {
    const url = BASE + endpoint;
    console.log('[api-sports proxy]', url);

    const response = await fetch(url, {
      headers: { 'x-apisports-key': API_KEY }
    });

    if(!response.ok) {
      return res.status(response.status).json({ error: `api-sports error: ${response.status}` });
    }

    const data = await response.json();

    // Guardar en caché
    memCache[cacheKey] = { ts: now, data };

    // Cache header para Vercel CDN (60 segundos en edge)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(data);

  } catch(e) {
    console.error('[api-sports proxy error]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
