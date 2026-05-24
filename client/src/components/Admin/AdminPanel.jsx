import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack, Visibility, VisibilityOff, CheckCircle, Cancel, UploadFile } from "@mui/icons-material";
import authService from "../../services/authService";
import adminService from "../../services/adminService";

const DEFAULT_INTEG = {
  google: { configured: false, source: "none", clientEmail: "", hasOverride: false, hasEnv: false },
  email: { configured: false, source: "none", provider: "zepto" },
};

const C = {
  bg: "#0c1117", surface: "#131929", card: "#1a2234", border: "#1e2d45",
  accent: "#5b8dee", accentDim: "rgba(91,141,238,0.12)", accentText: "#93c5fd",
  text: "#f1f5f9", muted: "#64748b", mutedLight: "#94a3b8",
  ok: "#34a853", warn: "#f59e0b", error: "#f87171",
};
const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const StatusBadge = ({ configured, source }) => {
  const label = configured
    ? source === "admin" ? "Set in admin panel" : "Using environment variable"
    : "Not configured";
  const color = configured ? (source === "admin" ? C.accentText : C.mutedLight) : C.error;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color, marginTop: 3 }}>
      {configured
        ? <CheckCircle sx={{ fontSize: 13, color: C.ok }} />
        : <Cancel sx={{ fontSize: 13, color: C.error }} />}
      {label}
    </div>
  );
};

const SectionHeader = ({ title, sub }) => (
  <div style={{ marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
    <div style={{ fontSize: "1rem", fontWeight: 700, color: C.text }}>{title}</div>
    {sub && <div style={{ fontSize: "0.78rem", color: C.mutedLight, marginTop: 3 }}>{sub}</div>}
  </div>
);

const FieldRow = ({ label, hint, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: C.mutedLight, marginBottom: 5 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 4 }}>{hint}</div>}
  </div>
);

const Input = ({ type = "text", value, onChange, placeholder, mono }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      width: "100%", boxSizing: "border-box",
      padding: "9px 12px", borderRadius: 6,
      border: `1px solid ${C.border}`, backgroundColor: C.bg,
      color: C.text, fontSize: "0.82rem",
      fontFamily: mono ? "monospace" : font,
      outline: "none",
    }}
  />
);

const SaveBtn = ({ onClick, disabled, saving, label = "Save" }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || saving}
    style={{
      padding: "9px 18px", borderRadius: 6, border: "none",
      backgroundColor: disabled || saving ? C.border : C.accent,
      color: "#fff", fontSize: "0.82rem", fontWeight: 600,
      cursor: disabled || saving ? "not-allowed" : "pointer",
      opacity: saving ? 0.7 : 1,
    }}
  >{saving ? "Saving…" : label}</button>
);

const KeyRow = ({ label, info, value, onChange, onSave, onClear, saving, showRaw, onToggleShow }) => {
  const sourceLabel = info?.source === "admin" ? "Set in admin panel" : info?.source === "env" ? "Falling back to environment variable" : "Not configured";
  const sourceColor = info?.configured ? (info.source === "admin" ? C.accentText : C.mutedLight) : C.error;
  return (
    <div style={{ padding: 16, border: `1px solid ${C.border}`, borderRadius: 10, backgroundColor: C.card, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.text }}>{label}</div>
          <div style={{ fontSize: "0.72rem", color: sourceColor, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
            {info?.configured ? <CheckCircle sx={{ fontSize: 14, color: C.ok }} /> : <Cancel sx={{ fontSize: 14, color: C.error }} />}
            {sourceLabel}
          </div>
        </div>
        {info?.configured && (
          <code style={{ fontSize: "0.72rem", color: C.mutedLight, backgroundColor: C.bg, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}` }}>
            {info.masked}
          </code>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type={showRaw ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={info?.hasOverride ? "Paste a new key to replace…" : "Paste a new key…"}
          style={{ flex: 1, padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.border}`, backgroundColor: C.bg, color: C.text, fontSize: "0.82rem", fontFamily: "monospace", outline: "none" }}
        />
        <button type="button" onClick={onToggleShow}
          style={{ padding: 8, backgroundColor: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.mutedLight, cursor: "pointer", display: "flex" }}
          title={showRaw ? "Hide" : "Show while typing"}>
          {showRaw ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
        </button>
        <button type="button" disabled={saving || !value.trim()} onClick={onSave}
          style={{ padding: "9px 14px", borderRadius: 6, border: "none", backgroundColor: value.trim() ? C.accent : C.border, color: "#fff", fontSize: "0.78rem", fontWeight: 600, cursor: value.trim() ? "pointer" : "not-allowed", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {info?.hasOverride && (
        <button type="button" onClick={onClear} disabled={saving}
          style={{ marginTop: 8, padding: "5px 10px", borderRadius: 5, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.mutedLight, fontSize: "0.72rem", cursor: "pointer" }}>
          Clear admin override (fall back to env var{info.hasEnv ? "" : " — none configured"})
        </button>
      )}
    </div>
  );
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [flash, setFlash]       = useState(null);
  const [error, setError]       = useState(null);

  // LLM keys
  const [keys, setKeys]           = useState(null);
  const [geminiInput, setGeminiInput] = useState("");
  const [openaiInput, setOpenaiInput] = useState("");
  const [showGemini, setShowGemini]   = useState(false);
  const [showOpenai, setShowOpenai]   = useState(false);
  const [savingGem, setSavingGem]     = useState(false);
  const [savingOai, setSavingOai]     = useState(false);

  // Integrations
  const [integ, setInteg]   = useState(DEFAULT_INTEG);
  const [savingInteg, setSavingInteg] = useState(false);

  // Google SA JSON
  const [saJson, setSaJson] = useState("");
  const saFileRef = useRef(null);

  // Email
  const [emailProvider, setEmailProvider]   = useState("zepto");
  const [zeptoToken, setZeptoToken]         = useState("");
  const [smtpHost, setSmtpHost]             = useState("");
  const [smtpPort, setSmtpPort]             = useState("587");
  const [smtpUser, setSmtpUser]             = useState("");
  const [smtpPass, setSmtpPass]             = useState("");
  const [emailFrom, setEmailFrom]           = useState("");
  const [emailFromName, setEmailFromName]   = useState("");
  const [showSmtpPass, setShowSmtpPass]     = useState(false);

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 3500); };

  useEffect(() => {
    (async () => {
      try {
        const profile = await authService.getProfile();
        setUser(profile);
        if (!profile.isAdmin) { setError("This page is only available to the admin account."); setLoading(false); return; }
        try {
          const keysData = await adminService.getLlmKeys();
          setKeys(keysData.keys);
        } catch (e) {
          setError(e?.response?.data?.error || "Failed to load AI keys.");
        }
        try {
          const integData = await adminService.getIntegrations();
          setInteg(integData);
          if (integData.email) setEmailProvider(integData.email.provider || "zepto");
        } catch (e) {
          setError((prev) => prev || e?.response?.data?.error || "Failed to load integrations.");
          setInteg(DEFAULT_INTEG);
        }
      } catch (e) {
        if (e?.response?.status === 401) { authService.logout(); navigate("/login"); return; }
        setError(e?.response?.data?.error || "Failed to load admin panel.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const saveKey = async (which, value) => {
    setError(null);
    if (which === "gemini") setSavingGem(true); else setSavingOai(true);
    try {
      const payload = which === "gemini" ? { geminiApiKey: value } : { openaiApiKey: value };
      const data = await adminService.updateLlmKeys(payload);
      setKeys(data.keys);
      if (which === "gemini") setGeminiInput(""); else setOpenaiInput("");
      showFlash(`${which === "gemini" ? "Gemini" : "OpenAI"} key ${value ? "updated" : "cleared"}.`);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to save key.");
    } finally {
      if (which === "gemini") setSavingGem(false); else setSavingOai(false);
    }
  };

  const saveIntegrations = async (extra = {}) => {
    setError(null);
    setSavingInteg(true);
    try {
      const payload = {
        emailProvider,
        zeptomailToken: zeptoToken,
        smtpHost, smtpPort, smtpUser, smtpPass,
        emailFrom, emailFromName,
        ...extra,
      };
      const data = await adminService.updateIntegrations(payload);
      setInteg({ google: data.google, email: data.email });
      if (extra.googleServiceAccountJson !== undefined) setSaJson("");
      showFlash("Settings saved.");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to save settings.");
    } finally {
      setSavingInteg(false);
    }
  };

  const saveGoogleJson = () => {
    if (!saJson.trim()) return;
    try { JSON.parse(saJson.trim()); } catch (_) { setError("The JSON you pasted is not valid. Copy the full contents of the .json file including the outer { }."); return; }
    saveIntegrations({ googleServiceAccountJson: saJson.trim() });
  };

  const clearGoogleJson = () => saveIntegrations({ googleServiceAccountJson: "" });

  const handleSaFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").trim();
      try {
        JSON.parse(text);
        setSaJson(text);
        setError(null);
        showFlash(`Loaded ${file.name}. Click Save JSON to apply.`);
      } catch (_) {
        setError("That file is not valid JSON. Download the key again from Google Cloud (Keys → Add key → JSON).");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.mutedLight, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>Loading…</div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: C.bg, color: C.text, fontFamily: font, overflowY: "auto" }}>
    <div style={{ padding: "32px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        <button type="button" onClick={() => navigate("/projects")}
          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6, backgroundColor: "transparent", color: C.mutedLight, cursor: "pointer", fontSize: "0.78rem" }}>
          <ArrowBack sx={{ fontSize: 16 }} /> Back to projects
        </button>

        <h1 style={{ fontSize: "1.4rem", margin: "0 0 4px" }}>Admin panel</h1>
        <p style={{ color: C.mutedLight, fontSize: "0.85rem", margin: "0 0 28px" }}>
          All settings saved here are stored in the database and take effect immediately — no server restart or environment variable needed.
        </p>

        {flash && <div style={{ padding: "10px 14px", borderRadius: 6, backgroundColor: "rgba(52,168,83,0.12)", border: `1px solid ${C.ok}`, color: C.ok, fontSize: "0.82rem", marginBottom: 16 }}>{flash}</div>}
        {error && <div style={{ padding: "10px 14px", borderRadius: 6, backgroundColor: "rgba(248,113,113,0.12)", border: `1px solid ${C.error}`, color: C.error, fontSize: "0.82rem", marginBottom: 16 }}>{error}</div>}

        {/* ── AI / LLM Keys ──────────────────────────────────────────────── */}
        <div style={{ backgroundColor: C.card, borderRadius: 12, padding: "20px 22px", border: `1px solid ${C.border}`, marginBottom: 20 }}>
          <SectionHeader title="AI keys" sub="Used by the chat and project assistants. Keys saved here override the server environment variables." />
          {keys && (
            <>
              <KeyRow label="Gemini API key" info={keys.gemini} value={geminiInput} onChange={setGeminiInput}
                onSave={() => saveKey("gemini", geminiInput.trim())} onClear={() => saveKey("gemini", "")}
                saving={savingGem} showRaw={showGemini} onToggleShow={() => setShowGemini(s => !s)} />
              <KeyRow label="OpenAI API key" info={keys.openai} value={openaiInput} onChange={setOpenaiInput}
                onSave={() => saveKey("openai", openaiInput.trim())} onClear={() => saveKey("openai", "")}
                saving={savingOai} showRaw={showOpenai} onToggleShow={() => setShowOpenai(s => !s)} />
              <div style={{ marginTop: 8, padding: 12, border: `1px dashed ${C.border}`, borderRadius: 8, color: C.mutedLight, fontSize: "0.73rem", lineHeight: 1.6 }}>
                <strong style={{ color: C.text }}>Key resolution order:</strong> Admin panel → environment variable → error.{" "}
                Get a Gemini key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: C.accentText }}>aistudio.google.com/apikey</a>.
                OpenAI at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ color: C.accentText }}>platform.openai.com/api-keys</a>.
              </div>
            </>
          )}
        </div>

        {/* ── Google Service Account ─────────────────────────────────────── */}
        <div style={{ backgroundColor: C.card, borderRadius: 12, padding: "20px 22px", border: `1px solid ${C.border}`, marginBottom: 20 }}>
          <SectionHeader title="Google Sheets integration" sub="Required for Sheet assistant mode — lets users edit Google Sheets via chat prompts. Paste or upload the JSON key from Google Cloud Console." />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <StatusBadge configured={integ.google?.configured} source={integ.google?.source} />
            {integ.google?.clientEmail && (
              <code style={{ fontSize: "0.72rem", color: C.mutedLight, backgroundColor: C.bg, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}` }}>
                {integ.google.clientEmail}
              </code>
            )}
          </div>

          <FieldRow label="Service account JSON" hint='Paste the entire .json file contents, or use Upload JSON file. Saved to the database — no server restart needed.'>
            <textarea
              value={saJson}
              onChange={(e) => setSaJson(e.target.value)}
              placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  "client_email": "..."\n}'}
              rows={6}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.border}`, backgroundColor: C.bg, color: C.text, fontSize: "0.78rem", fontFamily: "monospace", lineHeight: 1.5, resize: "vertical", outline: "none" }}
            />
          </FieldRow>

          <input ref={saFileRef} type="file" accept=".json,application/json" hidden onChange={handleSaFile} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={() => saFileRef.current?.click()}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 6, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.mutedLight, fontSize: "0.78rem", cursor: "pointer" }}>
              <UploadFile sx={{ fontSize: 16 }} /> Upload JSON file
            </button>
            <SaveBtn onClick={saveGoogleJson} disabled={!saJson.trim()} saving={savingInteg} label="Save JSON" />
            {integ.google?.hasOverride && (
              <button type="button" onClick={clearGoogleJson} disabled={savingInteg}
                style={{ padding: "9px 14px", borderRadius: 6, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.mutedLight, fontSize: "0.78rem", cursor: "pointer" }}>
                Clear (fall back to env var{integ.google?.hasEnv ? "" : " — none set"})
              </button>
            )}
          </div>

          <div style={{ marginTop: 14, padding: 12, border: `1px dashed ${C.border}`, borderRadius: 8, color: C.mutedLight, fontSize: "0.73rem", lineHeight: 1.7 }}>
            <strong style={{ color: C.text }}>How to get a service account JSON:</strong>
            <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              <li>Go to <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noreferrer" style={{ color: C.accentText }}>Google Cloud Console → IAM → Service Accounts</a></li>
              <li>Enable <strong style={{ color: C.text }}>Google Sheets API</strong> under APIs &amp; Services → Library</li>
              <li>Create or select a service account → <strong style={{ color: C.text }}>Keys → Add key → Create new key (JSON)</strong></li>
              <li>Upload or paste the downloaded .json file here, then click <strong style={{ color: C.text }}>Save JSON</strong></li>
              <li>Share each Google Sheet with the service account email (Editor access)</li>
            </ol>
          </div>
        </div>

        {/* ── Email / Password Reset ─────────────────────────────────────── */}
        <div style={{ backgroundColor: C.card, borderRadius: 12, padding: "20px 22px", border: `1px solid ${C.border}`, marginBottom: 20 }}>
            <SectionHeader title="Email (password reset)" sub="Used for forgot-password emails. Choose ZeptoMail or standard SMTP." />

            <StatusBadge configured={integ.email?.configured} source={integ.email?.source} />

            {/* Provider selector */}
            <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
              {[{ k: "zepto", l: "ZeptoMail" }, { k: "smtp", l: "SMTP" }].map(opt => (
                <button key={opt.k} type="button"
                  onClick={() => setEmailProvider(opt.k)}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${emailProvider === opt.k ? C.accent : C.border}`, backgroundColor: emailProvider === opt.k ? C.accentDim : "transparent", color: emailProvider === opt.k ? C.accentText : C.mutedLight, cursor: "pointer", fontFamily: font, fontSize: "0.8rem", fontWeight: 600 }}>
                  {opt.l}
                </button>
              ))}
            </div>

            {emailProvider === "zepto" && (
              <>
                <FieldRow label="ZeptoMail API token" hint='The token from your ZeptoMail account (starts with "Zoho-enczapikey" or paste the raw key — either works).'>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type={showSmtpPass ? "text" : "password"} value={zeptoToken} onChange={e => setZeptoToken(e.target.value)}
                      placeholder={integ.email?.hasOverride ? "Paste new token to replace…" : "Paste token…"}
                      style={{ flex: 1, padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.border}`, backgroundColor: C.bg, color: C.text, fontSize: "0.82rem", fontFamily: "monospace", outline: "none" }} />
                    <button type="button" onClick={() => setShowSmtpPass(s => !s)}
                      style={{ padding: 8, backgroundColor: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.mutedLight, cursor: "pointer", display: "flex" }}>
                      {showSmtpPass ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                    </button>
                  </div>
                </FieldRow>
                <FieldRow label="From address" hint="e.g. noreply@rivetglobal.net">
                  <Input value={emailFrom} onChange={setEmailFrom} placeholder="noreply@yourdomain.com" />
                </FieldRow>
                <FieldRow label="From name" hint="Shown as the sender name in the email client.">
                  <Input value={emailFromName} onChange={setEmailFromName} placeholder="Rivet AI" />
                </FieldRow>
              </>
            )}

            {emailProvider === "smtp" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
                  <FieldRow label="SMTP host"><Input value={smtpHost} onChange={setSmtpHost} placeholder="smtp.gmail.com" /></FieldRow>
                  <FieldRow label="Port"><Input value={smtpPort} onChange={setSmtpPort} placeholder="587" /></FieldRow>
                </div>
                <FieldRow label="SMTP username / email">
                  <Input value={smtpUser} onChange={setSmtpUser} placeholder="you@yourdomain.com" />
                </FieldRow>
                <FieldRow label="SMTP password or app password">
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type={showSmtpPass ? "text" : "password"} value={smtpPass} onChange={e => setSmtpPass(e.target.value)}
                      placeholder="••••••••"
                      style={{ flex: 1, padding: "9px 12px", borderRadius: 6, border: `1px solid ${C.border}`, backgroundColor: C.bg, color: C.text, fontSize: "0.82rem", fontFamily: "monospace", outline: "none" }} />
                    <button type="button" onClick={() => setShowSmtpPass(s => !s)}
                      style={{ padding: 8, backgroundColor: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.mutedLight, cursor: "pointer", display: "flex" }}>
                      {showSmtpPass ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                    </button>
                  </div>
                </FieldRow>
                <FieldRow label="From address">
                  <Input value={emailFrom} onChange={setEmailFrom} placeholder="noreply@yourdomain.com" />
                </FieldRow>
                <FieldRow label="From name">
                  <Input value={emailFromName} onChange={setEmailFromName} placeholder="Rivet AI" />
                </FieldRow>
              </>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <SaveBtn onClick={() => saveIntegrations()} saving={savingInteg} label="Save email settings" />
              {integ.email?.hasOverride && (
                <button type="button" onClick={() => saveIntegrations({ zeptomailToken: "", smtpHost: "", smtpPort: "", smtpUser: "", smtpPass: "", emailFrom: "", emailFromName: "", emailProvider: "" })} disabled={savingInteg}
                  style={{ padding: "9px 14px", borderRadius: 6, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.mutedLight, fontSize: "0.78rem", cursor: "pointer" }}>
                  Clear all (fall back to env vars)
                </button>
              )}
            </div>
          </div>

      </div>
    </div>
    </div>
  );
};

export default AdminPanel;
