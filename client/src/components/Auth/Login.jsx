import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import authService from "../../services/authService";
import GoogleSignInBlock from "./GoogleSignInBlock";
import { useGoogleSignIn } from "../../hooks/useGoogleSignIn";
import AuthLayout, {
  AuthAlert,
  AuthLink,
  AuthSubmit,
} from "../Layout/AuthLayout";
import { authBlur, authField, authFocus, authLabel } from "../Layout/authStyles";
import { C } from "../../theme";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => localStorage.getItem("rememberMe") !== "false");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { googleBtnRef, googleLoading, googleConfigured } = useGoogleSignIn({
    buttonText: "continue_with",
    setError,
  });

  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate("/projects", { replace: true });
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
      const response = await authService.login(formData, remember);
      authService.setSession(response.token, response.user, { remember });
      navigate("/projects");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your Rivet workspace."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <AuthLink onClick={() => navigate("/register")}>Create one</AuthLink>
        </>
      }
    >
      <GoogleSignInBlock
        googleBtnRef={googleBtnRef}
        googleLoading={googleLoading}
        googleConfigured={googleConfigured}
      />

      {error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={authLabel}>Email address</label>
          <div style={{ position: "relative" }}>
            <Mail size={16} style={{ position: "absolute", left: 13, top: 14, color: "#94A3B8" }} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@organisation.co.uk"
              required
              autoComplete="email"
              style={authField}
              onFocus={authFocus}
              onBlur={authBlur}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={authLabel}>Password</label>
          <div style={{ position: "relative" }}>
            <Lock size={16} style={{ position: "absolute", left: 13, top: 14, color: "#94A3B8" }} />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{ ...authField, paddingRight: 44 }}
              onFocus={authFocus}
              onBlur={authBlur}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                height: 44,
                width: 42,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.82rem", color: C.mutedLight, userSelect: "none" }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
              style={{ accentColor: C.accent, width: 15, height: 15 }}
            />
            Stay signed in
          </label>
          <AuthLink onClick={() => navigate("/forgot-password")}>Forgot password?</AuthLink>
        </div>

        <AuthSubmit loading={loading}>Sign in</AuthSubmit>
      </form>
    </AuthLayout>
  );
};

export default Login;
