import React from "react";

const GoogleSignInBlock = ({ googleBtnRef, googleLoading, googleConfigured, dividerLabel = "or use email" }) => (
  <>
    <div style={{ marginBottom: 10, position: "relative", minHeight: 40 }}>
      {!googleConfigured && (
        <div style={{
          padding: "10px 14px", background: "#fef3c7", border: "1px solid #fcd34d",
          borderRadius: 10, color: "#92400e", fontSize: "0.82rem", textAlign: "center",
        }}>
          Google sign-in is not configured. Use email below.
        </div>
      )}
      <div
        ref={googleBtnRef}
        style={{
          display: "flex",
          justifyContent: "center",
          opacity: googleLoading ? 0.5 : 1,
          pointerEvents: googleLoading ? "none" : "auto",
        }}
      />
      {googleLoading && (
        <div style={{ textAlign: "center", marginTop: 8, color: "#6b7280", fontSize: "0.8rem" }}>
          Signing in with Google…
        </div>
      )}
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
      <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{dividerLabel}</span>
      <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
    </div>
  </>
);

export default GoogleSignInBlock;
