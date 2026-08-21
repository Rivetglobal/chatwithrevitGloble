import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
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

const Register = () => {
  const [formData, setFormData] = useState({ name: "", username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { googleBtnRef, googleLoading, googleConfigured } = useGoogleSignIn({
    buttonText: "signup_with",
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
      const response = await authService.register(formData);
      authService.setSession(response.token, response.user, { remember: true });
      navigate("/projects");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Join the Rivet compliance workspace."
      footer={
        <>
          Already have an account?{" "}
          <AuthLink onClick={() => navigate("/login")}>Sign in</AuthLink>
        </>
      }
    >
      <GoogleSignInBlock
        googleBtnRef={googleBtnRef}
        googleLoading={googleLoading}
        googleConfigured={googleConfigured}
        dividerLabel="or register with email"
      />

      {error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={authLabel}>Full name</label>
          <div style={{ position: "relative" }}>
            <User size={16} style={{ position: "absolute", left: 13, top: 14, color: "#94A3B8" }} />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Piyush Modi"
              required
              autoComplete="name"
              style={authField}
              onFocus={authFocus}
              onBlur={authBlur}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={authLabel}>Username</label>
          <div style={{ position: "relative" }}>
            <User size={16} style={{ position: "absolute", left: 13, top: 14, color: "#94A3B8" }} />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="jane.smith"
              required
              style={authField}
              onFocus={authFocus}
              onBlur={authBlur}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={authLabel}>Email address</label>
          <div style={{ position: "relative" }}>
            <Mail size={16} style={{ position: "absolute", left: 13, top: 14, color: "#94A3B8" }} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@nhs.org.uk"
              required
              style={authField}
              onFocus={authFocus}
              onBlur={authBlur}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={authLabel}>Password</label>
          <div style={{ position: "relative" }}>
            <Lock size={16} style={{ position: "absolute", left: 13, top: 14, color: "#94A3B8" }} />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              required
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

        <AuthSubmit loading={loading}>Create account</AuthSubmit>
      </form>
    </AuthLayout>
  );
};

export default Register;
