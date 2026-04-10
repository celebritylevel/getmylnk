const FALLBACK_PASSWORD = 'changeme';
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const HANDLE_RE = /^[a-z0-9_-]{1,32}$/;
const RESERVED = new Set(['admin', 'api', 'privacy', 'terms', 'contact', 'favicon', 'robots', 'sitemap', 'www']);

function auth(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const expected = env.ADMIN_PASSWORD || FALLBACK_PASSWORD;
  return token === expected;
}

// GET /api/profiles — list all profiles (summary)
export async function onRequestGet(context) {
  const { request, env } = context;

  if (!auth(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS });
  }

  const kv = env.ANALYTICS_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 503, headers: JSON_HEADERS });

  try {
    const indexRaw = await kv.get('profiles:index');
    const handles = indexRaw ? JSON.parse(indexRaw) : [];

    const profiles = await Promise.all(
      handles.map(h => kv.get(`profile:${h}`, 'json').then(p => p || null))
    );

    return new Response(JSON.stringify({ profiles: profiles.filter(Boolean) }), { headers: JSON_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to list profiles' }), { status: 500, headers: JSON_HEADERS });
  }
}

// POST /api/profiles — create new profile
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!auth(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS });
  }

  const kv = env.ANALYTICS_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 503, headers: JSON_HEADERS });

  try {
    const body = await request.json();
    const handle = (body.handle || '').toLowerCase().trim();

    if (!HANDLE_RE.test(handle) || RESERVED.has(handle)) {
      return new Response(JSON.stringify({ error: 'Invalid or reserved handle' }), { status: 400, headers: JSON_HEADERS });
    }

    // Check handle not already taken
    const existing = await kv.get(`profile:${handle}`);
    if (existing) {
      return new Response(JSON.stringify({ error: 'Handle already exists' }), { status: 409, headers: JSON_HEADERS });
    }

    const profile = {
      handle,
      name: String(body.name || handle).slice(0, 80),
      bio: String(body.bio || '').slice(0, 200),
      avatarUrl: String(body.avatarUrl || '').slice(0, 500),
      accentColor: /^#[0-9a-fA-F]{6}$/.test(body.accentColor) ? body.accentColor : '#f4c2c2',
      bgColor: /^#[0-9a-fA-F]{6}$/.test(body.bgColor) ? body.bgColor : '#1a1a1a',
      links: sanitizeLinks(body.links || []),
      active: body.active !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update index
    const indexRaw = await kv.get('profiles:index');
    const handles = indexRaw ? JSON.parse(indexRaw) : [];
    if (!handles.includes(handle)) handles.push(handle);

    await Promise.all([
      kv.put(`profile:${handle}`, JSON.stringify(profile)),
      kv.put('profiles:index', JSON.stringify(handles)),
    ]);

    return new Response(JSON.stringify({ ok: true, profile }), { status: 201, headers: JSON_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to create profile' }), { status: 500, headers: JSON_HEADERS });
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
