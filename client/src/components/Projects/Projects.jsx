import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useTheme, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
} from "@mui/material";
import { Folder, Add, Delete } from "@mui/icons-material";
import { motion as Motion } from "framer-motion";
import authService from "../../services/authService";
import projectService from "../../services/projectService";
import AppShell from "../Layout/AppShell";
import { C, font, dialogPaperSx } from "../../theme";

const Projects = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
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
          authService.logoutAndRedirect(navigate);
          return;
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

  return (
    <AppShell
      user={user}
      active="projects"
      title="Projects"
      subtitle="Source-grounded workspaces"
      loading={loading}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
    >
      <div className="rv-scroll" style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 16px 32px" : "28px 32px 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ color: C.text, fontSize: "1.45rem", fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.03em" }}>Projects</h1>
            <p style={{ color: C.muted, fontSize: "0.9rem", margin: 0, maxWidth: 520, lineHeight: 1.5 }}>
              Upload PDF, Word, Excel, CSV, or text files, then ask questions grounded in that material.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setNewName(""); setNewDesc(""); setCreateOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontFamily: font, fontWeight: 600, fontSize: "0.85rem" }}
          >
            <Add sx={{ fontSize: 18 }} /> New project
          </button>
        </div>

        {projects.length === 0 ? (
          <div style={{ backgroundColor: C.card, border: `1px dashed ${C.border}`, borderRadius: 16, padding: "48px 32px", textAlign: "center", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: C.accentDim, color: C.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Folder sx={{ fontSize: 26 }} />
            </div>
            <div style={{ color: C.text, fontWeight: 650, fontSize: "1.05rem", marginBottom: 6 }}>No projects yet</div>
            <p style={{ color: C.muted, fontSize: "0.88rem", maxWidth: 400, margin: "0 auto 18px", lineHeight: 1.55 }}>
              Create a project, add a source, then chat with the document instead of copying it into a generic prompt.
            </p>
            <button
              type="button"
              onClick={() => { setNewName(""); setNewDesc(""); setCreateOpen(true); }}
              style={{ backgroundColor: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontFamily: font, fontWeight: 600, fontSize: "0.85rem" }}
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {projects.map((p) => (
              <Motion.div
                key={p._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/projects/${p._id}`)}
                style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s", position: "relative", boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.boxShadow = C.shadow; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "0 1px 2px rgba(15,23,42,0.04)"; }}
              >
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(p._id); }}
                  style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 4, borderRadius: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.error)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                  aria-label="Delete project"
                >
                  <Delete sx={{ fontSize: 16 }} />
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingRight: 24 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 8, background: C.accentDim, color: C.accent, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Folder sx={{ fontSize: 18 }} />
                  </span>
                  <span style={{ color: C.text, fontWeight: 650, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                </div>
                {p.description && (
                  <p style={{ color: C.mutedLight, fontSize: "0.82rem", margin: "0 0 14px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {p.description}
                  </p>
                )}
                <div style={{ display: "flex", gap: 12, color: C.muted, fontSize: "0.72rem" }}>
                  <span>{p.sourceCount} {p.sourceCount === 1 ? "source" : "sources"}</span>
                  <span>·</span>
                  <span>{(p.totalRows || 0).toLocaleString()} rows</span>
                </div>
              </Motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} PaperProps={{ sx: { ...dialogPaperSx, minWidth: 360 } }}>
        <DialogTitle sx={{ fontFamily: font, fontSize: "1.05rem", fontWeight: 700 }}>New project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth variant="outlined" label="Project name" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth variant="outlined" label="Description (optional)" value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)} multiline rows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: C.muted }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!newName.trim() || creating} variant="contained">
            {creating ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { ...dialogPaperSx, minWidth: 320 } }}>
        <DialogTitle sx={{ fontFamily: font, fontSize: "1.05rem", fontWeight: 700 }}>Delete project?</DialogTitle>
        <DialogContent>
          <p style={{ color: C.muted, fontSize: "0.88rem", margin: 0, lineHeight: 1.55 }}>This removes the project and all uploaded sources. This cannot be undone.</p>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ color: C.muted }}>Cancel</Button>
          <Button onClick={handleDelete} sx={{ color: C.error }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
};

export default Projects;
