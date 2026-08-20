import React from "react";
import { ShieldCheck, LockKeyhole, FileCheck2, ArrowLeft } from "lucide-react";
import rivetLogo from "../../assets/rivetGlobalpng.png";
import { C, font } from "../../theme";

const TRUST = [
  { icon: ShieldCheck, label: "Built for NHS compliance workflows" },
  { icon: LockKeyhole, label: "Encrypted sessions and controlled access" },
  { icon: FileCheck2, label: "Grounded answers from your own sources" },
];

const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  backLabel,
  onBack,
  maxWidth = 420,
}) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      display: "grid",
      gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
      fontFamily: font,
      background: C.surface,
    }}
    className="auth-shell"
  >
    <section
      className="auth-brand rv-auth-pattern"
      style={{
        position: "relative",
        background: "linear-gradient(165deg, #0B2545 0%, #0A1B33 55%, #082F2B 100%)",
        color: "#F8FAFC",
        padding: "48px 56px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(13,148,136,0.28) 0%, transparent 70%)",
          top: -80,
          right: -60,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
        <img src={rivetLogo} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.03em" }}>Rivet AI</div>
          <div style={{ fontSize: "0.75rem", color: "#8BA3C1", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Healthcare intelligence
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", maxWidth: 480 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#5EEAD4", margin: "0 0 16px" }}>
          Compliance House
        </p>
        <h1 style={{ fontSize: "2.35rem", fontWeight: 650, letterSpacing: "-0.035em", lineHeight: 1.15, margin: "0 0 16px" }}>
          Professional AI for NHS governance and care quality.
        </h1>
        <p style={{ fontSize: "1.02rem", lineHeight: 1.6, color: "#C5D4E8", margin: 0, maxWidth: 440 }}>
          Ask about CQC, NICE, Right to Work, and policy documents — then keep the work in projects grounded in your files.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "36px 0 0", display: "flex", flexDirection: "column", gap: 14 }}>
          {TRUST.map((item) => (
            <li key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, color: "#E2E8F0", fontSize: "0.92rem" }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "rgba(94,234,212,0.12)",
                  border: "1px solid rgba(94,234,212,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {React.createElement(item.icon, { size: 16, color: "#5EEAD4" })}
              </span>
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <p style={{ margin: 0, fontSize: "0.75rem", color: "#8BA3C1", position: "relative" }}>
        Rivet Global · Confidential workspace
      </p>
    </section>

    <section
      className="auth-form-pane"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
        overflowY: "auto",
        background: C.bg,
      }}
    >
      <div className="auth-card" style={{ width: "100%", maxWidth, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow, padding: "32px 32px 28px" }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.muted,
              fontFamily: font,
              fontSize: "0.82rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
              marginBottom: 20,
            }}
          >
            <ArrowLeft size={15} />
            {backLabel || "Back"}
          </button>
        )}
        <h2 style={{ margin: "0 0 6px", fontSize: "1.45rem", fontWeight: 700, letterSpacing: "-0.03em", color: C.text }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: "0 0 22px", color: C.muted, fontSize: "0.9rem", lineHeight: 1.5 }}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {footer && (
        <div style={{ marginTop: 18, fontSize: "0.85rem", color: C.muted, textAlign: "center" }}>
          {footer}
        </div>
      )}
    </section>

    <style>{`
      input::placeholder { color: #94a3b8; }
      input:-webkit-autofill, input:-webkit-autofill:focus {
        -webkit-text-fill-color: ${C.text};
        -webkit-box-shadow: 0 0 0px 1000px #fff inset;
      }
      @media (max-width: 900px) {
        .auth-shell {
          grid-template-columns: 1fr !important;
        }
        .auth-brand { display: none !important; }
        .auth-form-pane { padding: 24px 16px 40px !important; }
      }
    `}</style>
  </div>
);

export const AuthSubmit = ({ loading, children, disabled }) => (
  <button
    type="submit"
    disabled={disabled || loading}
    style={{
      width: "100%",
      height: 46,
      background: loading ? "#99F6E4" : C.accent,
      color: "#fff",
      fontWeight: 650,
      fontSize: "0.95rem",
      border: "none",
      borderRadius: 10,
      cursor: loading || disabled ? "not-allowed" : "pointer",
      fontFamily: font,
      letterSpacing: "-0.01em",
    }}
  >
    {loading ? "Please wait…" : children}
  </button>
);

export const AuthAlert = ({ tone = "error", children }) => {
  const styles =
    tone === "ok"
      ? { bg: "#ECFDF5", border: "#A7F3D0", color: "#065F46" }
      : { bg: "#FEF2F2", border: "#FECACA", color: "#B91C1C" };
  return (
    <div
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        color: styles.color,
        fontSize: "0.85rem",
        marginBottom: 16,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
};

export const AuthLink = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      color: C.accent,
      fontFamily: font,
      fontSize: "inherit",
      fontWeight: 650,
      padding: 0,
    }}
  >
    {children}
  </button>
);

export default AuthLayout;
