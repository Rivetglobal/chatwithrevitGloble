import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Menu, MenuItem, useTheme, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
} from "@mui/material";
import {
  Logout, Menu as MenuIcon, Close, AdminPanelSettings,
  Chat as ChatBubbleIcon, BarChart, Folder, Add, Delete,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import authService from "../../services/authService";
import projectService from "../../services/projectService";
import rivetLogo from "../../assets/rivetGlobalpng.png";

const C = {
  bg: "#0c1117", sidebar: "#111827", surface: "#131929",
  card: "#1a2234", cardHover: "#1f2a40", border: "#1e2d45",
  accent: "#5b8dee", accentDim: "rgba(91,141,238,0.12)", accentText: "#93c5fd",
  text: "#f1f5f9", muted: "#64748b", mutedLight: "#94a3b8", error: "#f87171",
};
const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const NAV_ITEMS = [
  { icon: <ChatBubbleIcon sx={{ fontSize: 18 }} />, label: "Conversations", id: "chat", path: "/chat" },
  { icon: <Folder sx={{ fontSize: 18 }} />, label: "Projects", id: "projects", path: "/projects" },
];

const Projects = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await authService.getProfile();
        setUser(profile);
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          authService.logout(); navigate("/login"); return;
        }
      }
      try {
        const data = await projectService.list();
        setProjects(data.projects || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const handleLogout = () => { authService.logout(); navigate("/login"); };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { project } = await projectService.create(newName.trim(), newDesc.trim());
      navigate(`/projects/${project._id}`);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await projectService.remove(deleteId);
      setProjects((p) => p.filter((x) => x._id !== deleteId));
    } catch (e) { console.error(e); }
    setDeleteId(null);
  };

  const Sidebar = () => (
    <div style={{ width: 220, minWidth: 220, backgroundColor: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", fontFamily: font }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
        <img src={rivetLogo} alt="Rivet AI" style={{ width: 28, height: 28, borderRadius: "6px", objectFit: "cover" }} />
        <span style={{ color: C.text, fontWeight: 700, fontSize: "1rem" }}>Rivet AI</span>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 0 }}>
            <Close sx={{ fontSize: 18 }} />
          </button>
        )}
      </div>
      <div style={{ padding: "12px 8px 8px" }}>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              display: "flex", alignItems: "center", gap: "10px", padding: "9px 10px",
              borderRadius: "8px", marginBottom: "2px", cursor: "pointer",
              backgroundColor: item.id === "projects" ? C.accentDim : "transparent",
              color: item.id === "projects" ? C.accentText : C.muted,
              transition: "background-color 0.15s", userSelect: "none",
            }}
            onMouseEnter={(e) => { if (item.id !== "projects") e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={(e) => { if (item.id !== "projects") e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            {item.icon}
            <span style={{ fontSize: "0.875rem", fontWeight: item.id === "projects" ? 600 : 400 }}>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
    </div>
  );

  return (
    <div style={{ height: "100vh", backgroundColor: C.bg, display: "flex", flexDirection: "column", fontFamily: font, overflow: "hidden", position: "fixed", inset: 0 }}>
      <div style={{ height: 52, backgroundColor: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: "12px", flexShrink: 0, zIndex: 10 }}>
        {isMobile && (
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 0 }}>
            <MenuIcon sx={{ fontSize: 20 }} />
          </button>
        )}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src={rivetLogo} alt="Rivet AI" style={{ width: 26, height: 26, borderRadius: "6px", objectFit: "cover" }} />
            <span style={{ color: C.text, fontWeight: 700, fontSize: "0.95rem" }}>Rivet AI</span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={(e) => setAnchorEl(e.currentTarget)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "8px", cursor: "pointer", color: C.text, fontFamily: font, display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px 6px 8px" }}>
          <Avatar sx={{ width: 26, height: 26, backgroundColor: C.accent, fontSize: "0.75rem", fontWeight: 700 }}>{user?.username?.[0]?.toUpperCase()}</Avatar>
          {!isMobile && (
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{user?.username?.toUpperCase()}</div>
              <div style={{ fontSize: "0.65rem", color: C.muted }}>Free Plan</div>
            </div>
          )}
        </button>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text, minWidth: 180, fontFamily: font } }}>
          {user?.isAdmin && (
            <MenuItem onClick={() => { setAnchorEl(null); navigate("/admin"); }} sx={{ fontFamily: font, fontSize: "0.875rem", gap: 1, color: C.mutedLight, "&:hover": { backgroundColor: "rgba(255,255,255,0.05)", color: C.text } }}>
              <AdminPanelSettings sx={{ fontSize: 16 }} /> Admin panel
            </MenuItem>
          )}
          <MenuItem onClick={handleLogout} sx={{ fontFamily: font, fontSize: "0.875rem", gap: 1, color: C.mutedLight, "&:hover": { backgroundColor: "rgba(255,255,255,0.05)", color: C.text } }}>
            <Logout sx={{ fontSize: 16 }} /> Logout
          </MenuItem>
        </Menu>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {isMobile && sidebarOpen && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex" }}>
            <div style={{ flex: "0 0 240px" }}><Sidebar /></div>
            <div style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setSidebarOpen(false)} />
          </div>
        )}
        {!isMobile && <Sidebar />}

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <h1 style={{ color: C.text, fontSize: "1.5rem", fontWeight: 700, margin: "0 0 4px" }}>Projects</h1>
              <p style={{ color: C.muted, fontSize: "0.85rem", margin: 0 }}>Upload files (PDF, Word, Excel, CSV, text) and chat with your data.</p>
            </div>
            <button
              onClick={() => { setNewName(""); setNewDesc(""); setCreateOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: C.accent, color: "#fff", border: "none", borderRadius: "8px", padding: "10px 16px", cursor: "pointer", fontFamily: font, fontWeight: 600, fontSize: "0.85rem" }}
            >
              <Add sx={{ fontSize: 18 }} /> New project
            </button>
          </div>

          {loading ? (
            <div style={{ color: C.muted, fontSize: "0.9rem" }}>Loading…</div>
          ) : projects.length === 0 ? (
            <div style={{ backgroundColor: C.card, border: `1px dashed ${C.border}`, borderRadius: "12px", padding: "40px", textAlign: "center" }}>
              <Folder sx={{ fontSize: 36, color: C.muted, marginBottom: "8px" }} />
              <div style={{ color: C.text, fontWeight: 600, fontSize: "1rem", marginBottom: "4px" }}>No projects yet</div>
              <p style={{ color: C.muted, fontSize: "0.85rem", maxWidth: 380, margin: "0 auto 16px" }}>
                Create a project, upload a PDF, Word, Excel, CSV, or text file, then ask questions about it.
              </p>
              <button
                onClick={() => { setNewName(""); setNewDesc(""); setCreateOpen(true); }}
                style={{ backgroundColor: C.accent, color: "#fff", border: "none", borderRadius: "8px", padding: "10px 16px", cursor: "pointer", fontFamily: font, fontWeight: 600, fontSize: "0.85rem" }}
              >
                Create your first project
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
              {projects.map((p) => (
                <motion.div
                  key={p._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => navigate(`/projects/${p._id}`)}
                  style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", cursor: "pointer", transition: "border-color 0.15s, background-color 0.15s", position: "relative" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.backgroundColor = C.cardHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.backgroundColor = C.card; }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(p._id); }}
                    style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 4, borderRadius: 4 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C.error)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                  >
                    <Delete sx={{ fontSize: 16 }} />
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <Folder sx={{ fontSize: 18, color: C.accent }} />
                    <span style={{ color: C.text, fontWeight: 600, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  </div>
                  {p.description && (
                    <p style={{ color: C.mutedLight, fontSize: "0.8rem", margin: "0 0 12px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {p.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "12px", color: C.muted, fontSize: "0.72rem" }}>
                    <span>{p.sourceCount} {p.sourceCount === 1 ? "source" : "sources"}</span>
                    <span>·</span>
                    <span>{p.totalRows.toLocaleString()} rows</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} PaperProps={{ sx: { backgroundColor: C.card, color: C.text, minWidth: 360 } }}>
        <DialogTitle sx={{ fontFamily: font, fontSize: "1rem" }}>New project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth variant="outlined" label="Project name" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mb: 2, mt: 1, "& .MuiOutlinedInput-root": { color: C.text }, "& .MuiInputLabel-root": { color: C.mutedLight }, "& .MuiOutlinedInput-notchedOutline": { borderColor: C.border } }}
          />
          <TextField
            fullWidth variant="outlined" label="Description (optional)" value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)} multiline rows={2}
            sx={{ "& .MuiOutlinedInput-root": { color: C.text }, "& .MuiInputLabel-root": { color: C.mutedLight }, "& .MuiOutlinedInput-notchedOutline": { borderColor: C.border } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: C.mutedLight }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!newName.trim() || creating} variant="contained" sx={{ backgroundColor: C.accent }}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { backgroundColor: C.card, color: C.text, minWidth: 320 } }}>
        <DialogTitle sx={{ fontFamily: font, fontSize: "1rem" }}>Delete project?</DialogTitle>
        <DialogContent>
          <p style={{ color: C.mutedLight, fontSize: "0.85rem", margin: 0 }}>This will remove the project and all uploaded sources. This cannot be undone.</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} sx={{ color: C.mutedLight }}>Cancel</Button>
          <Button onClick={handleDelete} sx={{ color: C.error }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Projects;
