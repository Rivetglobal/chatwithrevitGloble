import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import authService from "../../services/authService";
import rivetLogo from "../../assets/rivetGlobalpng.png";

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setValid(false);
      return;
    }
    authService.verifyResetToken(token)
      .then(({ valid }) => setValid(!!valid))
      .catch(() => setValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#dbeafe 0%,#fce7f3 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: font, padding: 16, position: "relative",
    }}>
      <button
        type="button"
        onClick={() => navigate("/login")}
        style={{
          position: "absolute", top: 24, left: 24,
          background: "rgba(255,255,255,0.7)", border: "none", borderRadius: 8,
          padding: "8px 14px", display: "flex", alignItems: "center", gap: 6,
          cursor: "pointer", color: "#1f2937", fontSize: "0.85rem", fontWeight: 500,
        }}
      >
        <ArrowLeft size={16} /> Back to Sign in
      </button>

      <div style={{
        width: "100%", maxWidth: 420, background: "#fff",
        borderRadius: 16, padding: "36px 32px",
        boxShadow: "0 10px 40px rgba(15,23,42,0.12)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: "linear-gradient(135deg,#3b82f6,#2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src={rivetLogo} alt="Rivet" style={{ width: 32, height: 32 }} />
          </div>
        </div>
        <h1 style={{ margin: 0, textAlign: "center", fontSize: "1.4rem", color: "#0f172a" }}>
          Reset password
        </h1>

        {checking ? (
          <p style={{ marginTop: 18, textAlign: "center", color: "#64748b" }}>Checking link…</p>
        ) : !valid ? (
          <div style={{
            marginTop: 18, padding: 16,
            background: "#fef2f2", border: "1px solid #fecaca",
            color: "#b91c1c", borderRadius: 10, fontSize: "0.88rem", lineHeight: 1.5,
          }}>
            This reset link is invalid or has expired. Please request a new one.
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                style={{
                  background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff",
                  border: "none", borderRadius: 8, padding: "10px 16px",
                  fontWeight: 600, cursor: "pointer", fontFamily: font,
                }}
              >
                Request new link
              </button>
            </div>
          </div>
        ) : done ? (
          <div style={{
            marginTop: 18, padding: 16,
            background: "#ecfdf5", border: "1px solid #a7f3d0",
            color: "#065f46", borderRadius: 10, fontSize: "0.88rem",
          }}>
            Password updated. Redirecting you to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
            <p style={{ marginTop: 0, marginBottom: 18, textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
              Choose a new password for your account.
            </p>

            <label style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "#374151", fontWeight: 500 }}>
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
              placeholder="At least 6 characters"
              autoFocus
              style={{
                width: "100%", height: 42, padding: "0 12px",
                border: "1px solid #d1d5db", borderRadius: 10,
                fontSize: "0.92rem", fontFamily: font, outline: "none",
                boxSizing: "border-box", marginBottom: 12,
              }}
            />

            <label style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "#374151", fontWeight: 500 }}>
              Confirm new password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); if (error) setError(""); }}
              placeholder="Repeat password"
              style={{
                width: "100%", height: 42, padding: "0 12px",
                border: "1px solid #d1d5db", borderRadius: 10,
                fontSize: "0.92rem", fontFamily: font, outline: "none",
                boxSizing: "border-box",
              }}
            />

            {error && (
              <div style={{
                marginTop: 12, padding: "10px 12px",
                background: "#fef2f2", color: "#b91c1c",
                border: "1px solid #fecaca", borderRadius: 8,
                fontSize: "0.82rem",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", height: 44, marginTop: 18,
                background: loading ? "#93c5fd" : "linear-gradient(135deg,#3b82f6,#2563eb)",
                color: "#fff", fontWeight: 700, fontSize: "0.95rem",
                border: "none", borderRadius: 10,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: font,
                boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
              }}
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
