/**
 * DubCall in-browser voice is Pipecat SmallWebRTC over a WebSocket.
 * Official widget: wss://…/api/v1/ws/public/signaling/{session_token}
 * with { type: 'offer' | 'ice-candidate' } JSON. HTTP SDP POST does nothing.
 * Browser speechSynthesis is never used.
 */

export function iceServersFrom(turn, { forceTurnRelay } = {}) {
  const servers = [];
  if (!forceTurnRelay) {
    servers.push({ urls: ['stun:stun.l.google.com:19302'] });
  }
  if (turn?.uris?.length) {
    servers.push({
      urls: turn.uris,
      username: turn.username,
      credential: turn.password,
    });
  }
  return servers;
}

export function toWsBase(apiBase) {
  return String(apiBase || '').replace(/\/$/, '').replace(/^http/i, 'ws');
}

export function publicSignalingUrl(apiBase, sessionToken) {
  if (!sessionToken) return null;
  return `${toWsBase(apiBase)}/api/v1/ws/public/signaling/${encodeURIComponent(sessionToken)}`;
}

function generatePeerId() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return `PC-${Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function originError(detail, allowedDomains) {
  const allow = Array.isArray(allowedDomains) && allowedDomains.length
    ? ` Allowed: ${allowedDomains.join(', ')}.`
    : '';
  return new Error(`${detail}${allow}`);
}

async function parseJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return { raw: text }; }
}

export async function initEmbedSession(apiBase, token, contextVariables = {}) {
  const base = String(apiBase || '').replace(/\/$/, '');
  const res = await fetch(`${base}/api/v1/public/embed/init`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, context_variables: contextVariables }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    const detail = data?.detail ?? data?.message ?? data?.error ?? `Embed init failed (${res.status})`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return data;
}

export async function fetchTurnCredentials(apiBase, sessionToken) {
  if (!sessionToken) return null;
  const base = String(apiBase || '').replace(/\/$/, '');
  const res = await fetch(
    `${base}/api/v1/public/embed/turn-credentials/${encodeURIComponent(sessionToken)}`,
    { headers: { Accept: 'application/json' } },
  );
  if (res.status === 503) return null;
  if (!res.ok) return null;
  return parseJson(res);
}

function waitForPeerConnection(pc, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    const onTrack = () => finish();
    const onState = () => {
      const ice = pc.iceConnectionState;
      const conn = pc.connectionState;
      if (conn === 'connected' || ice === 'connected' || ice === 'completed') {
        finish();
        return;
      }
      if (conn === 'failed' || ice === 'failed') {
        finish(new Error('DubCall voice ICE connection failed. The agent did not attach audio.'));
      }
    };
    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      pc.removeEventListener('connectionstatechange', onState);
      pc.removeEventListener('iceconnectionstatechange', onState);
      pc.removeEventListener('track', onTrack);
      if (err) reject(err);
      else resolve();
    };
    timer = setTimeout(() => {
      finish(new Error('DubCall did not connect live audio in time. Allow the microphone, then try again.'));
    }, timeoutMs);
    pc.addEventListener('connectionstatechange', onState);
    pc.addEventListener('iceconnectionstatechange', onState);
    pc.addEventListener('track', onTrack, { once: true });
    onState();
  });
}

function watchSpeaking(stream, onState) {
  if (!onState || !stream) return () => {};
  let ctx;
  let interval;
  try {
    ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;
    interval = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, n) => sum + n, 0) / data.length;
      const next = avg > 14;
      if (next !== speaking) {
        speaking = next;
        onState(next ? 'speaking' : 'listening');
      }
    }, 90);
  } catch (_) {
    return () => {};
  }
  return () => {
    clearInterval(interval);
    try { ctx?.close(); } catch (_) { /* ignore */ }
  };
}

/**
 * Start a live DubCall SmallWebRTC call. Resolves only after remote audio
 * is attached (or ICE is connected). Call .close() to hang up.
 */
export async function startDubcallVoice({
  apiBase,
  embedToken,
  sessionToken,
  workflowId,
  workflowRunId,
  turn,
  turnEnabled = true,
  forceTurnRelay = false,
  signalingUrl,
  allowedDomains,
  audioEl,
  onState,
} = {}) {
  const contextVariables = {
    source: 'rivet-ai',
    page_url: typeof window !== 'undefined' ? window.location.href : '',
  };

  let token = sessionToken || null;
  let runId = workflowRunId || null;
  let wfId = workflowId || null;
  let turnCreds = turn || null;

  // Server init is preferred (already created a SMALLWEBRTC run). If that
  // failed — usually CORS/Origin — start the embed session from this page.
  if (!token && embedToken) {
    try {
      const inited = await initEmbedSession(apiBase, embedToken, contextVariables);
      token = inited.session_token || token;
      runId = inited.workflow_run_id ?? inited.config?.workflow_run_id ?? runId;
      wfId = inited.config?.workflow_id ?? wfId;
    } catch (err) {
      throw originError(
        err.message || 'DubCall refused to start a browser voice session.',
        allowedDomains,
      );
    }
  }

  if (!token) {
    throw new Error('DubCall did not return a session token. Re-save the API key and try again.');
  }

  if (turnEnabled !== false && !turnCreds?.uris?.length) {
    try { turnCreds = await fetchTurnCredentials(apiBase, token); } catch (_) { /* STUN only */ }
  }

  if (!audioEl) throw new Error('Voice audio element is missing.');

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
  } catch (micErr) {
    const name = micErr?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      throw new Error('Microphone permission denied. Allow the microphone to talk to DubCall.');
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      throw new Error('No microphone found. Connect a microphone and try again.');
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      throw new Error('Microphone is already in use by another application.');
    }
    throw new Error(micErr.message || 'Could not open the microphone.');
  }

  const pc = new RTCPeerConnection({
    iceServers: iceServersFrom(turnCreds, { forceTurnRelay }),
    iceTransportPolicy: forceTurnRelay ? 'relay' : 'all',
  });
  const pcId = generatePeerId();
  const pendingIce = [];
  let ws = null;
  let stopWatch = () => {};
  let closed = false;

  const send = (message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return;
    }
    if (message.type === 'ice-candidate') pendingIce.push(message);
  };

  const close = () => {
    if (closed) return;
    closed = true;
    stopWatch();
    try { ws?.close(); } catch (_) { /* ignore */ }
    ws = null;
    try { pc.close(); } catch (_) { /* ignore */ }
    try { stream?.getTracks?.().forEach((t) => t.stop()); } catch (_) { /* ignore */ }
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
    }
  };

  stream.getTracks().forEach((track) => pc.addTrack(track, stream));

  pc.ontrack = (event) => {
    const remote = event.streams?.[0] || (event.track ? new MediaStream([event.track]) : null);
    if (!remote || !audioEl) return;
    audioEl.srcObject = remote;
    audioEl.muted = false;
    audioEl.play().catch(() => {});
    stopWatch();
    stopWatch = watchSpeaking(remote, onState);
  };

  pc.onicecandidate = (event) => {
    send({
      type: 'ice-candidate',
      payload: {
        candidate: event.candidate
          ? {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          }
          : null,
        pc_id: pcId,
      },
    });
  };

  const wsUrl = signalingUrl || publicSignalingUrl(apiBase, token);
  if (!wsUrl) {
    close();
    throw new Error('DubCall signaling URL is missing.');
  }

  try {
    await new Promise((resolve, reject) => {
      ws = new WebSocket(wsUrl);
      const timer = setTimeout(() => reject(new Error('DubCall signaling socket timed out.')), 12000);
      ws.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(timer);
        reject(originError(
          'DubCall signaling socket failed. This site must be on the workflow embed allowlist.',
          allowedDomains,
        ));
      };
    });
  } catch (err) {
    close();
    throw err;
  }

  while (pendingIce.length) send(pendingIce.shift());

  ws.onmessage = async (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    const payload = message.payload || {};
    try {
      if (message.type === 'answer' && payload.sdp) {
        await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
      } else if (message.type === 'ice-candidate' && payload.candidate) {
        await pc.addIceCandidate({
          candidate: payload.candidate.candidate,
          sdpMid: payload.candidate.sdpMid,
          sdpMLineIndex: payload.candidate.sdpMLineIndex,
        });
      } else if (message.type === 'error') {
        const msg = payload.message || payload.error_type || 'DubCall signaling error';
        onState?.('error', msg);
      } else if (message.type === 'call-ended') {
        close();
        onState?.('ended');
      }
    } catch (err) {
      console.warn('[voice] signaling message:', err.message);
    }
  };

  ws.onclose = (event) => {
    if (closed) return;
    const reason = event.reason || '';
    if (reason === 'call ended' || event.code === 1000) {
      close();
      onState?.('ended');
      return;
    }
    if (reason.toLowerCase().includes('domain')) {
      onState?.('error', originError(
        'DubCall blocked this site. Add rivetassist.rivetai.co.uk to the workflow embed allowed domains.',
        allowedDomains,
      ).message);
    }
    close();
    onState?.('ended');
  };

  try {
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({
      type: 'offer',
      payload: {
        sdp: offer.sdp,
        type: 'offer',
        pc_id: pcId,
        workflow_id: wfId != null ? Number(wfId) : undefined,
        workflow_run_id: runId != null ? Number(runId) : undefined,
      },
    }));
    await waitForPeerConnection(pc);
  } catch (err) {
    close();
    throw err;
  }

  return {
    pc,
    local: stream,
    ws,
    sessionToken: token,
    workflowRunId: runId,
    close,
  };
}
