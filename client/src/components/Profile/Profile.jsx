import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import authService from "../../services/authService";
import AppShell from "../Layout/AppShell";
import { C, font } from "../../theme";

const EMPTY = {
  name: "",
  username: "",
  email: "",
  organisation: "",
  jobTitle: "",
  phone: "",
};

const Field = ({ label, required, hint, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 650, color: C.mutedLight, marginBottom: 6 }}>
      {label}
      {required && <span style={{ color: C.error, marginLeft: 4 }}>*</span>}
    </label>
    {children}
    {hint && <div style={{ fontSize: "0.68rem", color: C.muted, marginTop: 5, lineHeight: 1.45 }}>{hint}</div>}
  </div>
);

const inputSx = (disabled) => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  backgroundColor: disabled ? C.cardHover : C.bg,
  color: C.text,
  fontSize: "0.88rem",
  fontFamily: font,
  outline: "none",
});

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await authService.getProfile();
        if (cancelled) return;
        setUser(profile);
        setForm({
          name: profile.name || "",
          username: profile.username || "",
          email: profile.email || "",
          organisation: profile.organisation || "",
          jobTitle: profile.jobTitle || "",
          phone: profile.phone || "",
        });
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          authService.logoutAndRedirect(navigate);
          return;
        }
        if (!cancelled) setError(e?.response?.data?.error || "Could not load your profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (error) setError("");
    if (flash) setFlash("");
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setFlash("");
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError("Full name is required.");
      return;
    }
    if (!form.username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const updated = await authService.updateProfile(payload);
      setUser(updated);
      setForm({
        name: updated.name || "",
        username: updated.username || "",
        email: updated.email || "",
        organisation: updated.organisation || "",
        jobTitle: updated.jobTitle || "",
        phone: updated.phone || "",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFlash("Profile saved.");
    } catch (err) {
      setError(err?.response?.data?.error || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const googleAccount = user?.authProvider === "google";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <AppShell
      user={user}
      active="profile"
      title="Profile"
      subtitle="Your account details"
      loading={loading}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
    >
      <div className="rv-scroll" style={{ flex: 1, overflowY: "auto", padding: "28px 24px 48px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: font }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 22,
            padding: "16px 18px",
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
          }}>
            <Avatar
              src={user?.picture || undefined}
              sx={{ width: 56, height: 56, backgroundColor: C.sidebar, fontWeight: 700, fontSize: "1.2rem" }}
            >
              {(form.name || form.username || "U")[0]?.toUpperCase()}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: C.text }}>
                {form.name || form.username || "Your profile"}
              </div>
              <div style={{ fontSize: "0.8rem", color: C.muted, marginTop: 3 }}>
                {form.email}
                {user?.isAdmin ? " · Administrator" : ""}
                {googleAccount ? " · Google" : " · Email sign-in"}
              </div>
              {memberSince && (
                <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 2 }}>Member since {memberSince}</div>
              )}
            </div>
          </div>

          <form onSubmit={save}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.text, marginBottom: 4 }}>Required</div>
              <div style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 16 }}>These are used across Rivet for your account and Voice sessions.</div>

              <Field label="Full name" required hint="Shown in the app header. Use the name colleagues know you by.">
                <input value={form.name} onChange={setField("name")} placeholder="Piyush Modi" required autoComplete="name" style={inputSx()} />
              </Field>
              <Field label="Username" required hint="Unique login handle. 3–32 letters, numbers, dots, hyphens, or underscores.">
                <input value={form.username} onChange={setField("username")} placeholder="piyushmodi" required autoComplete="username" style={inputSx()} />
              </Field>
              <Field
                label="Email"
                required
                hint={googleAccount ? "Managed by Google for this account." : "Used to sign in and for password reset."}
              >
                <input
                  type="email"
                  value={form.email}
                  onChange={setField("email")}
                  placeholder="you@nhs.org.uk"
                  required
                  autoComplete="email"
                  disabled={googleAccount}
                  style={inputSx(googleAccount)}
                />
              </Field>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", marginBottom: 16 }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.text, marginBottom: 4 }}>Workplace</div>
              <div style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 16 }}>Optional, but useful for NHS compliance context.</div>

              <Field label="Organisation / trust">
                <input value={form.organisation} onChange={setField("organisation")} placeholder="e.g. Rivet Global, NHS trust" autoComplete="organization" style={inputSx()} />
              </Field>
              <Field label="Job title">
                <input value={form.jobTitle} onChange={setField("jobTitle")} placeholder="e.g. Compliance lead" autoComplete="organization-title" style={inputSx()} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={setField("phone")} placeholder="Optional contact number" autoComplete="tel" style={inputSx()} />
              </Field>
            </div>

            {(!googleAccount || user?.hasPassword) && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.text, marginBottom: 4 }}>Password</div>
                <div style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 16 }}>Leave blank to keep your current password.</div>
                <Field label="Current password">
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      style={{ ...inputSx(), paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute", right: 8, top: 8, background: "none", border: "none",
                        cursor: "pointer", color: C.muted, display: "flex",
                      }}
                    >
                      {showPw ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </button>
                  </div>
                </Field>
                <Field label="New password">
                  <input
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    style={inputSx()}
                  />
                </Field>
                <Field label="Confirm new password">
                  <input
                    type={showPw ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    style={inputSx()}
                  />
                </Field>
              </div>
            )}

            {error && (
              <div style={{
                marginBottom: 14, padding: "10px 14px", borderRadius: 8,
                backgroundColor: "#FEF2F2", border: "1px solid #FECACA",
                color: C.error, fontSize: "0.82rem", lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}
            {flash && (
              <div style={{
                marginBottom: 14, padding: "10px 14px", borderRadius: 8,
                backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0",
                color: C.ok, fontSize: "0.82rem", lineHeight: 1.5,
              }}>
                {flash}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "11px 22px",
                borderRadius: 8,
                border: "none",
                background: saving ? C.border : C.accent,
                color: "#fff",
                fontFamily: font,
                fontWeight: 650,
                fontSize: "0.9rem",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
};

export default Profile;
