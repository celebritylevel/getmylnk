const FALLBACK_PASSWORD = 'changeme';
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

function auth(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const expected = env.ADMIN_PASSWORD || FALLBACK_PASSWORD;
  return token === expected;
}

// GET /api/profile/:handle — public profile data
export async function onRequestGet(context) {
  const { params, env } = context;
  const handle = (params.handle || '').toLowerCase().trim();

  const kv = env.ANALYTICS_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 503, headers: JSON_HEADERS });

  const raw = await kv.get(`profile:${handle}`);
  if (!raw) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: JSON_HEADERS });

  return new Response(raw, { headers: { ...JSON_HEADERS, 'Cache-Control': 'public, max-age=60' } });
}

// PUT /api/profile/:handle — update profile
export async function onRequestPut(context) {
  const { request, params, env } = context;

  if (!auth(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS });
  }

  const kv = env.ANALYTICS_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 503, headers: JSON_HEADERS });

  const handle = (params.handle || '').toLowerCase().trim();

  try {
    const existing = await kv.get(`profile:${handle}`, 'json');
    if (!existing) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: JSON_HEADERS });

    const body = await request.json();

    const updated = {
      ...existing,
      name: String(body.name || existing.name).slice(0, 80),
      bio: String(body.bio !== undefined ? body.bio : existing.bio).slice(0, 200),
      avatarUrl: String(body.avatarUrl !== undefined ? body.avatarUrl : existing.avatarUrl).slice(0, 500),
      accentColor: /^#[0-9a-fA-F]{6}$/.test(body.accentColor) ? body.accentColor : existing.accentColor,
      bgColor: /^#[0-9a-fA-F]{6}$/.test(body.bgColor) ? body.bgColor : existing.bgColor,
      links: body.links !== undefined ? sanitizeLinks(body.links) : existing.links,
      active: body.active !== undefined ? Boolean(body.active) : existing.active,
      directGate: body.directGate !== undefined ? Boolean(body.directGate) : (existing.directGate !== false),
      updatedAt: new Date().toISOString(),
    };

    await kv.put(`profile:${handle}`, JSON.stringify(updated));

    return new Response(JSON.stringify({ ok: true, profile: updated }), { headers: JSON_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to update profile' }), { status: 500, headers: JSON_HEADERS });
  }
}

// DELETE /api/profile/:handle — delete profile
export async function onRequestDelete(context) {
  const { request, params, env } = context;

  if (!auth(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS });
  }

  const kv = env.ANALYTICS_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 503, headers: JSON_HEADERS });

  const handle = (params.handle || '').toLowerCase().trim();

  try {
    const indexRaw = await kv.get('profiles:index');
    const handles = indexRaw ? JSON.parse(indexRaw) : [];
    const newHandles = handles.filter(h => h !== handle);

    await Promise.all([
      kv.delete(`profile:${handle}`),
      kv.put('profiles:index', JSON.stringify(newHandles)),
    ]);

    return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to delete profile' }), { status: 500, headers: JSON_HEADERS });
  }
}

function sanitizeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links.slice(0, 20).map((l, i) => ({
    id: String(l.id || `link_${i}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || `link_${i}`,
    label: String(l.label || '').slice(0, 80),
    url: String(l.url || '').slice(0, 500),
    icon: String(l.icon || 'link').slice(0, 30),
    primary: Boolean(l.primary),
    ageGate: Boolean(l.ageGate),
  }));
}
