import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, GraphicEq } from "@mui/icons-material";
import rivetLogo from "../../assets/rivetGlobalpng.png";
import voiceService from "../../services/voiceService";
import { startDubcallVoice } from "../../services/dubcallVoice";
import { C, font } from "../../theme";

const STATUS_COPY = {
  idle: "Ready when you are",
  connecting: "Connecting DubCall…",
  listening: "Speak — DubCall is listening",
  speaking: "Rivet is speaking",
  ended: "Call ended",
  error: "Something went wrong",
};

function voiceLabel(voice) {
  if (!voice) return "";
  const name = voice.name || voice.voiceId;
  const provider = voice.provider;
  if (name && provider) return `${name} · ${provider}`;
  return name || provider || "";
}

const VoiceMode = ({ user }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [runId, setRunId] = useState(null);
  const [live, setLive] = useState(false);

  const audioRef = useRef(null);
  const rtcRef = useRef(null);
  const liveRef = useRef(false);

  useEffect(() => { liveRef.current = live; }, [live]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await voiceService.getStatus();
        if (!cancelled) setStatus(data);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || "Could not load voice status.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const teardown = useCallback(() => {
    liveRef.current = false;
    try { rtcRef.current?.close?.(); } catch { /* ignore */ }
    try { rtcRef.current?.pc?.close(); } catch { /* ignore */ }
    rtcRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
  }, []);

  const endCall = useCallback(() => {
    teardown();
    setLive(false);
    setPhase("ended");
  }, [teardown]);

  useEffect(() => () => teardown(), [teardown]);

  const startCall = async () => {
    setError("");
    setPhase("connecting");
    setLive(true);
    teardown();
    liveRef.current = true;
    try {
      const session = await voiceService.createSession();
      if (!liveRef.current) return;
      setWorkflowName(session?.workflow?.name || "");
      setVoiceName(voiceLabel(session?.voice));

      if (!session?.ready && !session?.embedToken && !session?.sessionToken) {
        throw new Error(
          session?.error
          || session?.embedError
          || "DubCall is not ready for live voice. An admin must save the API key and workflow UID in Admin → DubCall AI.",
        );
      }

      const handle = await startDubcallVoice({
        apiBase: session.apiBase,
        embedToken: session.embedToken,
        sessionToken: session.sessionToken,
        workflowId: session.workflow?.id,
        workflowRunId: session.run?.id,
        turn: session.turn,
        turnEnabled: session.turnEnabled,
        forceTurnRelay: session.forceTurnRelay,
        signalingUrl: session.signalingUrl,
        allowedDomains: session.allowedDomains,
        audioEl: audioRef.current,
        onState: (next, detail) => {
          if (!liveRef.current) return;
          if (next === "speaking") setPhase("speaking");
          else if (next === "listening") setPhase("listening");
          else if (next === "ended") {
            teardown();
            setLive(false);
            setPhase("ended");
          } else if (next === "error" && detail) {
            setError(detail);
          }
        },
      });
      if (!liveRef.current) {
        try { handle.close(); } catch { /* ignore */ }
        return;
      }
      rtcRef.current = handle;
      setRunId(handle?.workflowRunId || session?.run?.id || null);
      setPhase("listening");
    } catch (err) {
      if (!liveRef.current) return;
      teardown();
      setLive(false);
      setPhase("error");
      setError(err?.response?.data?.error || err.message || "Could not start the DubCall voice session.");
    }
  };

  const apiReady = !!(status?.apiKeyConfigured || status?.configured);
  const workflowReady = !!status?.workflowId;
  const ready = apiReady && workflowReady;
  const orbClass = [
    "rv-voice-orb",
    phase === "listening" ? "is-listening" : "",
    phase === "speaking" ? "is-speaking" : "",
    phase === "connecting" ? "is-thinking" : "",
  ].filter(Boolean).join(" ");

  let idleCopy = "Ask an administrator to connect DubCall in Admin.";
  if (user?.isAdmin && !apiReady) idleCopy = "Save the DubCall API key and workflow UID in Admin.";
  else if (user?.isAdmin && !workflowReady) idleCopy = "Choose the voice workflow UID in Admin → DubCall AI, then come back here.";
  else if (apiReady && !workflowReady) idleCopy = "Ask an administrator to set the voice workflow in Admin.";
  else if (ready) idleCopy = "Tap start to talk. The agent uses the DubCall workflow set by your admin.";

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 24px 40px",
      minHeight: 0,
      background:
        "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(15,118,110,0.08) 0%, transparent 70%)",
    }}>
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />

      <div className={orbClass}>
        <span className="rv-voice-ring" />
        <span className="rv-voice-ring rv-voice-ring-2" />
        <div className="rv-voice-logo-wrap">
          <img src={rivetLogo} alt="Rivet Global" className="rv-voice-logo" />
        </div>
      </div>

      <div style={{ marginTop: 28, textAlign: "center", maxWidth: 480, fontFamily: font }}>
        <div style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.accent,
          marginBottom: 8,
        }}>
          Rivet Global · Voice
        </div>
        <h2 style={{
          margin: 0,
          fontSize: "1.45rem",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: C.text,
        }}>
          {STATUS_COPY[phase] || STATUS_COPY.idle}
        </h2>
        <p style={{ margin: "8px 0 0", color: C.muted, fontSize: "0.88rem", lineHeight: 1.55 }}>
          {!live && idleCopy}
          {live && (
            <>
              {workflowName ? `Live on ${workflowName}` : "DubCall voice is live"}
              {runId ? ` · run #${runId}` : ""}
              {voiceName ? ` · ${voiceName}` : ""}
            </>
          )}
        </p>
      </div>

      {error && (
        <div style={{
          marginTop: 16,
          maxWidth: 520,
          width: "100%",
          padding: "10px 14px",
          borderRadius: 8,
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          color: C.error,
          fontSize: "0.82rem",
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}>
        {ready && !live && phase !== "connecting" && (
          <button
            type="button"
            onClick={startCall}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              borderRadius: 999,
              border: "none",
              background: C.accent,
              color: "#fff",
              fontFamily: font,
              fontWeight: 650,
              fontSize: "0.92rem",
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(15,118,110,0.28)",
            }}
          >
            <Mic sx={{ fontSize: 18 }} /> Start conversation
          </button>
        )}
        {live && (
          <button
            type="button"
            onClick={endCall}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              borderRadius: 999,
              border: `1px solid ${C.border}`,
              background: C.surface,
              color: C.error,
              fontFamily: font,
              fontWeight: 650,
              fontSize: "0.92rem",
              cursor: "pointer",
            }}
          >
            <MicOff sx={{ fontSize: 18 }} /> End
          </button>
        )}
        {!ready && status && (
          user?.isAdmin ? (
            <button
              type="button"
              onClick={() => navigate("/admin")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 22px",
                borderRadius: 999,
                border: "none",
                background: C.sidebar,
                color: "#fff",
                fontFamily: font,
                fontWeight: 650,
                fontSize: "0.92rem",
                cursor: "pointer",
              }}
            >
              <GraphicEq sx={{ fontSize: 18 }} /> Set up DubCall in Admin
            </button>
          ) : (
            <div style={{ fontSize: "0.82rem", color: C.muted }}>Ask an administrator to connect DubCall.</div>
          )
        )}
      </div>
    </div>
  );
};

export default VoiceMode;
