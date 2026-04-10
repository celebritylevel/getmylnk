const FALLBACK_PASSWORD = 'changeme';
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

function auth(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const expected = env.ADMIN_PASSWORD || FALLBACK_PASSWORD;
  return token === expected;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!auth(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS });
  }

  const kv = env.ANALYTICS_KV;
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 503, headers: JSON_HEADERS });
  }

  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');

  try {
    if (handle) {
      // Per-creator analytics
      const [pvStats, countries, clicks, clickDays] = await Promise.all([
        kv.get(`pv:${handle}:stats`, 'json').then(v => v || { total: 0, days: {} }),
        kv.get(`pv:${handle}:countries`, 'json').then(v => v || {}),
        kv.get(`clicks:${handle}:stats`, 'json').then(v => v || {}),
        kv.get(`clicks:${handle}:days`, 'json').then(v => v || {}),
      ]);
      return new Response(JSON.stringify({ handle, pageviews: pvStats, countries, clicks, clickDays }), { headers: JSON_HEADERS });
    }

    // All-creators analytics: load index then aggregate
    const indexRaw = await kv.get('profiles:index');
    const handles = indexRaw ? JSON.parse(indexRaw) : [];

    if (handles.length === 0) {
      return new Response(JSON.stringify({
        handles: [],
        aggregate: { pageviews: { total: 0, days: {} }, countries: {}, clicks: {} },
        perCreator: {},
      }), { headers: JSON_HEADERS });
    }

    const perCreatorPromises = handles.map(async h => {
      const [pv, ctry, cl] = await Promise.all([
        kv.get(`pv:${h}:stats`, 'json').then(v => v || { total: 0, days: {} }),
        kv.get(`pv:${h}:countries`, 'json').then(v => v || {}),
        kv.get(`clicks:${h}:stats`, 'json').then(v => v || {}),
      ]);
      return { handle: h, pageviews: pv, countries: ctry, clicks: cl };
    });

    const results = await Promise.all(perCreatorPromises);

    // Build aggregate
    const aggregate = { pageviews: { total: 0, days: {} }, countries: {}, clicks: {} };
    const perCreator = {};
    for (const r of results) {
      perCreator[r.handle] = { pageviews: r.pageviews, countries: r.countries, clicks: r.clicks };
      aggregate.pageviews.total += (r.pageviews.total || 0);
      for (const [day, cnt] of Object.entries(r.pageviews.days || {})) {
        aggregate.pageviews.days[day] = (aggregate.pageviews.days[day] || 0) + cnt;
      }
      for (const [code, cnt] of Object.entries(r.countries || {})) {
        aggregate.countries[code] = (aggregate.countries[code] || 0) + cnt;
      }
      for (const [link, cnt] of Object.entries(r.clicks || {})) {
        aggregate.clicks[link] = (aggregate.clicks[link] || 0) + cnt;
      }
    }

    return new Response(JSON.stringify({ handles, aggregate, perCreator }), { headers: JSON_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), { status: 500, headers: JSON_HEADERS });
  }
}
