import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";
import authService from "../../services/authService";
import rivetLogo from "../../assets/rivetGlobalpng.png";

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const fieldStyle = {
  width: "100%",
  padding: "11px 14px 11px 40px",
  backgroundColor: "#f0f5ff",
  border: "1.5px solid #e5e7eb",
  borderRadius: "10px",
  fontSize: "0.9rem",
  fontFamily: font,
  color: "#111827",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  boxSizing: "border-box",
};

const Register = () => {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const focusStyle = (e) => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)"; };
  const blurStyle = (e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.boxShadow = "none"; };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await authService.register(formData);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{
      position: "fixed",
      inset: 0,
      background: "linear-gradient(135deg, #dbeafe 0%, #ede9fe 40%, #fce7f3 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      fontFamily: font,
      padding: "72px 1rem 2rem",
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
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        padding: "2.25rem 2rem",
        width: "100%",
        maxWidth: "420px",
        margin: "auto 0",
        boxSizing: "border-box",
      }}>

        {/* App icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: "16px",
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
          }}>
            <img src={rivetLogo} alt="Rivet AI" style={{ width: 38, height: 38, objectFit: "cover", borderRadius: "8px" }} />
          </div>
        </div>

        {/* Heading */}
        <h1 style={{ textAlign: "center", fontSize: "1.6rem", fontWeight: 700, color: "#111827", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Create Account
        </h1>
        <p style={{ textAlign: "center", fontSize: "0.9rem", color: "#6b7280", margin: "0 0 2rem" }}>
          Join the NHS compliance platform
        </p>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", color: "#ef4444", fontSize: "0.875rem", marginBottom: "1.25rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Username</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", display: "flex" }}>
                <User size={16} />
              </div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="john_smith"
                required
                style={fieldStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Email Address</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", display: "flex" }}>
                <Mail size={16} />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@nhsorg.co.uk"
                required
                style={fieldStyle}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Password</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", display: "flex" }}>
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                required
                style={{ ...fieldStyle, paddingRight: "42px" }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: 0 }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "linear-gradient(135deg, #93c5fd, #60a5fa)" : "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "1rem",
              border: "none",
              borderRadius: "10px",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: font,
              boxShadow: "0 4px 12px rgba(37,99,235,0.35)",
              transition: "opacity 0.15s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.92"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        {/* Login link */}
        <p style={{ textAlign: "center", marginTop: "1.25rem", marginBottom: 0, fontSize: "0.875rem", color: "#6b7280" }}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontFamily: font, fontSize: "inherit", fontWeight: 600 }}
          >
            Sign in
          </button>
        </p>
      </div>

      <style>{`
        input::placeholder { color: #9ca3af; }
        input:-webkit-autofill, input:-webkit-autofill:focus {
          -webkit-text-fill-color: #111827;
          -webkit-box-shadow: 0 0 0px 1000px #f0f5ff inset;
        }
        @media (max-width: 480px) {
          .auth-page { padding: 64px 0.75rem 1.5rem !important; }
          .auth-card { padding: 1.5rem 1.25rem !important; border-radius: 16px !important; }
        }
        @media (max-height: 720px) {
          .auth-card { margin: 0 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default Register;
