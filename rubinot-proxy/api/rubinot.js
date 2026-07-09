// api/rubinot.js
// Proxy serverless (Vercel) que busca a página de um personagem do RubinOT
// (protegida por Cloudflare) através de uma API de scraping que resolve o
// challenge JS, e devolve o LEVEL como JSON — com CORS liberado pro app estático.
//
// Configure UMA das env vars no Vercel (Project → Settings → Environment Variables):
//   SCRAPINGANT_KEY  — https://scrapingant.com  (free 10k créditos/mês)  [recomendado]
//   SCRAPEDO_TOKEN   — https://scrape.do         (free ~1k créditos/mês)
//
// Uso:
//   GET /api/rubinot?name=old%20toze          -> { ok, exists, name, level }
//   GET /api/rubinot?name=old%20toze&debug=1  -> devolve trecho do HTML (pra afinar o parser)

export const config = { maxDuration: 60 };

const RUBINOT_BASE = 'https://rubinot.com.br/characters?name=';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const name = (req.query.name || '').toString().trim();
  const debug = req.query.debug === '1';
  if (!name) return res.status(400).json({ ok: false, error: 'faltou ?name' });

  const target = RUBINOT_BASE + encodeURIComponent(name);

  let scrapeUrl, provider;
  if (process.env.SCRAPINGANT_KEY) {
    provider = 'scrapingant';
    scrapeUrl = 'https://api.scrapingant.com/v2/general'
      + '?url=' + encodeURIComponent(target)
      + '&x-api-key=' + process.env.SCRAPINGANT_KEY
      + '&browser=true&proxy_type=residential&proxy_country=BR';
  } else if (process.env.SCRAPEDO_TOKEN) {
    provider = 'scrapedo';
    scrapeUrl = 'https://api.scrape.do/?token=' + process.env.SCRAPEDO_TOKEN
      + '&url=' + encodeURIComponent(target)
      + '&render=true&super=true&geoCode=br';
  } else {
    return res.status(500).json({ ok: false, error: 'sem chave de scraper (defina SCRAPINGANT_KEY ou SCRAPEDO_TOKEN)' });
  }

  try {
    const r = await fetch(scrapeUrl, { headers: { accept: 'text/html' } });
    const html = await r.text();

    if (debug) {
      const idx = html.search(/n[íi]vel|level/i);
      return res.status(200).json({
        ok: true, provider, status: r.status, len: html.length,
        snippet: idx >= 0 ? html.slice(Math.max(0, idx - 140), idx + 180) : html.slice(0, 500),
      });
    }

    if (!r.ok) return res.status(502).json({ ok: false, error: 'erro no scraper', provider, status: r.status });

    // Ainda barrado pelo Cloudflare?
    if (/just a moment|cf-mitigated|challenge-platform/i.test(html) && !/n[íi]vel/i.test(html))
      return res.status(502).json({ ok: false, error: 'bloqueado pelo Cloudflare (scraper não resolveu o challenge)' });

    const notFound = /não\s+encontrad|not\s+found|does not exist|no character|nenhum personagem/i.test(html);
    const level = parseLevel(html);

    if (notFound || level == null)
      return res.status(200).json({ ok: true, exists: false, name });

    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');
    return res.status(200).json({ ok: true, exists: true, name, level, source: target });
  } catch (e) {
    return res.status(504).json({ ok: false, error: String((e && e.message) || e) });
  }
}

function parseLevel(html) {
  const patterns = [
    /N[íi]vel\s*:?\s*<\/[^>]*>\s*<[^>]*>\s*([0-9][0-9.,]*)/i,   // <td>Nível:</td><td>1120</td>
    /N[íi]vel[\s\S]{0,60}?([0-9][0-9.,]{0,8})/i,                // Nível ... 1120
    /Level\s*:?\s*<\/[^>]*>\s*<[^>]*>\s*([0-9][0-9.,]*)/i,
    /Level[\s\S]{0,60}?([0-9][0-9.,]{0,8})/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const n = parseInt(m[1].replace(/[.,\s]/g, ''), 10);
      if (Number.isFinite(n) && n > 0 && n < 100000) return n;
    }
  }
  return null;
}
