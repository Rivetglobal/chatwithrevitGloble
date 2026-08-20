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

function collectAllowedDomains(req) {
  const hosts = new Set(['localhost', '127.0.0.1']);
  const extras = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.APP_URL,
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

async function ensureEmbedToken(workflowId, cfg, req) {
  try {
    const existing = await dubcallFetch(`/api/v1/workflow/${workflowId}/embed-token`, {
      apiKey: cfg?.apiKey,
      apiBase: cfg?.apiBase,
    });
    if (existing?.token) return existing;
  } catch (_) { /* create below */ }

  return dubcallFetch(`/api/v1/workflow/${workflowId}/embed-token`, {
    method: 'POST',
    apiKey: cfg?.apiKey,
    apiBase: cfg?.apiBase,
    body: {
      allowed_domains: collectAllowedDomains(req),
      expires_in_days: 365,
    },
  });
}

async function initEmbedSession(token, cfg, contextVariables) {
  return dubcallFetch('/api/v1/public/embed/init', {
    method: 'POST',
    apiKey: cfg?.apiKey,
    apiBase: cfg?.apiBase,
    body: {
      token,
      context_variables: contextVariables || undefined,
    },
  });
}

module.exports = {
  DEFAULT_BASE,
  loadDubcallConfig,
  dubcallFetch,
  listWorkflows,
  resolveWorkflow,
  createVoiceRun,
  ensureEmbedToken,
  initEmbedSession,
  collectAllowedDomains,
};
