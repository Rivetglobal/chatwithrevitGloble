import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import authService from "../../services/authService";
import AuthLayout, {
  AuthAlert,
  AuthLink,
  AuthSubmit,
} from "../Layout/AuthLayout";
import { authBlur, authField, authFocus, authLabel } from "../Layout/authStyles";

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
    <AuthLayout
      title="Reset your password"
      subtitle={submitted ? "Check your inbox for the next step." : "Enter the email on your account and we will send a reset link."}
      backLabel="Back to sign in"
      onBack={() => navigate("/login")}
      footer={
        <>
          Remembered it? <AuthLink onClick={() => navigate("/login")}>Sign in</AuthLink>
        </>
      }
    >
      {error && <AuthAlert>{error}</AuthAlert>}

      {!submitted ? (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={authLabel}>Email address</label>
            <div style={{ position: "relative" }}>
              <Mail size={16} style={{ position: "absolute", left: 13, top: 14, color: "#94A3B8" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                placeholder="you@organisation.co.uk"
                autoFocus
                style={authField}
                onFocus={authFocus}
                onBlur={authBlur}
              />
            </div>
          </div>
          <AuthSubmit loading={loading}>Send reset link</AuthSubmit>
        </form>
      ) : (
        <AuthAlert tone="ok">
          If an account exists for <strong>{email}</strong>, you will receive a password reset email shortly. The link expires in 60 minutes.
        </AuthAlert>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
