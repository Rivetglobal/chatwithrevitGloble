import React from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Menu, MenuItem, useMediaQuery, useTheme } from "@mui/material";
import {
  AdminPanelSettings,
  Chat as ChatBubbleIcon,
  Close,
  Folder,
  Logout,
  Menu as MenuIcon,
  PersonOutline,
} from "@mui/icons-material";
import authService from "../../services/authService";
import rivetLogo from "../../assets/rivetGlobalpng.png";
import useActivityTracker from "../../hooks/useActivityTracker";
import { C, font, menuPaperSx } from "../../theme";

const NAV_ITEMS = [
  { icon: <ChatBubbleIcon sx={{ fontSize: 18 }} />, label: "Conversations", id: "chat", path: "/chat" },
  { icon: <Folder sx={{ fontSize: 18 }} />, label: "Projects", id: "projects", path: "/projects" },
  { icon: <PersonOutline sx={{ fontSize: 18 }} />, label: "Profile", id: "profile", path: "/profile" },
];

const Sidebar = ({
  active,
  isMobile,
  onClose,
  extra,
  footer,
  navigate,
}) => (
  <aside
    style={{
      width: 248,
      minWidth: 248,
      height: "100%",
      background: `linear-gradient(180deg, ${C.sidebar} 0%, #081c33 100%)`,
      borderRight: `1px solid ${C.sidebarBorder}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: font,
      color: C.sidebarText,
    }}
  >
    <div
      style={{
        padding: "18px 16px 16px",
        borderBottom: `1px solid ${C.sidebarBorder}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <img
        src={rivetLogo}
        alt=""
        style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", boxShadow: "0 0 0 1px rgba(255,255,255,0.12)" }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          Rivet AI
        </div>
        <div style={{ fontSize: "0.68rem", color: C.sidebarMuted, marginTop: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Compliance
        </div>
      </div>
      {isMobile && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.sidebarMuted, display: "flex", padding: 4 }}
        >
          <Close sx={{ fontSize: 18 }} />
        </button>
      )}
    </div>

    <nav style={{ padding: "14px 10px 8px" }}>
      {NAV_ITEMS.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              navigate(item.path);
              if (isMobile) onClose?.();
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 8,
              marginBottom: 4,
              cursor: "pointer",
              border: "none",
              background: selected ? "rgba(13,148,136,0.18)" : "transparent",
              color: selected ? "#5EEAD4" : C.sidebarMuted,
              fontFamily: font,
              fontSize: "0.875rem",
              fontWeight: selected ? 600 : 500,
              textAlign: "left",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!selected) {
                e.currentTarget.style.background = C.sidebarHover;
                e.currentTarget.style.color = C.sidebarText;
              }
            }}
            onMouseLeave={(e) => {
              if (!selected) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = C.sidebarMuted;
              }
            }}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </nav>

    {extra && (
      <div className="rv-scroll" style={{ flex: 1, overflowY: "auto", padding: "4px 10px 8px", minHeight: 0 }}>
        {extra}
      </div>
    )}
    {!extra && <div style={{ flex: 1 }} />}
    {footer && (
      <div style={{ padding: "12px 10px 14px", borderTop: `1px solid ${C.sidebarBorder}` }}>
        {footer}
      </div>
    )}
  </aside>
);

const AppShell = ({
  user,
  active,
  title,
  subtitle,
  loading = false,
  sidebarOpen,
  onSidebarOpenChange,
  sidebarExtra,
  sidebarFooter,
  topBarRight,
  children,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [anchorEl, setAnchorEl] = React.useState(null);
  useActivityTracker(active, !!user && !loading);

  const closeSidebar = () => onSidebarOpenChange?.(false);
  const toggleSidebar = () => onSidebarOpenChange?.((open) => !open);

  const handleLogout = () => {
    setAnchorEl(null);
    authService.logoutAndRedirect(navigate);
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.muted,
          fontFamily: font,
          fontSize: "0.9rem",
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: font,
        overflow: "hidden",
        position: "fixed",
        inset: 0,
      }}
    >
      <header
        style={{
          height: 56,
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px 0 12px",
          gap: 12,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {isMobile && (
          <button
            type="button"
            aria-label="Open menu"
            onClick={toggleSidebar}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 6 }}
          >
            <MenuIcon sx={{ fontSize: 22 }} />
          </button>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.text, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </div>
          )}
        </div>
        {topBarRight}
        <button
          type="button"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            cursor: "pointer",
            color: C.text,
            fontFamily: font,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "5px 12px 5px 6px",
          }}
        >
          <Avatar
            src={user?.picture || undefined}
            sx={{ width: 28, height: 28, backgroundColor: C.sidebar, fontSize: "0.75rem", fontWeight: 700 }}
          >
            {(user?.name || user?.username || "U")[0]?.toUpperCase()}
          </Avatar>
          {!isMobile && (
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: C.text, lineHeight: 1.2, textTransform: "capitalize" }}>
                {user?.name || user?.username}
              </div>
              <div style={{ fontSize: "0.65rem", color: C.muted }}>
                {user?.isAdmin ? "Administrator" : (user?.jobTitle || user?.organisation || "Workspace")}
              </div>
            </div>
          )}
        </button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: menuPaperSx }}
        >
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              navigate("/profile");
            }}
            sx={{ fontFamily: font, fontSize: "0.875rem", gap: 1, color: C.mutedLight, "&:hover": { backgroundColor: C.cardHover, color: C.text } }}
          >
            <PersonOutline sx={{ fontSize: 16 }} /> Profile
          </MenuItem>
          {user?.isAdmin && (
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate("/admin");
              }}
              sx={{ fontFamily: font, fontSize: "0.875rem", gap: 1, color: C.mutedLight, "&:hover": { backgroundColor: C.cardHover, color: C.text } }}
            >
              <AdminPanelSettings sx={{ fontSize: 16 }} /> Admin panel
            </MenuItem>
          )}
          <MenuItem
            onClick={handleLogout}
            sx={{ fontFamily: font, fontSize: "0.875rem", gap: 1, color: C.mutedLight, "&:hover": { backgroundColor: C.cardHover, color: C.text } }}
          >
            <Logout sx={{ fontSize: 16 }} /> Sign out
          </MenuItem>
        </Menu>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {isMobile && sidebarOpen && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex" }}>
            <Sidebar
              active={active}
              isMobile
              onClose={closeSidebar}
              extra={sidebarExtra}
              footer={sidebarFooter}
              navigate={navigate}
            />
            <div style={{ flex: 1, background: C.overlay }} onClick={closeSidebar} />
          </div>
        )}
        {!isMobile && (
          <Sidebar
            active={active}
            extra={sidebarExtra}
            footer={sidebarFooter}
            navigate={navigate}
          />
        )}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
