const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppSettings = require('../models/AppSettings');

// Cache the resolved keys for 30s so we don't hit Mongo on every chat
// turn. Admin writes call bustCache() to make the new key take effect
// immediately.
let cache = { ts: 0, gemini: null, openai: null };
const TTL_MS = 30_000;

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
  };
  return cache;
}

function bustCache() { cache = { ts: 0, gemini: null, openai: null }; }

async function getActiveGenAI() {
  const { gemini } = await loadKeys();
  if (!gemini) return null;
  return new GoogleGenerativeAI(gemini);
}

async function getActiveOpenAIKey() {
  const { openai } = await loadKeys();
  return openai || null;
}

// Returns metadata about which keys are present, for the admin UI.
// NEVER returns the raw key — just a masked preview ("AIza••••wxyz") and
// a flag for whether each key is sourced from the DB or the env fallback.
async function getKeyStatus() {
  let s = null;
  try { s = await AppSettings.findOne().lean(); } catch (_) { s = null; }
  const dbGem = (s?.geminiApiKey || '').trim();
  const dbOai = (s?.openaiApiKey || '').trim();
  const envGem = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const envOai = (process.env.OPENAI_API_KEY || '').trim();
  return {
    gemini: keyInfo(dbGem, envGem),
    openai: keyInfo(dbOai, envOai),
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
  getKeyStatus,
};
