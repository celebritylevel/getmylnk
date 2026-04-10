const RESERVED = new Set(['admin', 'api', 'privacy', 'terms', 'contact', 'favicon.ico', 'robots.txt', 'sitemap.xml']);

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Track GET requests to creator profile pages only
  if (request.method === 'GET') {
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length === 1 && !RESERVED.has(segments[0].toLowerCase())) {
      const handle = segments[0].toLowerCase();
      const kv = env.ANALYTICS_KV;
      if (kv) {
        const today = new Date().toISOString().split('T')[0];
        const country = (request.cf && request.cf.country) ? request.cf.country : 'XX';
        context.waitUntil(trackPageView(kv, handle, country, today));
      }
    }
  }

  return next();
}

async function trackPageView(kv, handle, country, today) {
  try {
    const prefix = `pv:${handle}:`;
    const [pvRaw, countriesRaw] = await Promise.all([
      kv.get(prefix + 'stats'),
      kv.get(prefix + 'countries'),
    ]);

    const pvStats = pvRaw ? JSON.parse(pvRaw) : { total: 0, days: {} };
    pvStats.total = (pvStats.total || 0) + 1;
    if (!pvStats.days) pvStats.days = {};
    pvStats.days[today] = (pvStats.days[today] || 0) + 1;

    const sortedDays = Object.keys(pvStats.days).sort();
    while (sortedDays.length > 30) {
      delete pvStats.days[sortedDays.shift()];
    }

    const countries = countriesRaw ? JSON.parse(countriesRaw) : {};
    countries[country] = (countries[country] || 0) + 1;

    await Promise.all([
      kv.put(prefix + 'stats', JSON.stringify(pvStats)),
      kv.put(prefix + 'countries', JSON.stringify(countries)),
    ]);
  } catch (_) {}
}
