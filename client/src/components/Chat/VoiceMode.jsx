import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, GraphicEq } from "@mui/icons-material";
import rivetLogo from "../../assets/rivetGlobalpng.png";
import voiceService from "../../services/voiceService";
import { C, font } from "../../theme";

const SpeechRec = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

function pickBritishVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  return (
    voices.find((v) => /en-GB/i.test(v.lang) && /female|samantha|google uk/i.test(v.name))
    || voices.find((v) => /en-GB/i.test(v.lang))
    || voices.find((v) => /^en/i.test(v.lang))
    || null
  );
}

const STATUS_COPY = {
  idle: "Ready when you are",
  connecting: "Connecting DubCall…",
  listening: "Listening — speak naturally",
  thinking: "Thinking…",
  speaking: "Rivet is speaking",
  ended: "Call ended",
  error: "Something went wrong",
};

const VoiceMode = ({
  conversationId,
  user,
  onTurn,
}) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [caption, setCaption] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [runId, setRunId] = useState(null);
  const [live, setLive] = useState(false);

  const recRef = useRef(null);
  const activeRef = useRef(false);
  const phaseRef = useRef("idle");
  const conversationRef = useRef(conversationId);

  useEffect(() => { conversationRef.current = conversationId; }, [conversationId]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

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

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
    window.speechSynthesis.getVoices();
    const refresh = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  const stopSpeaking = () => {
    try { window.speechSynthesis?.cancel(); } catch (_) { /* ignore */ }
  };

  const stopListening = () => {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    try { rec.onresult = null; rec.onerror = null; rec.onend = null; rec.stop(); } catch (_) { /* ignore */ }
  };

  const endCall = useCallback(() => {
    activeRef.current = false;
    setLive(false);
    stopListening();
    stopSpeaking();
    setPhase("ended");
    setCaption("");
  }, []);

  useEffect(() => () => {
    activeRef.current = false;
    stopListening();
    stopSpeaking();
  }, []);

  const speak = (text) => new Promise((resolve) => {
    if (!text || !window.speechSynthesis) {
      resolve();
      return;
    }
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-GB";
    utter.rate = 1.02;
    utter.pitch = 1;
    const voice = pickBritishVoice();
    if (voice) utter.voice = voice;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });

  const listenOnce = () => new Promise((resolve, reject) => {
    if (!SpeechRec) {
      reject(new Error("Voice input needs Chrome, Edge, or Safari."));
      return;
    }
    stopListening();
    const rec = new SpeechRec();
    recRef.current = rec;
    rec.lang = "en-GB";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += `${piece} `;
        else interim += piece;
      }
      setCaption((finalText + interim).trim());
    };
    rec.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        resolve("");
        return;
      }
      reject(new Error(event.error === "not-allowed"
        ? "Microphone permission was blocked."
        : `Microphone error: ${event.error}`));
    };
    rec.onend = () => resolve(finalText.trim());
    try { rec.start(); } catch (err) { reject(err); }
  });

  const loop = async () => {
    while (activeRef.current) {
      setPhase("listening");
      setReply("");
      let heard = "";
      try {
        heard = await listenOnce();
      } catch (err) {
        if (!activeRef.current) return;
        setError(err.message || "Microphone failed.");
        setPhase("error");
        activeRef.current = false;
        setLive(false);
        return;
      }
      if (!activeRef.current) return;
      if (!heard) continue;

      setCaption(heard);
      setPhase("thinking");
      try {
        const spoken = await onTurn(heard, conversationRef.current);
        if (!activeRef.current) return;
        setReply(spoken || "");
        setPhase("speaking");
        await speak(spoken || "");
      } catch (err) {
        if (!activeRef.current) return;
        setError(err?.response?.data?.error || err.message || "Could not complete that turn.");
        setPhase("error");
        activeRef.current = false;
        setLive(false);
        return;
      }
    }
  };

  const startCall = async () => {
    setError("");
    setCaption("");
    setReply("");
    setPhase("connecting");
    setLive(true);
    try {
      await navigator.mediaDevices?.getUserMedia?.({ audio: true }).then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
      });
      const session = await voiceService.createSession();
      setWorkflowName(session?.workflow?.name || "");
      setRunId(session?.run?.id || null);
      activeRef.current = true;
      setLive(true);
      setPhase("listening");
      loop();
    } catch (err) {
      activeRef.current = false;
      setLive(false);
      setPhase("error");
      setError(err?.response?.data?.error || err.message || "Could not start the DubCall workflow.");
    }
  };

  const configured = !!status?.configured;
  const orbClass = [
    "rv-voice-orb",
    phase === "listening" ? "is-listening" : "",
    phase === "speaking" ? "is-speaking" : "",
    phase === "thinking" || phase === "connecting" ? "is-thinking" : "",
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
      <div className={orbClass} aria-hidden={false}>
        <span className="rv-voice-ring" />
        <span className="rv-voice-ring rv-voice-ring-2" />
        <div className="rv-voice-logo-wrap">
          <img src={rivetLogo} alt="Rivet Global" className="rv-voice-logo" />
        </div>
      </div>

      <div style={{
        marginTop: 28,
        textAlign: "center",
        maxWidth: 480,
        fontFamily: font,
      }}>
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
          {configured
            ? (workflowName
              ? `Running ${workflowName}${runId ? ` · run #${runId}` : ""}`
              : "Talk with Rivet. Your conversation is saved in this thread.")
            : "Connect DubCall in Admin with an API key and workflow UID, then start talking."}
        </p>
      </div>

      {(caption || reply) && (
        <div style={{
          marginTop: 22,
          width: "100%",
          maxWidth: 520,
          padding: "14px 16px",
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          background: C.surface,
          boxShadow: C.shadow,
        }}>
          {caption && (
            <div style={{ fontSize: "0.92rem", color: C.text, lineHeight: 1.5 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>You</span>
              {caption}
            </div>
          )}
          {reply && (
            <div style={{ fontSize: "0.92rem", color: C.text, lineHeight: 1.55, marginTop: caption ? 12 : 0 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.accent, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Rivet</span>
              {reply}
            </div>
          )}
        </div>
      )}

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
