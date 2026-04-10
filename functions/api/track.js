const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { handle, link } = body;

    if (!handle || typeof handle !== 'string' || !link || typeof link !== 'string') {
      return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: JSON_HEADERS });
    }

    const safeHandle = handle.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 32);
    const safeLink = link.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 100);

    const kv = env.ANALYTICS_KV;
    if (kv) {
      const today = new Date().toISOString().split('T')[0];
      context.waitUntil(recordClick(kv, safeHandle, safeLink, today));
    }

    return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
  } catch (_) {
    return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
  }
}

async function recordClick(kv, handle, link, today) {
  try {
    const prefix = `clicks:${handle}:`;
    const [clicksRaw, daysRaw] = await Promise.all([
      kv.get(prefix + 'stats'),
      kv.get(prefix + 'days'),
    ]);

    const clicks = clicksRaw ? JSON.parse(clicksRaw) : {};
    const clickDays = daysRaw ? JSON.parse(daysRaw) : {};

    clicks[link] = (clicks[link] || 0) + 1;

    if (!clickDays[link]) clickDays[link] = {};
    clickDays[link][today] = (clickDays[link][today] || 0) + 1;

    const days = Object.keys(clickDays[link]).sort();
    while (days.length > 30) {
      delete clickDays[link][days.shift()];
    }

    await Promise.all([
      kv.put(prefix + 'stats', JSON.stringify(clicks)),
      kv.put(prefix + 'days', JSON.stringify(clickDays)),
    ]);
  } catch (_) {}
}
