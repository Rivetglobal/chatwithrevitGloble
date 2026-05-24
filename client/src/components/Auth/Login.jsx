import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import authService from "../../services/authService";
import rivetLogo from "../../assets/rivetGlobalpng.png";

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;

    const handleGoogleCredential = async (response) => {
      setGoogleLoading(true);
      setError("");
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Google sign-in failed");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/chat");
      } catch (err) {
        setError(err.message || "Google sign-in failed. Please try again.");
        setGoogleLoading(false);
      }
    };

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
        use_fedcm_for_prompt: false,
      });
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 360,
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) {
        script.addEventListener("load", initGoogle);
        return () => script.removeEventListener("load", initGoogle);
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await authService.login(formData);
      if (remember) {
        localStorage.setItem("rememberMe", "true");
      }
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const inputFocus = (e) => {
    e.target.style.borderColor = "#3b82f6";
    e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.18)";
  };
  const inputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
    e.target.style.boxShadow = "none";
  };

  return (
    <div className="auth-page" style={{
      position: "fixed",
      inset: 0,
      background: "linear-gradient(135deg, #dbeafe 0%, #ede9fe 40%, #fce7f3 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: font,
      padding: "12px 1rem",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      boxSizing: "border-box",
    }}>

      {/* Back link */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10 }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
            border: "none", cursor: "pointer",
            color: "#374151", fontFamily: font, fontSize: "0.85rem",
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 12px", borderRadius: 8,
          }}
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
      </div>

      {/* Card */}
      <div className="auth-card" style={{
        background: "#fff",
        borderRadius: "16px",
        boxShadow: "0 12px 48px rgba(0,0,0,0.10)",
        padding: "20px 24px",
        width: "100%",
        maxWidth: 420,
        boxSizing: "border-box",
      }}>

        {/* App icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg,#3b82f6,#2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(59,130,246,0.4)",
          }}>
            <img src={rivetLogo} alt="Rivet AI" style={{ width: 26, height: 26, objectFit: "cover", borderRadius: "6px" }} />
          </div>
        </div>

        <h1 style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: 700, color: "#111827", margin: "0 0 2px", letterSpacing: "-0.02em" }}>
          Welcome Back
        </h1>
        <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#6b7280", margin: "0 0 14px" }}>
          Sign in to your account
        </p>

        {/* Google SSO — official Google button */}
        <div style={{ marginBottom: 10, position: "relative", minHeight: 40 }}>
          {!GOOGLE_CLIENT_ID && (
            <div style={{
              padding: "10px 14px", background: "#fef3c7", border: "1px solid #fcd34d",
              borderRadius: 10, color: "#92400e", fontSize: "0.82rem", textAlign: "center",
            }}>
              Google sign-in is not configured. Use email below.
            </div>
          )}
          <div
            ref={googleBtnRef}
            style={{ display: "flex", justifyContent: "center", opacity: googleLoading ? 0.5 : 1, pointerEvents: googleLoading ? "none" : "auto" }}
          />
          {googleLoading && (
            <div style={{ textAlign: "center", marginTop: 8, color: "#6b7280", fontSize: "0.8rem" }}>
              Signing in with Google…
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>or use email</span>
          <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
        </div>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "10px 14px", color: "#ef4444",
            fontSize: "0.875rem", marginBottom: 16, textAlign: "center",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
                style={{
                  width: "100%", height: 42, padding: "0 12px 0 38px",
                  border: "1.5px solid #d1d5db", borderRadius: 10,
                  fontSize: "0.9rem", color: "#111827",
                  background: "#f9fafb", outline: "none",
                  boxSizing: "border-box", fontFamily: font,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: "100%", height: 42, padding: "0 44px 0 38px",
                  border: "1.5px solid #d1d5db", borderRadius: 10,
                  fontSize: "0.9rem", color: "#111827",
                  background: "#f9fafb", outline: "none",
                  boxSizing: "border-box", fontFamily: font,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 0, top: 0, height: 42, width: 40,
                  background: "none", border: "none", cursor: "pointer",
                  color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {showPassword
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {/* Remember me + Forgot password */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.8rem", color: "#374151", userSelect: "none" }}>
              <div
                onClick={() => setRemember(!remember)}
                style={{
                  width: 34, height: 20, borderRadius: 10,
                  background: remember ? "#3b82f6" : "#d1d5db",
                  position: "relative", transition: "background 0.2s",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 3, left: remember ? 17 : 3,
                  width: 14, height: 14, borderRadius: "50%", background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s",
                }} />
              </div>
              Remember me
            </label>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontFamily: font, fontSize: "0.78rem", fontWeight: 500, padding: 0 }}
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", height: 44,
              background: loading ? "#93c5fd" : "linear-gradient(135deg,#3b82f6,#2563eb)",
              color: "#fff", fontWeight: 700, fontSize: "0.95rem",
              border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: font, boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.92"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            {loading ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                  </path>
                </svg>
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 12, marginBottom: 0, fontSize: "0.8rem", color: "#6b7280" }}>
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontFamily: font, fontSize: "inherit", fontWeight: 600, padding: 0 }}
          >
            Sign up
          </button>
        </p>
      </div>

      <style>{`
        input::placeholder { color: #9ca3af; }
        input:-webkit-autofill, input:-webkit-autofill:focus {
          -webkit-text-fill-color: #111827;
          -webkit-box-shadow: 0 0 0px 1000px #f9fafb inset;
        }
        @media (max-width: 480px) {
          .auth-page { padding: 64px 0.75rem 1.5rem !important; }
          .auth-card { padding: 24px 20px !important; border-radius: 16px !important; }
        }
        @media (max-height: 720px) {
          .auth-card { margin: 0 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default Login;
