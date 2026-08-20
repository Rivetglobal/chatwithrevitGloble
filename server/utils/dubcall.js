const aiClients = require('./aiClients');

const DEFAULT_BASE = 'https://console.dubcall.com';

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workflows)) return data.workflows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

async function loadDubcallConfig() {
  const keys = await aiClients.loadKeys();
  return {
    apiKey: keys.dubcall || '',
    workflowUid: keys.dubcallWorkflowId || '',
    apiBase: (keys.dubcallApiBase || DEFAULT_BASE).replace(/\/$/, ''),
  };
}

async function dubcallFetch(path, {
  method = 'GET',
  body,
  query,
  apiKey,
  apiBase,
  origin,
} = {}) {
  const cfg = apiKey ? { apiKey, apiBase: apiBase || DEFAULT_BASE } : await loadDubcallConfig();
  if (!cfg.apiKey) {
    const err = new Error('DubCall API key is not configured. Add it in Admin → DubCall AI.');
    err.status = 400;
    throw err;
  }
  const base = (cfg.apiBase || DEFAULT_BASE).replace(/\/$/, '');
  const url = new URL(path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }

  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': cfg.apiKey,
      Authorization: `Bearer ${cfg.apiKey}`,
      ...(origin ? { Origin: origin, Referer: `${String(origin).replace(/\/$/, '')}/` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const detail = data?.detail ?? data?.message ?? data?.error ?? data?.raw;
    const msg = typeof detail === 'string'
      ? detail
      : (detail ? JSON.stringify(detail) : `DubCall request failed (${res.status})`);
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

async function listWorkflows(cfg) {
  const data = await dubcallFetch('/api/v1/workflow/summary', {
    apiKey: cfg?.apiKey,
    apiBase: cfg?.apiBase,
  });
  return asList(data)
    .map((w) => ({
      id: w.id,
      name: w.name || `Workflow ${w.id}`,
      uuid: w.workflow_uuid || w.uuid || null,
    }))
    .filter((w) => w.id != null);
}

async function getWorkflowDetail(id, cfg) {
  return dubcallFetch(`/api/v1/workflow/fetch/${id}`, {
    apiKey: cfg?.apiKey,
    apiBase: cfg?.apiBase,
  });
}

async function resolveWorkflow(uid, cfg) {
  const raw = String(uid || cfg?.workflowUid || '').trim();
  if (!raw) {
    const err = new Error('DubCall workflow UID is not set. Add it in Admin → DubCall AI.');
    err.status = 400;
    throw err;
  }

  if (/^\d+$/.test(raw)) {
    const id = Number(raw);
    try {
      const detail = await getWorkflowDetail(id, cfg);
      return {
        id: detail.id ?? id,
        name: detail.name || `Workflow ${id}`,
        uuid: detail.workflow_uuid || null,
      };
    } catch (err) {
      if (err.status === 404) {
        const listed = await listWorkflows(cfg).catch(() => []);
        const found = listed.find((w) => Number(w.id) === id);
        if (found) return found;
      }
      throw err;
    }
  }

  const listed = await listWorkflows(cfg);
  const byName = listed.find((w) => String(w.name).toLowerCase() === raw.toLowerCase());
  if (byName) return byName;

  if (looksLikeUuid(raw)) {
    const fetchList = asList(await dubcallFetch('/api/v1/workflow/fetch', {
      apiKey: cfg?.apiKey,
      apiBase: cfg?.apiBase,
    }));
    for (const item of fetchList.slice(0, 40)) {
      if (item.workflow_uuid && String(item.workflow_uuid).toLowerCase() === raw.toLowerCase()) {
        return { id: item.id, name: item.name, uuid: item.workflow_uuid };
      }
      try {
        const detail = await getWorkflowDetail(item.id, cfg);
        if (detail.workflow_uuid && String(detail.workflow_uuid).toLowerCase() === raw.toLowerCase()) {
          return { id: detail.id, name: detail.name, uuid: detail.workflow_uuid };
        }
      } catch (_) { /* keep scanning */ }
    }
  }

  const err = new Error(`No DubCall workflow matches "${raw}". Use the numeric ID from the console, or Load workflows in Admin.`);
  err.status = 404;
  throw err;
}

async function createVoiceRun(workflowId, cfg, name) {
  return dubcallFetch(`/api/v1/workflow/${workflowId}/runs`, {
    method: 'POST',
    apiKey: cfg?.apiKey,
    apiBase: cfg?.apiBase,
    body: {
      mode: 'voice',
      name: name || `Rivet AI voice · ${new Date().toISOString()}`,
    },
  });
}

function resolveClientOrigin(req) {
  const candidates = [
    req?.headers?.origin,
    req?.headers?.referer,
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.APP_URL,
    process.env.PUBLIC_APP_URL,
    'https://rivetassist.rivetai.co.uk',
  ];
  for (const value of candidates) {
    if (!value) continue;
    try {
      return new URL(value).origin;
    } catch {
      try {
        return new URL(`https://${String(value).replace(/^https?:\/\//, '')}`).origin;
      } catch {
        /* try next */
      }
    }
  }
  return 'https://rivetassist.rivetai.co.uk';
}

function collectAllowedDomains(req) {
  const hosts = new Set([
    'localhost',
    '127.0.0.1',
    'rivetassist.rivetai.co.uk',
    'www.rivetassist.rivetai.co.uk',
    'rivetai.co.uk',
    'www.rivetai.co.uk',
    'apirivetassist.rivetai.co.uk',
    '*.rivetai.co.uk',
  ]);
  const extras = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.APP_URL,
    process.env.PUBLIC_APP_URL,
    req?.headers?.origin,
    req?.headers?.referer,
  ];
  for (const value of extras) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.hostname) hosts.add(url.hostname);
    } catch {
      const host = String(value).replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      if (host) hosts.add(host);
    }
  }
  return Array.from(hosts);
}

function toWsBase(apiBase) {
  return String(apiBase || DEFAULT_BASE).replace(/\/$/, '').replace(/^http/i, 'ws');
}

function publicSignalingUrl(apiBase, sessionToken) {
  if (!sessionToken) return null;
  return `${toWsBase(apiBase)}/api/v1/ws/public/signaling/${encodeURIComponent(sessionToken)}`;
}

function configKeys(config) {
  if (!config || typeof config !== 'object') return [];
  return Object.keys(config).sort();
}

async function getPlatformHealth(cfg) {
  try {
    return await dubcallFetch('/api/v1/health', {
      apiKey: cfg?.apiKey,
      apiBase: cfg?.apiBase,
    });
  } catch (_) {
    return null;
  }
}

async function ensureEmbedToken(workflowId, cfg, req) {
  const allowed_domains = collectAllowedDomains(req);
  // Always PUT/POST the allowlist so production hosts are on the token.
  // GET-then-skip left stale localhost-only tokens and embed init failed silently.
  return dubcallFetch(`/api/v1/workflow/${workflowId}/embed-token`, {
    method: 'POST',
    apiKey: cfg?.apiKey,
    apiBase: cfg?.apiBase,
    origin: resolveClientOrigin(req),
    body: {
      allowed_domains,
      expires_in_days: 365,
      settings: {
        auto_start: true,
        theme: 'light',
        position: 'inline',
      },
    },
  });
}

async function initEmbedSession(token, cfg, contextVariables, req) {
  const origin = resolveClientOrigin(req);
  return dubcallFetch('/api/v1/public/embed/init', {
    method: 'POST',
    apiKey: cfg?.apiKey,
    apiBase: cfg?.apiBase,
    origin,
    body: {
      token,
      context_variables: contextVariables || undefined,
    },
  });
}

async function getTurnCredentials(sessionToken, cfg) {
  if (sessionToken) {
    try {
      return await dubcallFetch(`/api/v1/public/embed/turn-credentials/${encodeURIComponent(sessionToken)}`, {
        apiKey: cfg?.apiKey,
        apiBase: cfg?.apiBase,
      });
    } catch (_) { /* fall through */ }
  }
  return dubcallFetch('/api/v1/turn/credentials', {
    apiKey: cfg?.apiKey,
    apiBase: cfg?.apiBase,
  });
}

function extractVoice(detail) {
  const acc = { provider: null, voiceId: null, model: null, name: null };
  const seen = new Set();
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
    seen.add(obj);
    const provider = obj.tts_provider || obj.ttsProvider || obj.voice_provider;
    const voiceId = obj.tts_voice_id || obj.ttsVoiceId || obj.voice_id || obj.voiceId;
    const model = obj.tts_model || obj.ttsModel;
    const name = obj.voice_name || obj.voiceName || (typeof obj.voice === 'string' ? obj.voice : null);
    if (provider && !acc.provider) acc.provider = provider;
    if (voiceId && !acc.voiceId) acc.voiceId = voiceId;
    if (model && !acc.model) acc.model = model;
    if (name && !acc.name) acc.name = name;
    if (Array.isArray(obj)) obj.forEach(walk);
    else Object.values(obj).forEach(walk);
  };
  walk(detail?.workflow_definition);
  walk(detail?.workflow_configurations);
  walk(detail);
  if (!acc.provider && !acc.voiceId && !acc.name) return null;
  return acc;
}

module.exports = {
  DEFAULT_BASE,
  loadDubcallConfig,
  dubcallFetch,
  listWorkflows,
  resolveWorkflow,
  getWorkflowDetail,
  createVoiceRun,
  ensureEmbedToken,
  initEmbedSession,
  getTurnCredentials,
  getPlatformHealth,
  extractVoice,
  collectAllowedDomains,
  resolveClientOrigin,
  publicSignalingUrl,
  configKeys,
};
