import { ReactNode } from "react";
import {
  MessageSquare,
  BarChart3,
  Folder,
  Plus,
  Trash2,
  Send,
} from "lucide-react";

type Conversation = { id: string; title: string; active?: boolean };

const DEFAULT_CONVERSATIONS: Conversation[] = [
  { id: "c1", title: "Medication audit — Ward 4B", active: true },
  { id: "c2", title: "CQC Well-led KLOE evidence" },
  { id: "c3", title: "Safeguarding referral wording" },
  { id: "c4", title: "DoLS renewal checklist" },
];

interface Props {
  children: ReactNode;
  inputPlaceholder?: string;
  showInput?: boolean;
  conversations?: Conversation[];
  username?: string;
  plan?: string;
}

const Logo = ({ size = 26 }: { size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 6,
      background:
        "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 60%, #94a3b8 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      fontFamily: "var(--rv-font)",
    }}
  >
    <svg
      width={size * 0.55}
      height={size * 0.55}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0c1117"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4 L5 20" />
      <path d="M5 12 L19 4" />
      <path d="M5 12 L19 20" />
    </svg>
  </div>
);

export function ChatShell({
  children,
  inputPlaceholder = "Ask anything about NHS compliance...",
  showInput = true,
  conversations = DEFAULT_CONVERSATIONS,
  username = "RIVETAI",
  plan = "Free Plan",
}: Props) {
  return (
    <div
      className="rv-root"
      style={{
        height: "100vh",
        backgroundColor: "var(--rv-bg)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--rv-font)",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 52,
          backgroundColor: "var(--rv-surface)",
          borderBottom: "1px solid var(--rv-border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Logo size={26} />
          <span
            style={{
              color: "var(--rv-text)",
              fontWeight: 700,
              fontSize: "0.95rem",
            }}
          >
            Rivet AI
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 12px 6px 8px",
            border: "1px solid var(--rv-border)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              backgroundColor: "var(--rv-accent)",
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            R
          </div>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--rv-text)",
                lineHeight: 1.2,
              }}
            >
              {username}
            </div>
            <div style={{ fontSize: "0.62rem", color: "var(--rv-muted)" }}>
              {plan}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 220,
            minWidth: 220,
            backgroundColor: "var(--rv-sidebar)",
            borderRight: "1px solid var(--rv-border)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "16px 16px 12px",
              borderBottom: "1px solid var(--rv-border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Logo size={28} />
            <span
              style={{
                color: "var(--rv-text)",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "-0.01em",
              }}
            >
              Rivet AI
            </span>
          </div>

          <div style={{ padding: "12px 8px 8px" }}>
            <NavItem icon={<MessageSquare size={16} />} label="Conversations" active />
            <NavItem icon={<BarChart3 size={16} />} label="Dashboard" />
            <NavItem icon={<Folder size={16} />} label="Projects" />
          </div>

          <div
            className="rv-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0 8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 4px 6px",
              }}
            >
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: "var(--rv-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Conversations
              </span>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--rv-muted)",
                  display: "flex",
                  borderRadius: 4,
                  padding: 2,
                }}
              >
                <Plus size={14} />
              </button>
            </div>
            {conversations.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: "7px 8px",
                  borderRadius: 6,
                  marginBottom: 1,
                  cursor: "pointer",
                  backgroundColor: c.active ? "var(--rv-accent-dim)" : "transparent",
                  borderLeft: c.active
                    ? "2px solid var(--rv-accent)"
                    : "2px solid transparent",
                  fontSize: "0.78rem",
                  color: c.active ? "var(--rv-text)" : "var(--rv-muted-light)",
                  fontWeight: c.active ? 500 : 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.title}
              </div>
            ))}
          </div>

          <div
            style={{
              padding: "12px 8px",
              borderTop: "1px solid var(--rv-border)",
            }}
          >
            <button
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--rv-error)",
                fontFamily: "var(--rv-font)",
                fontSize: "0.78rem",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 6,
                opacity: 0.7,
              }}
            >
              <Trash2 size={14} />
              Clear all history
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: "var(--rv-bg)",
          }}
        >
          <div
            className="rv-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {children}
          </div>

          {showInput && (
            <div
              style={{
                padding: "12px 16px 16px",
                borderTop: "1px solid var(--rv-border)",
                backgroundColor: "var(--rv-bg)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "var(--rv-card)",
                  border: "1px solid var(--rv-border)",
                  borderRadius: 10,
                  padding: "10px 14px",
                }}
              >
                <input
                  type="text"
                  placeholder={inputPlaceholder}
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    outline: "none",
                    color: "var(--rv-text)",
                    fontFamily: "var(--rv-font)",
                    fontSize: "0.88rem",
                  }}
                />
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--rv-muted)",
                    display: "flex",
                    padding: 4,
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 10px",
        borderRadius: 8,
        marginBottom: 2,
        cursor: "pointer",
        backgroundColor: active ? "var(--rv-accent-dim)" : "transparent",
        color: active ? "var(--rv-accent-text)" : "var(--rv-muted)",
        userSelect: "none",
      }}
    >
      {icon}
      <span
        style={{
          fontSize: "0.85rem",
          fontWeight: active ? 600 : 400,
        }}
      >
        {label}
      </span>
    </div>
  );
}
