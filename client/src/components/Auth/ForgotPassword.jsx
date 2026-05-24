import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import authService from "../../services/authService";
import rivetLogo from "../../assets/rivetGlobalpng.png";

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not send reset email. Please try again.");
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
          Forgot password?
        </h1>
        <p style={{ marginTop: 8, marginBottom: 24, textAlign: "center", color: "#64748b", fontSize: "0.88rem" }}>
          {submitted
            ? "Check your inbox for a reset link."
            : "Enter your email and we will send you a reset link."}
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", marginBottom: 6, fontSize: "0.85rem", color: "#374151", fontWeight: 500 }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
              placeholder="you@example.com"
              autoFocus
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
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        ) : (
          <div style={{
            padding: 16, background: "#ecfdf5", border: "1px solid #a7f3d0",
            color: "#065f46", borderRadius: 10, fontSize: "0.88rem", lineHeight: 1.5,
          }}>
            If an account exists for <strong>{email}</strong>, you'll receive a password reset email shortly. The link expires in 60 minutes.
          </div>
        )}

        <div style={{ marginTop: 18, textAlign: "center", fontSize: "0.82rem", color: "#64748b" }}>
          Remember your password?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: font }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
