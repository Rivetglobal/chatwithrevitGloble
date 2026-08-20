import { createTheme } from "@mui/material/styles";

export const font =
  '"IBM Plex Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

export const C = {
  bg: "#F4F6F8",
  sidebar: "#0B2545",
  sidebarHover: "rgba(255,255,255,0.06)",
  sidebarBorder: "rgba(255,255,255,0.08)",
  sidebarText: "#F8FAFC",
  sidebarMuted: "#8BA3C1",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardHover: "#F8FAFC",
  border: "#E2E8F0",
  accent: "#0F766E",
  accentHover: "#0D9488",
  accentDim: "rgba(15,118,110,0.10)",
  accentText: "#0F766E",
  text: "#0F172A",
  muted: "#64748B",
  mutedLight: "#475569",
  error: "#DC2626",
  ok: "#059669",
  warn: "#B45309",
  warnBg: "#FFFBEB",
  warnBorder: "#FDE68A",
  userBubble: "#0B2545",
  userBubbleBorder: "#0B2545",
  userBubbleText: "#F8FAFC",
  aiBubble: "#FFFFFF",
  aiBubbleBorder: "#E2E8F0",
  overlay: "rgba(11,37,69,0.45)",
  shadow: "0 1px 2px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.06)",
};

export const dialogPaperSx = {
  backgroundColor: C.card,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: "12px",
  boxShadow: "0 20px 48px rgba(15,23,42,0.14)",
  fontFamily: font,
};

export const menuPaperSx = {
  backgroundColor: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: "10px",
  color: C.text,
  minWidth: 188,
  fontFamily: font,
  boxShadow: "0 12px 32px rgba(15,23,42,0.12)",
};

export const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: C.accent },
    secondary: { main: C.sidebar },
    error: { main: C.error },
    success: { main: C.ok },
    warning: { main: C.warn },
    background: { default: C.bg, paper: C.surface },
    text: { primary: C.text, secondary: C.muted },
    divider: C.border,
  },
  typography: {
    fontFamily: font,
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: C.bg, color: C.text },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { boxShadow: "none", "&:hover": { boxShadow: "none" } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: C.surface,
          "& fieldset": { borderColor: C.border },
          "&:hover fieldset": { borderColor: "#CBD5E1" },
          "&.Mui-focused fieldset": { borderColor: C.accent },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { color: C.muted } },
    },
    MuiDialog: {
      styleOverrides: { paper: dialogPaperSx },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: C.sidebar,
          fontSize: "0.75rem",
          fontFamily: font,
        },
      },
    },
  },
});
