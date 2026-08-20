import { C, font } from "../../theme";

export const authField = {
  width: "100%",
  height: 44,
  padding: "0 12px 0 40px",
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  fontSize: "0.92rem",
  color: C.text,
  background: C.surface,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: font,
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export const authLabel = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: C.mutedLight,
  marginBottom: 6,
  letterSpacing: "0.02em",
};

export const authFocus = (e) => {
  e.target.style.borderColor = C.accent;
  e.target.style.boxShadow = "0 0 0 3px rgba(15,118,110,0.16)";
};

export const authBlur = (e) => {
  e.target.style.borderColor = C.border;
  e.target.style.boxShadow = "none";
};
