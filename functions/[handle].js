const RESERVED = new Set(['admin', 'api', 'privacy', 'terms', 'contact', 'favicon', 'robots', 'sitemap']);

const ICONS = {
  link:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  heart:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  coffee:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  star:      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  camera:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  video:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  music:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  message:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  globe:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  shopping:  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
};

function getIcon(name) {
  return ICONS[name] || ICONS.link;
}

function renderProfilePage(profile) {
  const accent = profile.accentColor || '#f4c2c2';
  const bg = profile.bgColor || '#1a1a1a';
  const links = profile.links || [];

  const avatarHtml = profile.avatarUrl
    ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="${escapeHtml(profile.name)} profile photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="avatar-placeholder" style="display:none;">${silhouetteSvg(accent)}</div>`
    : `<div class="avatar-placeholder">${silhouetteSvg(accent)}</div>`;

  const buttonsHtml = links.map(link => {
    const icon = getIcon(link.icon || 'link');
    const isPrimary = link.primary ? ' btn-primary' : '';
    if (link.ageGate) {
      // Age-gated: trigger the modal on click
      return `<button class="btn${isPrimary}" onclick="openAgeGate('${escapeJs(link.url)}','${escapeJs(link.id)}')"><span class="btn-icon">${icon}</span>${escapeHtml(link.label)}</button>`;
    }
    return `<a class="btn${isPrimary}" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" onclick="trackClick('${escapeJs(link.id)}')" ><span class="btn-icon">${icon}</span>${escapeHtml(link.label)}</a>`;
  }).join('\n      ');

  const needsAgeGate = links.some(l => l.ageGate);
  const ageGateHtml = needsAgeGate ? `
  <div class="age-gate" id="ageGate" role="dialog" aria-modal="true" aria-labelledby="ageGateTitle">
    <div class="age-gate-card">
      <div class="age-badge">18+</div>
      <h2 class="age-gate-title" id="ageGateTitle">Adult content</h2>
      <p class="age-gate-text">This content is for adults 18 and over. Confirm your age to continue.</p>
      <div class="age-gate-actions">
        <!-- anchor tag so iOS long-press shows native "Open Link" context menu -->
        <a class="btn-confirm" id="confirmBtn" href="#" target="_blank" rel="noopener noreferrer">Yes, I'm 18+</a>
        <p class="hold-instruction" id="holdInstruction">
          <span class="hold-icon">👆</span> Hold down the button above for 3 seconds to open the link
        </p>
        <button class="btn-decline" onclick="closeAgeGate()">No, take me back</button>
      </div>
    </div>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(profile.name)}</title>
  <meta name="description" content="${escapeHtml(profile.bio || profile.name + ' — link in bio')}" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: ${bg};
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px 32px;
      gap: 20px;
    }
    .avatar-wrap {
      width: 110px; height: 110px; border-radius: 50%;
      background-color: ${accent}33;
      overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .avatar-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .avatar-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .creator-name { font-size: 1.6rem; font-weight: 700; letter-spacing: 0.02em; text-align: center; }
    .creator-bio { font-size: 0.92rem; color: rgba(255,255,255,0.55); text-align: center; max-width: 300px; line-height: 1.5; }
    .buttons { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 380px; }
    .btn {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 15px 24px; border-radius: 50px;
      border: 1.5px solid rgba(255,255,255,0.22);
      background: rgba(255,255,255,0.06);
      color: #ffffff; font-size: 1rem; font-weight: 600;
      text-decoration: none; letter-spacing: 0.02em;
      transition: background 0.2s, border-color 0.2s, transform 0.1s;
      cursor: pointer; font-family: inherit;
    }
    .btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.45); transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }
    .btn-primary { background: ${accent}; border-color: ${accent}; color: #1a1a1a; }
    .btn-primary:hover { filter: brightness(0.92); border-color: transparent; color: #1a1a1a; }
    .btn-icon { font-size: 1.1rem; flex-shrink: 0; display: flex; align-items: center; }
    footer { text-align: center; padding: 20px 16px; border-top: 1px solid rgba(255,255,255,0.07); }
    .footer-links { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px 4px; margin-bottom: 8px; }
    .footer-links a { color: rgba(255,255,255,0.35); font-size: 0.75rem; text-decoration: none; padding: 2px 6px; transition: color 0.2s; }
    .footer-links a:hover { color: rgba(255,255,255,0.7); }
    .footer-sep { color: rgba(255,255,255,0.15); font-size: 0.75rem; }
    .footer-copy { color: rgba(255,255,255,0.2); font-size: 0.7rem; }
    .powered { margin-top: 6px; }
    .powered a { color: ${accent}; opacity: 0.6; font-size: 0.7rem; text-decoration: none; }
    .powered a:hover { opacity: 1; }

    /* ── Age gate ── */
    .age-gate {
      display: none; position: fixed; inset: 0; z-index: 100;
      background: rgba(0,0,0,0.88); backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      align-items: center; justify-content: center; padding: 24px;
    }
    .age-gate.visible { display: flex; }
    .age-gate-card {
      background: #242424; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 22px; padding: 40px 28px; max-width: 360px; width: 100%;
      text-align: center; display: flex; flex-direction: column; align-items: center;
      gap: 14px; animation: fadeUp 0.25s ease;
    }
    @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    .age-badge {
      width: 60px; height: 60px; border-radius: 50%;
      background: ${accent}1f; border: 2px solid ${accent};
      display: flex; align-items: center; justify-content: center;
      font-size: 1.4rem; font-weight: 800; color: ${accent}; letter-spacing: -1px;
    }
    .age-gate-title { font-size: 1.2rem; font-weight: 700; }
    .age-gate-text { font-size: 0.86rem; color: rgba(255,255,255,0.5); line-height: 1.6; }
    .age-gate-actions { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-top: 4px; }

    /* Confirm button is an <a> tag — critical for iOS long-press "Open Link" */
    .btn-confirm {
      display: flex; align-items: center; justify-content: center;
      padding: 15px 24px; border-radius: 50px; border: none;
      background: ${accent}; color: #1a1a1a;
      font-size: 1rem; font-weight: 700; text-decoration: none;
      cursor: pointer; letter-spacing: 0.02em;
      transition: filter 0.15s, transform 0.1s;
      /* Allow iOS native long-press context menu */
      -webkit-touch-callout: default;
    }
    .btn-confirm:hover { filter: brightness(0.92); }
    .btn-confirm:active { transform: scale(0.97); }

    /* Hold instruction — shown only in Instagram/in-app browser via JS */
    .hold-instruction {
      font-size: 0.82rem;
      color: rgba(255,255,255,0.65);
      line-height: 1.55;
      display: none; /* JS shows this when in-app browser detected */
    }
    .hold-instruction .hold-icon { font-size: 1rem; }
    @keyframes holdPulse {
      0%   { transform: scale(1);    color: rgba(255,255,255,0.65); }
      40%  { transform: scale(1.04); color: ${accent}; }
      100% { transform: scale(1);    color: rgba(255,255,255,0.65); }
    }
    .hold-instruction.pulse { animation: holdPulse 0.55s ease; }

    .btn-decline {
      padding: 13px 24px; border-radius: 50px;
      border: 1.5px solid rgba(255,255,255,0.14);
      background: transparent; color: rgba(255,255,255,0.45);
      font-size: 0.9rem; font-weight: 500; cursor: pointer;
      transition: border-color 0.2s, color 0.2s; font-family: inherit;
    }
    .btn-decline:hover { border-color: rgba(255,255,255,0.35); color: rgba(255,255,255,0.8); }
  </style>
</head>
<body>
  <main>
    <div class="avatar-wrap">${avatarHtml}</div>
    <h1 class="creator-name">${escapeHtml(profile.name)}</h1>
    ${profile.bio ? `<p class="creator-bio">${escapeHtml(profile.bio)}</p>` : ''}
    <div class="buttons">
      ${buttonsHtml}
    </div>
  </main>
  ${ageGateHtml}
  <script>
    /* ── Track clicks ── */
    function trackClick(linkId) {
      try { navigator.sendBeacon('/api/track', JSON.stringify({ handle: '${escapeJs(profile.handle)}', link: linkId })); } catch(_) {}
    }

    /* ── In-app browser detection ── */
    function isInAppBrowser() {
      var ua = navigator.userAgent || '';
      return /Instagram|FBAN|FBAV|TikTok|musical_ly|Snapchat|Line\\/|MicroMessenger|Twitter/i.test(ua);
    }

    /* ── Age gate ── */
    var _pendingUrl = null;
    var _pendingId  = null;

    function openAgeGate(url, id) {
      _pendingUrl = url;
      _pendingId  = id;
      var btn = document.getElementById('confirmBtn');
      if (btn) btn.href = url;
      document.getElementById('ageGate').classList.add('visible');
      document.body.style.overflow = 'hidden';
    }

    function closeAgeGate() {
      document.getElementById('ageGate').classList.remove('visible');
      document.body.style.overflow = '';
      _pendingUrl = null;
      _pendingId  = null;
    }

    document.addEventListener('DOMContentLoaded', function() {
      var gate  = document.getElementById('ageGate');
      var btn   = document.getElementById('confirmBtn');
      var instr = document.getElementById('holdInstruction');
      var inApp = isInAppBrowser();

      /* Show hold instruction only inside Instagram / in-app browsers */
      if (instr) instr.style.display = inApp ? 'block' : 'none';

      if (btn) {
        btn.addEventListener('click', function(e) {
          if (inApp) {
            /* In Instagram's browser: block normal navigation.
               User must long-press → iOS shows "Open Link" → opens in Safari. */
            e.preventDefault();
            if (instr) {
              instr.classList.remove('pulse');
              void instr.offsetWidth; /* reflow to restart animation */
              instr.classList.add('pulse');
            }
          } else {
            /* Normal browser: handle it ourselves */
            e.preventDefault();
            var url = _pendingUrl;
            var id  = _pendingId;
            closeAgeGate();
            if (id)  trackClick(id);
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
          }
        });
      }

      /* Close on backdrop click */
      if (gate) {
        gate.addEventListener('click', function(e) { if (e.target === gate) closeAgeGate(); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeAgeGate(); });
      }
    });
  </script>
  <footer>
    <div class="footer-links">
      <a href="/privacy">Privacy Policy</a>
      <span class="footer-sep">·</span>
      <a href="/terms">Terms of Service</a>
      <span class="footer-sep">·</span>
      <a href="/contact">Contact</a>
    </div>
    <p class="footer-copy">&copy; ${new Date().getFullYear()} ${escapeHtml(profile.name)}. All rights reserved.</p>
    <p class="powered"><a href="/">Powered by GetMyLnk</a></p>
  </footer>
</body>
</html>`;
}

function silhouetteSvg(accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="68" height="68" fill="none">
    <circle cx="40" cy="28" r="16" fill="${accent}88"/>
    <path d="M10 72c0-16.569 13.431-30 30-30s30 13.431 30 30" fill="${accent}88"/>
  </svg>`;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function escapeJs(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'\\r');
}

export async function onRequestGet(context) {
  const { params, env, next } = context;
  const handle = (params.handle || '').toLowerCase().trim();

  /* Reserved paths — pass through to static asset server (admin, privacy, etc.) */
  if (!handle || RESERVED.has(handle) || !/^[a-z0-9_-]{1,32}$/.test(handle)) {
    return next();
  }

  const kv = env.ANALYTICS_KV;
  if (!kv) return new Response('Service unavailable', { status: 503 });

  const raw = await kv.get(`profile:${handle}`);
  if (!raw) {
    return new Response(notFoundPage(handle), {
      status: 404,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  const profile = JSON.parse(raw);
  if (!profile.active) {
    return new Response(notFoundPage(handle), {
      status: 404,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  return new Response(renderProfilePage(profile), {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}

function notFoundPage(handle) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Not found — GetMyLnk</title><style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1a1a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:24px}.card{display:flex;flex-direction:column;align-items:center;gap:16px}.num{font-size:4rem;font-weight:800;color:#f4c2c2;line-height:1}.msg{font-size:1rem;color:rgba(255,255,255,0.5)}.back{margin-top:8px;color:#f4c2c2;font-size:0.9rem;text-decoration:none}.back:hover{text-decoration:underline}</style></head><body><div class="card"><div class="num">404</div><p class="msg">/${escapeHtml(handle)} doesn't exist on GetMyLnk.</p><a class="back" href="/">Go home</a></div></body></html>`;
}
