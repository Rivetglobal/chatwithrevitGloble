import React from "react";
import { C, font } from "../../theme";

const GoogleSignInBlock = ({ googleBtnRef, googleLoading, googleConfigured, dividerLabel = "or continue with email" }) => (
  <>
    <div style={{ marginBottom: 14, position: "relative", minHeight: 40 }}>
      {!googleConfigured && (
        <div style={{
          padding: "10px 14px",
          background: C.warnBg,
          border: `1px solid ${C.warnBorder}`,
          borderRadius: 10,
          color: C.warn,
          fontSize: "0.82rem",
          textAlign: "center",
          fontFamily: font,
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
        <div style={{ textAlign: "center", marginTop: 8, color: C.muted, fontSize: "0.8rem" }}>
          Signing in with Google…
        </div>
      )}
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: "0.72rem", color: C.muted, letterSpacing: "0.04em", textTransform: "uppercase" }}>{dividerLabel}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  </>
);

export default GoogleSignInBlock;
