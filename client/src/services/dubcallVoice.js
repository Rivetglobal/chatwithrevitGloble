/**
 * Play DubCall's configured agent voice over the official embed + WebRTC.
 * Browser speechSynthesis is intentionally not used — that was why users
 * heard random OS voices instead of the DubCall voice.
 */

export function iceServersFrom(turn, config) {
  const servers = [];
  const fromConfig = config?.ice_servers || config?.iceServers || config?.rtc_ice_servers;
  if (Array.isArray(fromConfig)) servers.push(...fromConfig);
  if (turn?.uris?.length) {
    servers.push({
      urls: turn.uris,
      username: turn.username,
      credential: turn.password,
    });
  }
  if (!servers.length) {
    servers.push({ urls: 'stun:stun.l.google.com:19302' });
  }
  return servers;
}

export function pickStartUrl(config, apiBase) {
  if (!config || typeof config !== 'object') return null;
  const candidates = [
    config.start_url, config.offer_url, config.webrtc_url, config.webrtcUrl,
    config.smallwebrtc_url, config.signaling_url, config.url,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
    if (typeof value === 'string' && value.startsWith('/') && apiBase) {
      return `${String(apiBase).replace(/\/$/, '')}${value}`;
    }
  }
  return null;
}

export function pickWsUrl(config) {
  if (!config || typeof config !== 'object') return null;
  const candidates = [config.ws_url, config.websocket_url, config.websocketUrl, config.wsUrl];
  return candidates.find((v) => typeof v === 'string' && /^wss?:\/\//i.test(v)) || null;
}

export function mountEmbedScript(scriptHtml, container) {
  if (!container) return [];
  container.innerHTML = '';
  if (!scriptHtml) return [];
  const created = [];
  const wrap = document.createElement('div');
  wrap.innerHTML = scriptHtml;
  const scripts = [...wrap.querySelectorAll('script')];
  scripts.forEach((s) => s.remove());
  wrap.querySelectorAll("iframe").forEach((frame) => {
    frame.setAttribute("allow", "microphone; autoplay; camera");
    frame.setAttribute("allowfullscreen", "true");
  });
  while (wrap.firstChild) container.appendChild(wrap.firstChild);
  scripts.forEach((old) => {
    const s = document.createElement('script');
    [...old.attributes].forEach((a) => s.setAttribute(a.name, a.value));
    s.text = old.textContent || '';
    container.appendChild(s);
    created.push(s);
  });
  if (!scripts.length && /^https?:\/\//i.test(String(scriptHtml).trim())) {
    const s = document.createElement('script');
    s.src = String(scriptHtml).trim();
    s.async = true;
    container.appendChild(s);
    created.push(s);
  }
  return created;
}

export async function connectDubcallRtc({ config, turn, apiBase, sessionToken, audioEl }) {
  const startUrl = pickStartUrl(config, apiBase);
  if (!startUrl || !audioEl) return null;

  const pc = new RTCPeerConnection({ iceServers: iceServersFrom(turn, config) });
  const local = await navigator.mediaDevices.getUserMedia({ audio: true });
  local.getTracks().forEach((track) => pc.addTrack(track, local));
  pc.ontrack = (event) => {
    const [remote] = event.streams;
    if (remote) {
      audioEl.srcObject = remote;
      audioEl.play().catch(() => {});
    }
  };

  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
  await pc.setLocalDescription(offer);

  const payload = {
    sdp: offer.sdp,
    type: offer.type,
    session_token: sessionToken,
    pc_id: config?.pc_id || undefined,
  };
  const res = await fetch(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const answer = await res.json().catch(() => null);
  if (!res.ok || !answer) {
    pc.close();
    local.getTracks().forEach((t) => t.stop());
    throw new Error(answer?.error || `DubCall WebRTC signaling failed (${res.status})`);
  }
  const desc = answer.sdp ? answer : (answer.answer || answer);
  if (desc?.sdp) await pc.setRemoteDescription(desc);
  return { pc, local };
}
