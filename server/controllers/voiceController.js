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
    const displayName = req.user?.username
      ? `Rivet AI · ${req.user.username}`
      : 'Rivet AI voice';

    const run = await dubcall.createVoiceRun(workflow.id, cfg, displayName);

    let embed = null;
    let session = null;
    try {
      embed = await dubcall.ensureEmbedToken(workflow.id, cfg, req);
      if (embed?.token) {
        session = await dubcall.initEmbedSession(embed.token, cfg, {
          source: 'rivet-ai',
          user: req.user?.username || '',
        });
      }
    } catch (embedErr) {
      console.warn('[voice] DubCall embed init skipped:', embedErr.message);
    }

    res.json({
      ok: true,
      workflow: { id: workflow.id, name: workflow.name, uuid: workflow.uuid || null },
      run: {
        id: run?.id ?? session?.workflow_run_id ?? null,
        mode: run?.mode || 'voice',
        name: run?.name || displayName,
      },
      sessionToken: session?.session_token || null,
      config: session?.config || null,
    });
  } catch (err) {
    console.error('voice createSession error:', err);
    const { status, message } = friendlyDubcallError(err);
    res.status(status).json({ error: message });
  }
};
