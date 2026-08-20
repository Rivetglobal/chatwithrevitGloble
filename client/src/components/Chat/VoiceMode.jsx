import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, GraphicEq } from "@mui/icons-material";
import rivetLogo from "../../assets/rivetGlobalpng.png";
import voiceService from "../../services/voiceService";
import { connectDubcallRtc, mountEmbedScript } from "../../services/dubcallVoice";
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

  const embedRef = useRef(null);
  const audioRef = useRef(null);
  const rtcRef = useRef(null);
  const localRef = useRef(null);

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
    try { rtcRef.current?.pc?.close(); } catch (_) { /* ignore */ }
    rtcRef.current = null;
    try { localRef.current?.getTracks?.().forEach((t) => t.stop()); } catch (_) { /* ignore */ }
    localRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    if (embedRef.current) embedRef.current.innerHTML = "";
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
    try {
      const session = await voiceService.createSession();
      setWorkflowName(session?.workflow?.name || "");
      setRunId(session?.run?.id || null);
      setVoiceName(voiceLabel(session?.voice));

      if (!session?.connected) {
        throw new Error(
          session?.error
          || session?.embedError
          || "DubCall started a run, but live voice did not connect. Add this site to the workflow embed allowed domains.",
        );
      }

      if (session.embedScript) {
        mountEmbedScript(session.embedScript, embedRef.current);
      }

      try {
        const rtc = await connectDubcallRtc({
          config: session.config,
          turn: session.turn,
          apiBase: session.apiBase,
          sessionToken: session.sessionToken,
          audioEl: audioRef.current,
        });
        if (rtc) {
          rtcRef.current = rtc;
          localRef.current = rtc.local;
        }
      } catch (rtcErr) {
        console.warn("[voice] WebRTC helper:", rtcErr.message);
        if (!session.embedScript) throw rtcErr;
      }

      setPhase("listening");
    } catch (err) {
      teardown();
      setLive(false);
      setPhase("error");
      setError(err?.response?.data?.error || err.message || "Could not start the DubCall voice session.");
    }
  };

  const configured = !!status?.configured;
  const orbClass = [
    "rv-voice-orb",
    phase === "listening" ? "is-listening" : "",
    phase === "speaking" ? "is-speaking" : "",
    phase === "connecting" ? "is-thinking" : "",
  ].filter(Boolean).join(" ");

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
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />
      <div
        ref={embedRef}
        id="dubcall-embed-host"
        style={{
          position: "fixed",
          left: 12,
          bottom: 12,
          width: 280,
          height: 72,
          overflow: "hidden",
          opacity: 0.01,
          zIndex: 0,
        }}
        aria-hidden="true"
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
          {!configured && "Connect DubCall in Admin with an API key and workflow UID, then start talking."}
          {configured && !live && "This uses the DubCall agent voice you configured — not the browser’s voices."}
          {configured && live && (
            <>
              {workflowName ? `Running ${workflowName}` : "DubCall connected"}
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
        {configured && !live && phase !== "connecting" && (
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
        {!configured && status && (
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
