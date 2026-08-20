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
    const workflowId = dub.workflowId || '';
    res.json({
      configured: !!(dub.apiKey?.configured && workflowId),
      apiKeyConfigured: !!dub.apiKey?.configured,
      apiKeyMasked: dub.apiKey?.masked || '',
      apiKeySource: dub.apiKey?.source || 'none',
      workflowId,
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
    const uid = cfg.workflowUid;
    if (!uid) {
      return res.status(400).json({
        error: 'Voice is not set up. An admin must save a workflow UID in Admin → DubCall AI.',
      });
    }

    const workflow = await dubcall.resolveWorkflow(uid, cfg);
    let detail = null;
    try { detail = await dubcall.getWorkflowDetail(workflow.id, cfg); } catch (_) { /* optional */ }
    const voice = dubcall.extractVoice(detail) || dubcall.extractVoice(workflow);
    const health = await dubcall.getPlatformHealth(cfg);

    // Browser voice is SmallWebRTC via the public embed session — NOT a
    // mode:"voice" run (those are telephony / console test calls and never
    // attach in-app audio).
    let embed = null;
    let session = null;
    let turn = null;
    let embedError = null;
    try {
      embed = await dubcall.ensureEmbedToken(workflow.id, cfg, req);
      if (!embed?.token) {
        throw new Error('DubCall did not return an embed token for this workflow.');
      }
      try {
        session = await dubcall.initEmbedSession(embed.token, cfg, {
          source: 'rivet-ai',
          user: req.user?.username || '',
          page_url: req.headers?.referer || '',
        }, req);
      } catch (initErr) {
        // Browser can still POST /public/embed/init itself (correct Origin).
        embedError = initErr.message;
        console.warn('[voice] server embed init:', initErr.message);
      }
      if (session?.session_token) {
        try {
          turn = await dubcall.getTurnCredentials(session.session_token, cfg);
        } catch (turnErr) {
          console.warn('[voice] TURN credentials:', turnErr.message);
        }
      }
    } catch (embedErr) {
      embedError = embedErr.message;
      console.error('[voice] DubCall live voice failed:', embedErr.message);
    }

    const sessionToken = session?.session_token || null;
    const ready = !!(embed?.token);
    const signalingUrl = dubcall.publicSignalingUrl(cfg.apiBase, sessionToken);
    res.json({
      ok: ready,
      ready,
      connected: false,
      transport: 'smallwebrtc',
      apiBase: cfg.apiBase,
      signalingUrl,
      workflow: { id: workflow.id, name: workflow.name, uuid: workflow.uuid || null },
      voice,
      run: {
        id: session?.workflow_run_id ?? session?.config?.workflow_run_id ?? null,
        mode: 'smallwebrtc',
        name: `Rivet AI · ${req.user?.username || 'voice'}`,
      },
      embedToken: embed?.token || null,
      allowedDomains: embed?.allowed_domains || null,
      sessionToken,
      configKeys: dubcall.configKeys(session?.config),
      turn,
      turnEnabled: health?.turn_enabled !== false,
      forceTurnRelay: !!health?.force_turn_relay,
      embedError,
      error: ready
        ? null
        : (embedError || 'DubCall did not return an embed token. Re-save the API key in Admin → DubCall AI.'),
    });
  } catch (err) {
    console.error('voice createSession error:', err);
    const { status, message } = friendlyDubcallError(err);
    res.status(status).json({ error: message });
  }
};

exports.listWorkflows = async (req, res) => {
  try {
    const cfg = await dubcall.loadDubcallConfig();
    if (!cfg.apiKey) {
      return res.status(400).json({ error: 'DubCall API key is not connected.' });
    }
    const workflows = await dubcall.listWorkflows(cfg);
    res.json({
      workflows,
      defaultWorkflowId: cfg.workflowUid || '',
    });
  } catch (err) {
    console.error('voice listWorkflows error:', err);
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
