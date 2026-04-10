export async function onRequestGet(context) {
  const { params, env } = context;

  const handle = (params.handle || '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 32);
  const linkId = (params.linkId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);

  if (!handle || !linkId) {
    return new Response(null, { status: 400 });
  }

  const kv = env.ANALYTICS_KV;
  if (!kv) return new Response(null, { status: 503 });

  const raw = await kv.get(`profile:${handle}`);
  if (!raw) return new Response(null, { status: 404 });

  let profile;
  try { profile = JSON.parse(raw); } catch (_) { return new Response(null, { status: 500 }); }

  const link = (profile.links || []).find(l => l.id === linkId);
  if (!link || !link.url) return new Response(null, { status: 404 });

  // Deduplicate: one click per user per link per 24 hours via cookie
  const cookieName = `c_${handle}_${linkId}`;
  const cookies = parseCookies(context.request.headers.get('Cookie') || '');
  const alreadyCounted = cookies[cookieName] === '1';

  if (!alreadyCounted) {
    const today = new Date().toISOString().split('T')[0];
    context.waitUntil(recordClick(kv, handle, linkId, today));
  }

  // Redirect to destination; set dedup cookie (24h)
  return new Response(null, {
    status: 302,
    headers: {
      Location: link.url,
      'Set-Cookie': `${cookieName}=1; Max-Age=86400; Path=/go/${handle}/${linkId}; SameSite=Lax`,
    },
  });
}

function parseCookies(header) {
  const out = {};
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k.trim()] = v.join('=').trim();
  }
  return out;
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
    while (days.length > 30) delete clickDays[link][days.shift()];

    await Promise.all([
      kv.put(prefix + 'stats', JSON.stringify(clicks)),
      kv.put(prefix + 'days', JSON.stringify(clickDays)),
    ]);
  } catch (_) {}
}
