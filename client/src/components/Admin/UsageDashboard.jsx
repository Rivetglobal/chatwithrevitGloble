import React, { useEffect, useState } from "react";
import adminService from "../../services/adminService";
import { C, font } from "../../theme";

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 1) return `${h}h ${m}m`;
  if (m >= 1) return `${m} min`;
  return s ? `${s} sec` : "—";
}

function formatHours(seconds) {
  const h = (Number(seconds) || 0) / 3600;
  if (!h) return "0";
  if (h >= 10) return h.toFixed(1);
  if (h >= 1) return h.toFixed(2);
  return h.toFixed(3);
}

function timeAgo(value) {
  if (!value) return "Never";
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return "Never";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

const PERIODS = [
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
  { id: "all", label: "All time" },
];

const card = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: "16px 18px",
};

const UsageDashboard = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const next = await adminService.getDashboard(days);
        if (!cancelled) setData(next);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || "Could not load usage dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [days]);

  const maxTool = Math.max(1, ...(data?.tools || []).map((t) => t.seconds));
  const users = data?.users || [];

  return (
    <div style={{ fontFamily: font }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: C.text }}>Usage dashboard</div>
          <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
            Time each person spends in Chat, Voice, Projects, Profile, and Admin. Ranked by hours.
            Past chat and project activity is included from message history; today uses live tracking.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 999, padding: 3 }}>
          {PERIODS.map((p) => {
            const selected = days === p.id;
            return (
              <button
                key={String(p.id)}
                type="button"
                onClick={() => setDays(p.id)}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontFamily: font,
                  fontSize: "0.75rem",
                  fontWeight: 650,
                  background: selected ? C.surface : "transparent",
                  color: selected ? C.text : C.muted,
                  boxShadow: selected ? "0 1px 2px rgba(15,23,42,0.08)" : "none",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: C.error, fontSize: "0.82rem" }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ color: C.muted, fontSize: "0.85rem", padding: "20px 0" }}>Loading usage…</div>
      )}

      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Total time", value: formatDuration(data.totals?.seconds), sub: `${formatHours(data.totals?.seconds)} hours` },
              { label: "People", value: String(data.totals?.users ?? 0), sub: `${data.totals?.activeUsers || 0} with activity` },
              { label: "Most used", value: data.mostUsed?.label || "—", sub: formatDuration(data.mostUsed?.seconds) },
              { label: "Least used", value: data.leastUsed?.label || "—", sub: formatDuration(data.leastUsed?.seconds) },
            ].map((stat) => (
              <div key={stat.label} style={card}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted }}>{stat.label}</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 750, color: C.text, marginTop: 6 }}>{stat.value}</div>
                <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 3 }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: C.text, marginBottom: 4 }}>Tool ranking</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: 14 }}>Most time at the top. Least used at the bottom.</div>
            {(data.tools || []).map((tool) => (
              <div key={tool.tool} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "0.8rem", marginBottom: 5 }}>
                  <span style={{ fontWeight: 650, color: C.text }}>#{tool.rank} {tool.label}</span>
                  <span style={{ color: C.muted }}>{formatDuration(tool.seconds)} · {(tool.share * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: C.bg, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.max(tool.seconds ? 4 : 0, (tool.seconds / maxTool) * 100)}%`,
                    background: tool.rank === (data.tools || []).length ? "#94A3B8" : C.accent,
                    borderRadius: 999,
                  }} />
                </div>
              </div>
            ))}
            {!data.totals?.seconds && (
              <div style={{ fontSize: "0.8rem", color: C.muted, lineHeight: 1.5 }}>
                No time recorded yet. Rankings fill in from past chats and as people use Chat, Voice, Projects, and Profile.
              </div>
            )}
          </div>

          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px 10px" }}>
              <div style={{ fontSize: "0.92rem", fontWeight: 700, color: C.text }}>Users by time spent</div>
              <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 3 }}>Every account, ranked by hours in this period.</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: C.muted, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
                    {["#", "Person", "Total", "Chat", "Voice", "Projects", "Profile", "Admin", "Last seen"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", fontWeight: 650, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={String(u.id)} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 12px", color: C.muted }}>{u.rank}</td>
                      <td style={{ padding: "10px 12px", minWidth: 180 }}>
                        <div style={{ fontWeight: 650, color: C.text }}>{u.name || u.username}</div>
                        <div style={{ color: C.muted, marginTop: 2 }}>{u.email}{u.isAdmin ? " · admin" : ""}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>{formatDuration(u.totalSeconds)}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatDuration(u.byTool?.chat)}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatDuration(u.byTool?.voice)}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatDuration(u.byTool?.projects)}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatDuration(u.byTool?.profile)}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatDuration(u.byTool?.admin)}</td>
                      <td style={{ padding: "10px 12px", color: C.muted, whiteSpace: "nowrap" }}>{timeAgo(u.lastSeenAt)}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: "18px 12px", color: C.muted }}>No users yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UsageDashboard;
