const dubcall = require('../utils/dubcall');
const aiClients = require('../utils/aiClients');

function friendlyDubcallError(err) {
  const status = err.status || 502;
  const message = err.message || 'DubCall request failed.';
  return { status: status >= 400 && status < 600 ? status : 502, message };
}

exports.getStatus = async (req, res) => {
  try {
    const keys = await aiClients.getKeyStatus();
    const dub = keys.dubcall || {};
    res.json({
      configured: !!dub.configured,
      apiKeyConfigured: !!dub.apiKey?.configured,
      apiKeyMasked: dub.apiKey?.masked || '',
      apiKeySource: dub.apiKey?.source || 'none',
      workflowId: dub.workflowId || '',
      workflowSource: dub.workflowSource || 'none',
    });
  } catch (err) {
    console.error('voice getStatus error:', err);
    res.status(500).json({ error: 'Failed to load voice status.' });
  }
};

exports.createSession = async (req, res) => {
  try {
    const cfg = await dubcall.loadDubcallConfig();
    if (!cfg.apiKey) {
      return res.status(400).json({
        error: 'DubCall is not connected. An admin must save an API key in Admin → DubCall AI.',
      });
    }
    if (!cfg.workflowUid) {
      return res.status(400).json({
        error: 'No DubCall workflow UID is set. An admin must save the workflow UID in Admin → DubCall AI.',
      });
    }

    const workflow = await dubcall.resolveWorkflow(cfg.workflowUid, cfg);
    let detail = null;
    try { detail = await dubcall.getWorkflowDetail(workflow.id, cfg); } catch (_) { /* optional */ }
    const voice = dubcall.extractVoice(detail) || dubcall.extractVoice(workflow);

    const displayName = req.user?.username
      ? `Rivet AI · ${req.user.username}`
      : 'Rivet AI voice';

    const run = await dubcall.createVoiceRun(workflow.id, cfg, displayName);

    let embed = null;
    let session = null;
    let turn = null;
    let embedError = null;
    try {
      embed = await dubcall.ensureEmbedToken(workflow.id, cfg, req);
      if (!embed?.token) {
        throw new Error('DubCall did not return an embed token for this workflow.');
      }
      session = await dubcall.initEmbedSession(embed.token, cfg, {
        source: 'rivet-ai',
        user: req.user?.username || '',
      }, req);
      try {
        turn = await dubcall.getTurnCredentials(session?.session_token, cfg);
      } catch (turnErr) {
        console.warn('[voice] TURN credentials:', turnErr.message);
      }
    } catch (embedErr) {
      embedError = embedErr.message;
      console.error('[voice] DubCall live voice failed:', embedErr.message);
    }

    const connected = !!(session?.session_token || embed?.embed_script || session?.config);
    res.json({
      ok: connected,
      connected,
      apiBase: cfg.apiBase,
      workflow: { id: workflow.id, name: workflow.name, uuid: workflow.uuid || null },
      voice,
      run: {
        id: run?.id ?? session?.workflow_run_id ?? null,
        mode: run?.mode || 'voice',
        name: run?.name || displayName,
      },
      embedToken: embed?.token || null,
      embedScript: embed?.embed_script || null,
      allowedDomains: embed?.allowed_domains || null,
      sessionToken: session?.session_token || null,
      config: session?.config || null,
      turn,
      embedError,
      error: connected
        ? null
        : (embedError || 'DubCall run started, but the live voice socket did not connect. Check embed allowed domains for this site.'),
    });
  } catch (err) {
    console.error('voice createSession error:', err);
    const { status, message } = friendlyDubcallError(err);
    res.status(status).json({ error: message });
  }
};

exports.getTurn = async (req, res) => {
  try {
    const cfg = await dubcall.loadDubcallConfig();
    const turn = await dubcall.getTurnCredentials(req.params.sessionToken, cfg);
    res.json(turn);
  } catch (err) {
    const { status, message } = friendlyDubcallError(err);
    res.status(status).json({ error: message });
  }
};
