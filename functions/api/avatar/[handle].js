const FALLBACK_PASSWORD = 'changeme';
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function auth(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return token === (env.ADMIN_PASSWORD || FALLBACK_PASSWORD);
}

// GET /api/avatar/:handle — serve stored avatar image
export async function onRequestGet(context) {
  const { params, env } = context;
  const handle = (params.handle || '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 32);
  if (!handle) return new Response(null, { status: 400 });

  const kv = env.ANALYTICS_KV;
  if (!kv) return new Response(null, { status: 503 });

  const raw = await kv.get(`avatar:${handle}`, 'json');
  if (!raw) return new Response(null, { status: 404 });

  const bytes = base64ToBytes(raw.data);
  return new Response(bytes, {
    headers: {
      'Content-Type': raw.type,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// POST /api/avatar/:handle — upload avatar (admin only)
export async function onRequestPost(context) {
  const { request, params, env } = context;

  if (!auth(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const handle = (params.handle || '').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 32);
  if (!handle) return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const kv = env.ANALYTICS_KV;
  if (!kv) return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } });

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Use JPEG, PNG, WebP or GIF.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large. Max 2MB.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const b64 = bytesToBase64(new Uint8Array(buffer));
    await kv.put(`avatar:${handle}`, JSON.stringify({ type: file.type, data: b64 }));

    // Also update the profile's avatarUrl to point to this endpoint
    const profileRaw = await kv.get(`profile:${handle}`, 'json');
    if (profileRaw) {
      profileRaw.avatarUrl = `/api/avatar/${handle}`;
      profileRaw.updatedAt = new Date().toISOString();
      await kv.put(`profile:${handle}`, JSON.stringify(profileRaw));
    }

    return new Response(JSON.stringify({ ok: true, url: `/api/avatar/${handle}` }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
