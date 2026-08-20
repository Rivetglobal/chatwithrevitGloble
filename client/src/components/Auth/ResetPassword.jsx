import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import authService from "../../services/authService";
import AuthLayout, {
  AuthAlert,
  AuthLink,
  AuthSubmit,
} from "../Layout/AuthLayout";
import { authBlur, authField, authFocus, authLabel } from "../Layout/authStyles";
import { C } from "../../theme";

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
      .then(({ valid: ok }) => setValid(!!ok))
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
    <AuthLayout
      title="Choose a new password"
      subtitle="Use a password you do not reuse elsewhere."
      backLabel="Back to sign in"
      onBack={() => navigate("/login")}
    >
      {checking ? (
        <p style={{ margin: 0, color: C.muted }}>Checking link…</p>
      ) : !valid ? (
        <>
          <AuthAlert>This reset link is invalid or has expired. Please request a new one.</AuthAlert>
          <AuthLink onClick={() => navigate("/forgot-password")}>Request a new link</AuthLink>
        </>
      ) : done ? (
        <AuthAlert tone="ok">Password updated. Redirecting you to sign in…</AuthAlert>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <AuthAlert>{error}</AuthAlert>}
          <div style={{ marginBottom: 14 }}>
            <label style={authLabel}>New password</label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: 13, top: 14, color: "#94A3B8" }} />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                placeholder="At least 6 characters"
                autoFocus
                style={authField}
                onFocus={authFocus}
                onBlur={authBlur}
              />
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={authLabel}>Confirm password</label>
            <div style={{ position: "relative" }}>
              <Lock size={16} style={{ position: "absolute", left: 13, top: 14, color: "#94A3B8" }} />
              <input
                type="password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); if (error) setError(""); }}
                placeholder="Repeat password"
                style={authField}
                onFocus={authFocus}
                onBlur={authBlur}
              />
            </div>
          </div>
          <AuthSubmit loading={loading}>Update password</AuthSubmit>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
