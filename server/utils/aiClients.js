const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppSettings = require('../models/AppSettings');

// Cache the resolved keys for 30s so we don't hit Mongo on every chat
// turn. Admin writes call bustCache() to make the new key take effect
// immediately.
let cache = { ts: 0, gemini: null, openai: null, dubcall: null, dubcallWorkflowId: null, dubcallApiBase: null };
const TTL_MS = 30_000;

// Returns true when a Gemini error is transient/recoverable — quota exhausted,
// billing issue, service unavailable, rate-limit. These are the cases where
// falling back to OpenAI makes sense. Auth errors (bad key) are also included
// so a misconfigured Gemini key never fully blocks the app.
function isGeminiUnavailableError(err) {
  if (!err) return false;
  const status = err?.status ?? err?.httpErrorCode ?? err?.code;
  if ([401, 403, 429, 500, 502, 503, 504].includes(Number(status))) return true;
  const msg = (err?.message || err?.toString() || '').toLowerCase();
  return /quota|billing|rate.?limit|resource.?exhausted|overload|capacity|too many|service.?unavailable|unavailable|forbidden|invalid.?api.?key|api.?key/i.test(msg);
}

async function loadKeys() {
  const now = Date.now();
  if (cache.ts && now - cache.ts < TTL_MS) return cache;
  let s = null;
  try { s = await AppSettings.findOne().lean(); } catch (_) { s = null; }
  cache = {
    ts: now,
    gemini: (s?.geminiApiKey && s.geminiApiKey.trim())
      || process.env.GEMINI_API_KEY
      || process.env.GOOGLE_API_KEY
      || '',
    openai: (s?.openaiApiKey && s.openaiApiKey.trim())
      || process.env.OPENAI_API_KEY
      || '',
    dubcall: (s?.dubcallApiKey && s.dubcallApiKey.trim())
      || process.env.DUBCALL_API_KEY
      || '',
    dubcallWorkflowId: (s?.dubcallWorkflowId && String(s.dubcallWorkflowId).trim())
      || process.env.DUBCALL_WORKFLOW_ID
      || '',
    dubcallApiBase: (s?.dubcallApiBase && s.dubcallApiBase.trim())
      || process.env.DUBCALL_API_BASE
      || '',
  };
  return cache;
}

function bustCache() {
  cache = { ts: 0, gemini: null, openai: null, dubcall: null, dubcallWorkflowId: null, dubcallApiBase: null };
}

async function getActiveGenAI() {
  const { gemini } = await loadKeys();
  if (!gemini) return null;
  return new GoogleGenerativeAI(gemini);
}

async function getActiveOpenAIKey() {
  const { openai } = await loadKeys();
  return openai || null;
}

async function getOpenAIClient() {
  const { openai } = await loadKeys();
  if (!openai) return null;
  const { OpenAI } = require('openai');
  return new OpenAI({ apiKey: openai });
}

// Returns metadata about which keys are present, for the admin UI.
// NEVER returns the raw key — just a masked preview ("AIza••••wxyz") and
// a flag for whether each key is sourced from the DB or the env fallback.
async function getKeyStatus() {
  let s = null;
  try { s = await AppSettings.findOne().lean(); } catch (_) { s = null; }
  const dbGem = (s?.geminiApiKey || '').trim();
  const dbOai = (s?.openaiApiKey || '').trim();
  const dbDub = (s?.dubcallApiKey || '').trim();
  const dbWf  = (s?.dubcallWorkflowId != null ? String(s.dubcallWorkflowId) : '').trim();
  const envGem = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const envOai = (process.env.OPENAI_API_KEY || '').trim();
  const envDub = (process.env.DUBCALL_API_KEY || '').trim();
  const envWf  = (process.env.DUBCALL_WORKFLOW_ID || '').trim();
  const dubcallKey = keyInfo(dbDub, envDub);
  const workflowId = dbWf || envWf || '';
  return {
    gemini: keyInfo(dbGem, envGem),
    openai: keyInfo(dbOai, envOai),
    dubcall: {
      configured: !!dubcallKey.configured,
      apiKey: dubcallKey,
      workflowId,
      workflowSource: dbWf ? 'admin' : (envWf ? 'env' : 'none'),
    },
  };
}

function keyInfo(dbValue, envValue) {
  const active = dbValue || envValue || '';
  return {
    configured: !!active,
    source: dbValue ? 'admin' : (envValue ? 'env' : 'none'),
    masked: active ? maskKey(active) : '',
    hasOverride: !!dbValue,
    hasEnv: !!envValue,
  };
}

function maskKey(k) {
  if (!k) return '';
  if (k.length <= 8) return '•'.repeat(k.length);
  return `${k.slice(0, 4)}${'•'.repeat(Math.max(4, k.length - 8))}${k.slice(-4)}`;
}

module.exports = {
  loadKeys,
  bustCache,
  getActiveGenAI,
  getActiveOpenAIKey,
  getOpenAIClient,
  getKeyStatus,
  isGeminiUnavailableError,
};
