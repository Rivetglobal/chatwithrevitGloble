import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useTheme, useMediaQuery, TextField, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from "@mui/material";
import {
  ArrowBack, Send,
  Chat as ChatBubbleIcon, CloudUpload, Delete,
  InsertDriveFile, Settings, Link as LinkIcon,
  TableChart, OpenInNew, AddComment, EventNote, Refresh,
} from "@mui/icons-material";
import { motion as Motion, AnimatePresence } from "framer-motion";
import authService from "../../services/authService";
import projectService from "../../services/projectService";
import rivetLogo from "../../assets/rivetGlobalpng.png";
import AppShell from "../Layout/AppShell";
import { C, font } from "../../theme";

const TypingIndicator = () => (
  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
    {[0, 1, 2].map((i) => (
      <Motion.div key={i}
        style={{ width: 6, height: 6, backgroundColor: C.accent, borderRadius: "50%", opacity: 0.7 }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
      />
    ))}
  </div>
);

const formatBytes = (b) => {
  if (!b) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [instructionsDraft, setInstructionsDraft] = useState("");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [bookingUrl, setBookingUrl] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingCanProvision, setBookingCanProvision] = useState(false);
  const [bookingProvisionedNote, setBookingProvisionedNote] = useState("");
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingsData, setBookingsData] = useState(null);

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
        const data = await projectService.get(id);
        setProject(data.project);
        setDraftName(data.project.name);
        setInstructionsDraft(data.project.instructions || "");
      } catch (e) {
        console.error(e);
      }
      try {
        const info = await projectService.getBookingInfo(id);
        setBookingInfo(info);
      } catch (e) {
        console.error("Failed to load sheet assistant info", e);
      }
      // Load this project's saved conversations and auto-open the most recent
      // one so the user lands back where they left off.
      try {
        const { conversations: convs = [] } = await projectService.listConversations(id);
        setConversations(convs);
        if (convs.length > 0) {
          await loadConversation(convs[0]._id, { silent: true });
        }
      } catch (e) {
        console.error("Failed to load conversations", e);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  const refreshConversations = async () => {
    try {
      const { conversations: convs = [] } = await projectService.listConversations(id);
      setConversations(convs);
    } catch (e) { console.error(e); }
  };

  const loadConversation = async (convId, opts = {}) => {
    if (!convId) return;
    if (!opts.silent) setLoadingConv(true);
    try {
      const { conversation, messages: rows = [] } = await projectService.getConversation(id, convId);
      setCurrentConvId(conversation._id);
      setMessages(rows.map((m) => ({ role: m.role, content: m.content, ts: m.ts ? new Date(m.ts).getTime() : Date.now() })));
    } catch (e) {
      console.error("Failed to load conversation", e);
    } finally {
      setLoadingConv(false);
    }
  };

  const handleNewConversation = () => {
    setCurrentConvId(null);
    setMessages([]);
    setInput("");
  };

  const handleDeleteConversation = async (convId, e) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this conversation? This can't be undone.")) return;
    try {
      await projectService.deleteConversation(id, convId);
      setConversations((cs) => cs.filter((c) => c._id !== convId));
      if (currentConvId === convId) handleNewConversation();
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const handleFile = async (file) => {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      await projectService.uploadSource(id, file);
      const data = await projectService.get(id);
      setProject(data.project);
    } catch (e) {
      setUploadError(e?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddLink = async () => {
    const url = linkUrl.trim();
    if (!url) { setLinkError("Paste a Google Sheets or Excel share link."); return; }
    setLinkError("");
    setLinkLoading(true);
    try {
      await projectService.addSourceLink(id, url);
      const data = await projectService.get(id);
      setProject(data.project);
      setLinkDialogOpen(false);
      setLinkUrl("");
    } catch (e) {
      setLinkError(e?.response?.data?.error || "Could not add the sheet.");
    } finally {
      setLinkLoading(false);
    }
  };

  const closeLinkDialog = () => {
    if (linkLoading) return;
    setLinkDialogOpen(false);
    setLinkError("");
    setLinkUrl("");
  };

  const handleDeleteSource = async (sourceId) => {
    try {
      await projectService.deleteSource(id, sourceId);
      setProject((p) => ({ ...p, sources: p.sources.filter((s) => s._id !== sourceId) }));
    } catch (e) { console.error(e); }
  };

  const handleSend = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    const userMsg = { role: "user", content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setThinking(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const data = await projectService.chat(id, text, history, currentConvId);
      setMessages((m) => [...m, { role: "assistant", content: data.response, ts: Date.now(), sources: data.usedSources || [] }]);
      // Track the conversation id (new on first message) and refresh the
      // sidebar so the title and updatedAt order stay accurate.
      if (data.conversationId) {
        const isNew = !currentConvId;
        setCurrentConvId(data.conversationId);
        if (isNew || conversations[0]?._id !== data.conversationId) {
          refreshConversations();
        }
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: err?.response?.data?.error || "Something went wrong.", ts: Date.now(), error: true }]);
    } finally {
      setThinking(false);
    }
  };

  const handleSaveName = async () => {
    const v = draftName.trim();
    if (!v || v === project.name) { setEditingName(false); setDraftName(project.name); return; }
    try {
      await projectService.update(id, { name: v });
      setProject((p) => ({ ...p, name: v }));
    } catch (e) { console.error(e); }
    setEditingName(false);
  };

  const handleSaveSettings = async (patch) => {
    try {
      await projectService.update(id, patch);
      setProject((p) => ({ ...p, ...patch }));
    } catch (e) { console.error(e); }
  };

  const loadBookingInfo = async () => {
    try {
      const info = await projectService.getBookingInfo(id);
      setBookingInfo(info);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (settingsOpen) loadBookingInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen]);

  const handleLinkBookingSheet = async ({ autoProvision = false } = {}) => {
    const url = bookingUrl.trim();
    if (!url) { setBookingError("Paste your Google Sheets share link."); return; }
    setBookingError("");
    setBookingCanProvision(false);
    setBookingProvisionedNote("");
    setBookingBusy(true);
    try {
      const result = await projectService.linkBookingSheet(id, url, { autoProvision });
      setBookingInfo((b) => ({ ...(b || {}), ...result }));
      setProject((p) => ({ ...p, mode: result.mode, bookingSheet: result.bookingSheet }));
      if (result.provisioned) {
        const parts = [];
        if (result.provisioned.columnsAdded?.length) {
          parts.push(`Added columns: ${result.provisioned.columnsAdded.join(", ")}`);
        }
        if (result.provisioned.settingsTabCreated) {
          parts.push(`Created Settings tab "${result.provisioned.settingsTabName}" with default values`);
        }
        if (parts.length) setBookingProvisionedNote(parts.join(". ") + ".");
      }
      setBookingUrl("");
    } catch (e) {
      const data = e?.response?.data || {};
      setBookingError(data.error || "Could not link the sheet.");
      setBookingCanProvision(Boolean(data.canAutoProvision));
      if (data.serviceAccountEmail) {
        setBookingInfo((b) => ({ ...(b || {}), serviceAccountEmail: data.serviceAccountEmail }));
      }
    } finally {
      setBookingBusy(false);
    }
  };

  const handleUnlinkBookingSheet = async () => {
    if (!window.confirm("Unlink this Google Sheet and switch the project back to chat mode?")) return;
    setBookingBusy(true);
    try {
      await projectService.unlinkBookingSheet(id);
      setBookingInfo((b) => ({ ...(b || {}), bookingSheet: null, mode: "chat" }));
      setProject((p) => ({ ...p, mode: "chat", bookingSheet: null }));
    } catch (e) {
      setBookingError(e?.response?.data?.error || "Could not unlink the sheet.");
    } finally {
      setBookingBusy(false);
    }
  };

  const handleModeChange = async (newMode) => {
    if (newMode === "booking" && !project.bookingSheet) {
      setBookingError("Link a Google Sheet first to switch into Sheet assistant mode.");
      return;
    }
    try {
      await projectService.update(id, { mode: newMode });
      setProject((p) => ({ ...p, mode: newMode }));
      setBookingInfo((b) => ({ ...(b || {}), mode: newMode }));
    } catch (e) { console.error(e); }
  };

  const loadBookingRows = async () => {
    setBookingsLoading(true);
    setBookingsError("");
    try {
      const data = await projectService.getBookingRows(id);
      const cellToString = (v) => {
        if (v == null) return "";
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
        try { return JSON.stringify(v); } catch { return String(v); }
      };
      const rawRows = Array.isArray(data?.rows) ? data.rows : [];
      const rows = rawRows.map((r, i) => {
        const obj = (r && typeof r === "object") ? r : {};
        return {
          rowNumber: typeof obj.rowNumber === "number" ? obj.rowNumber : i + 2,
          isFree: Boolean(obj.isFree),
          status: cellToString(obj.status),
          date: cellToString(obj.date),
          time: cellToString(obj.time),
          location: cellToString(obj.location),
          name: cellToString(obj.name),
          phone: cellToString(obj.phone),
          createdAt: cellToString(obj.createdAt),
        };
      });
      const c = data?.counts || {};
      const safe = {
        rows,
        counts: {
          total: Number.isFinite(c.total) ? c.total : 0,
          free: Number.isFinite(c.free) ? c.free : 0,
          booked: Number.isFinite(c.booked) ? c.booked : 0,
        },
        tabName: typeof data?.tabName === "string" ? data.tabName : "",
        sheetUrl: typeof data?.sheetUrl === "string" ? data.sheetUrl : "",
        returned: typeof data?.returned === "number" ? data.returned : rows.length,
      };
      setBookingsData(safe);
    } catch (e) {
      console.error("loadBookingRows failed", e);
      setBookingsError(e?.response?.data?.error || e?.message || "Could not load bookings.");
      setBookingsData(null);
    } finally {
      setBookingsLoading(false);
    }
  };

  const openBookings = () => {
    setBookingsOpen(true);
    loadBookingRows();
  };

  const formatDateTime = (s) => {
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
  };

  const copyToClipboard = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch (_) {}
  };

  if (loading) {
    return <AppShell user={user} active="projects" title="Projects" loading />;
  }
  if (!project) {
    return (
      <AppShell user={user} active="projects" title="Projects" sidebarOpen={sidebarOpen} onSidebarOpenChange={setSidebarOpen}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ color: C.text, fontWeight: 600 }}>Project not found.</div>
          <button type="button" onClick={() => navigate("/projects")} style={{ backgroundColor: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: font }}>Back to projects</button>
        </div>
      </AppShell>
    );
  }

  const isSheetMode = (project.mode || "chat") === "booking" && !!project.bookingSheet?.sheetId;
  const hasReadOnlySheetSource = project.sources.some((s) => s.sourceUrl && /docs\.google\.com\/spreadsheets/i.test(s.sourceUrl));

  return (
    <AppShell
      user={user}
      active="projects"
      title={project.name}
      subtitle={isSheetMode ? "Sheet assistant" : "Source-grounded chat"}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* MAIN */}
        <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden" }}>

          {/* SOURCES PANEL */}
          <div style={{ width: isMobile ? "100%" : 320, minWidth: isMobile ? "auto" : 320, borderRight: isMobile ? "none" : `1px solid ${C.border}`, borderBottom: isMobile ? `1px solid ${C.border}` : "none", display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: C.surface }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={() => navigate("/projects")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 4 }}>
                <ArrowBack sx={{ fontSize: 18 }} />
              </button>
              {editingName ? (
                <input
                  autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)}
                  onBlur={handleSaveName} onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditingName(false); setDraftName(project.name); } }}
                  style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", color: C.text, fontFamily: font, fontSize: "0.95rem", fontWeight: 600 }}
                />
              ) : (
                <div onClick={() => setEditingName(true)} title="Rename" style={{ flex: 1, color: C.text, fontWeight: 600, fontSize: "0.95rem", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {project.name}
                </div>
              )}
              {project.bookingSheet && (
                <Tooltip title="Bookings">
                  <button onClick={openBookings} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 4 }}>
                    <EventNote sx={{ fontSize: 16 }} />
                  </button>
                </Tooltip>
              )}
              <Tooltip title="Settings">
                <button onClick={() => setSettingsOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 4 }}>
                  <Settings sx={{ fontSize: 16 }} />
                </button>
              </Tooltip>
            </div>

            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
              <input
                ref={fileInputRef} type="file"
                accept=".pdf,.docx,.xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.txt,.md,.markdown,.json,.log,.html,.htm,.xml,.rtf,.yaml,.yml"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", borderRadius: 8, backgroundColor: uploading ? "transparent" : C.accentDim, color: C.accentText, border: `1px dashed ${C.accent}`, cursor: uploading ? "default" : "pointer", fontFamily: font, fontSize: "0.85rem", fontWeight: 600 }}
              >
                <CloudUpload sx={{ fontSize: 18 }} />
                {uploading ? "Uploading…" : "Upload file"}
              </button>
              <button
                onClick={() => setLinkDialogOpen(true)}
                disabled={uploading || linkLoading}
                style={{ marginTop: 8, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 12px", borderRadius: 8, backgroundColor: "transparent", color: C.mutedLight, border: `1px solid ${C.border}`, cursor: (uploading || linkLoading) ? "default" : "pointer", fontFamily: font, fontSize: "0.82rem", fontWeight: 500 }}
                onMouseEnter={(e) => { if (!uploading && !linkLoading) { e.currentTarget.style.backgroundColor = C.cardHover; e.currentTarget.style.color = C.text; } }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.mutedLight; }}
              >
                <LinkIcon sx={{ fontSize: 16 }} />
                Import sheet snapshot (read-only)
              </button>
              {uploadError && <div style={{ color: C.error, fontSize: "0.75rem", marginTop: 8 }}>{uploadError}</div>}
              <p style={{ color: C.muted, fontSize: "0.7rem", margin: "8px 0 0", textAlign: "center" }}>PDF · Word · Excel · CSV · Text · max 25MB</p>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 8px" }}>
                <div style={{ color: C.muted, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Conversations ({conversations.length})
                </div>
                <Tooltip title="New conversation">
                  <button onClick={handleNewConversation} style={{ background: "none", border: "none", cursor: "pointer", color: C.accentText, display: "flex", alignItems: "center", gap: 4, padding: 4, fontFamily: font, fontSize: "0.72rem", fontWeight: 600 }}>
                    <AddComment sx={{ fontSize: 14 }} /> New
                  </button>
                </Tooltip>
              </div>
              {conversations.length === 0 ? (
                <div style={{ color: C.muted, fontSize: "0.78rem", padding: "8px", textAlign: "center" }}>
                  No conversations yet. Send a message to start one.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18 }}>
                  {conversations.map((c) => {
                    const active = c._id === currentConvId;
                    return (
                      <div
                        key={c._id}
                        onClick={() => loadConversation(c._id)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, cursor: "pointer", backgroundColor: active ? C.accentDim : "transparent", border: `1px solid ${active ? C.accent : "transparent"}` }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = C.cardHover; }}
                        onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <ChatBubbleIcon sx={{ fontSize: 14, color: active ? C.accentText : C.muted, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0, color: active ? C.text : C.mutedLight, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.title}>
                          {c.title || "Untitled chat"}
                        </div>
                        <Tooltip title="Delete conversation">
                          <button
                            onClick={(e) => handleDeleteConversation(c._id, e)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 2, opacity: 0.6 }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = C.error; e.currentTarget.style.opacity = 1; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.opacity = 0.6; }}
                          >
                            <Delete sx={{ fontSize: 13 }} />
                          </button>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ color: C.muted, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 6px 8px" }}>
                Sources ({project.sources.length})
              </div>
              {project.sources.length === 0 ? (
                <div style={{ color: C.muted, fontSize: "0.8rem", padding: "8px", textAlign: "center" }}>
                  No sources yet.
                </div>
              ) : (
                project.sources.map((s) => {
                  const isDoc = s.kind === "document";
                  const isLinked = !!s.sourceUrl;
                  const ext = (s.originalName.split(".").pop() || "").toUpperCase();
                  return (
                    <div key={s._id} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isLinked ? <TableChart sx={{ fontSize: 16, color: "#34a853" }} /> : <InsertDriveFile sx={{ fontSize: 16, color: C.accent }} />}
                        <span style={{ flex: 1, color: C.text, fontSize: "0.8rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.originalName}</span>
                        {isLinked && (
                          <Tooltip title="Open in Google Sheets">
                            <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer"
                              style={{ display: "flex", padding: 2, color: C.muted, textDecoration: "none" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                            >
                              <OpenInNew sx={{ fontSize: 14 }} />
                            </a>
                          </Tooltip>
                        )}
                        <button onClick={() => handleDeleteSource(s._id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 2 }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = C.error)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                        >
                          <Delete sx={{ fontSize: 14 }} />
                        </button>
                      </div>
                      <div style={{ marginTop: 6, color: C.muted, fontSize: "0.7rem" }}>
                        {isDoc
                          ? `${ext} · ${(s.charCount || 0).toLocaleString()} chars`
                          : (s.sheets || []).map((sh) => `${sh.name} (${sh.rowCount} rows × ${sh.columns.length} cols)`).join(" · ")}
                      </div>
                      <div style={{ color: C.muted, fontSize: "0.68rem", marginTop: 2 }}>
                        {isLinked ? "Linked Google Sheet · " : ""}{formatBytes(s.sizeBytes)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CHAT */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Quick mode switcher — change Project mode without opening Settings */}
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: C.muted, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Mode</span>
              <div style={{ display: "inline-flex", padding: 2, backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                {[{ k: "chat", l: "Chat" }, { k: "booking", l: "Sheet assistant" }].map((opt) => {
                  const active = (project.mode || "chat") === opt.k;
                  const disabled = opt.k === "booking" && !project.bookingSheet;
                  const btn = (
                    <button key={opt.k}
                      onClick={() => handleModeChange(opt.k)}
                      disabled={disabled || active}
                      style={{ padding: "5px 12px", borderRadius: 6, border: "none", backgroundColor: active ? C.accent : "transparent", color: active ? "#fff" : (disabled ? C.muted : C.mutedLight), cursor: disabled ? "not-allowed" : (active ? "default" : "pointer"), fontFamily: font, fontSize: "0.78rem", fontWeight: 600, opacity: disabled ? 0.6 : 1, transition: "background-color 0.15s, color 0.15s" }}
                      onMouseEnter={(e) => { if (!active && !disabled) e.currentTarget.style.color = C.text; }}
                      onMouseLeave={(e) => { if (!active && !disabled) e.currentTarget.style.color = C.mutedLight; }}
                    >{opt.l}</button>
                  );
                  return disabled
                    ? <Tooltip key={opt.k} title="Link a Google Sheet in Settings to enable"><span>{btn}</span></Tooltip>
                    : btn;
                })}
              </div>
              <Tooltip title="Open Settings">
                <button onClick={() => setSettingsOpen(true)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 4 }}>
                  <Settings sx={{ fontSize: 16 }} />
                </button>
              </Tooltip>
            </div>
            {!isSheetMode && (
              <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.warnBorder}`, backgroundColor: C.warnBg, color: C.mutedLight, fontSize: "0.78rem", lineHeight: 1.55 }}>
                {hasReadOnlySheetSource ? (
                  <>
                    <strong style={{ color: C.warn }}>Read-only sheet imported.</strong>{" "}
                    To <strong style={{ color: C.text }}>edit</strong> a Google Sheet via chat, open{" "}
                    <button type="button" onClick={() => setSettingsOpen(true)} style={{ background: "none", border: "none", padding: 0, color: C.accentText, cursor: "pointer", fontFamily: font, fontSize: "inherit", textDecoration: "underline" }}>Settings</button>
                    {" "}→ link the sheet under <strong style={{ color: C.text }}>Sheet assistant</strong> (not the import button on the left).
                  </>
                ) : (
                  <>
                    <strong style={{ color: C.warn }}>Chat mode is read-only.</strong>{" "}
                    To edit a Google Sheet with prompts, open{" "}
                    <button type="button" onClick={() => setSettingsOpen(true)} style={{ background: "none", border: "none", padding: 0, color: C.accentText, cursor: "pointer", fontFamily: font, fontSize: "inherit", textDecoration: "underline" }}>Settings</button>
                    {" "}→ paste your sheet URL under <strong style={{ color: C.text }}>Sheet assistant</strong> → click <strong style={{ color: C.text }}>Link sheet</strong>.
                  </>
                )}
              </div>
            )}
            {isSheetMode && bookingInfo?.serviceAccountEmail && (
              <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.border}`, backgroundColor: C.accentDim, color: C.accentText, fontSize: "0.74rem", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <TableChart sx={{ fontSize: 15 }} />
                <span><strong>Sheet assistant</strong> · live edits to {project.bookingSheet.sheetTitle || "linked sheet"}</span>
                {project.bookingSheet.sheetUrl && (
                  <a href={project.bookingSheet.sheetUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.accentText, marginLeft: "auto" }}>Open sheet</a>
                )}
              </div>
            )}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {messages.length === 0 && !thinking && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "2rem" }}>
                  <img src={rivetLogo} alt="Rivet" style={{ width: 44, height: 44, borderRadius: 10, marginBottom: 12, opacity: 0.9 }} />
                  <div style={{ color: C.text, fontWeight: 600, fontSize: "1.05rem", marginBottom: 4 }}>
                    {isSheetMode
                      ? "Edit your Google Sheet with chat"
                      : project.sources.length === 0 ? "Upload a file to get started" : "Ask anything about your data"}
                  </div>
                  <p style={{ color: C.muted, fontSize: "0.85rem", maxWidth: 420, lineHeight: 1.5, margin: 0 }}>
                    {isSheetMode
                      ? 'Try: "List all tabs" · "Add a row to Leads with name John and email john@example.com" · "Update row 3 — set status to Done"'
                      : project.sources.length === 0
                        ? "Add a PDF, Word, Excel, CSV, or text file from the left, then ask questions about its contents."
                        : "I'll only use the content in your uploaded files. If something isn't there, I'll say so."}
                  </p>
                </div>
              )}

              <AnimatePresence>
                {messages.map((m, idx) => (
                  m.role === "user" ? (
                    <div key={idx} style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                        style={{ backgroundColor: C.userBubble, border: `1px solid ${C.userBubbleBorder}`, borderRadius: "12px 12px 2px 12px", padding: "10px 14px", maxWidth: "75%", color: C.userBubbleText, fontSize: "0.9rem", lineHeight: 1.55, wordBreak: "break-word" }}>
                        {m.content}
                      </Motion.div>
                    </div>
                  ) : (
                    <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "85%" }}>
                      <img src={rivetLogo} alt="AI" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover", marginTop: 2, flexShrink: 0 }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <Motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
                          style={{ backgroundColor: C.aiBubble, border: `1px solid ${m.error ? C.error : C.aiBubbleBorder}`, borderRadius: "2px 12px 12px 12px", padding: "10px 14px", color: m.error ? C.error : C.text, fontSize: "0.9rem", lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {m.content}
                        </Motion.div>
                        {!m.error && m.sources && m.sources.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 4 }}>
                            {m.sources.map((s) => (
                              <div key={s._id} title={`Sheets: ${(s.sheetNames || []).join(", ")}`}
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.65rem", color: C.mutedLight, backgroundColor: C.accentDim, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px" }}>
                                <InsertDriveFile sx={{ fontSize: 10 }} />
                                {s.originalName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </AnimatePresence>

              {thinking && (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <img src={rivetLogo} alt="AI" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  <div style={{ backgroundColor: C.aiBubble, border: `1px solid ${C.aiBubbleBorder}`, borderRadius: "2px 12px 12px 12px", padding: "10px 14px" }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <div style={{ padding: "14px 24px 16px", borderTop: `1px solid ${C.border}`, backgroundColor: C.surface, flexShrink: 0 }}>
              <form onSubmit={handleSend} style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "4px 8px 4px 14px" }}>
                <TextField
                  fullWidth multiline maxRows={4} variant="standard"
                  placeholder={isSheetMode
                    ? "Add a row, update a cell, or ask about your live Google Sheet…"
                    : project.sources.length === 0 ? "Upload a file to start asking questions…" : "Ask about your uploaded data…"}
                  disabled={!isSheetMode && project.sources.length === 0}
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                  InputProps={{ disableUnderline: true, style: { color: C.text, fontFamily: font, fontSize: "0.9rem" } }}
                  sx={{ flex: 1 }}
                />
                <button type="submit" disabled={!input.trim() || thinking}
                  style={{ flexShrink: 0, width: 34, height: 34, backgroundColor: input.trim() && !thinking ? C.accent : "transparent", color: input.trim() && !thinking ? "#fff" : C.muted, border: `1px solid ${input.trim() && !thinking ? C.accent : C.border}`, borderRadius: 6, cursor: input.trim() && !thinking ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Send sx={{ fontSize: 16 }} />
                </button>
              </form>
              <p style={{ color: C.muted, fontSize: "0.7rem", textAlign: "center", marginTop: 6, marginBottom: 0 }}>
                {isSheetMode
                  ? <>Sheet assistant · live Google Sheet · {project.responseMode === "detailed" ? "Detailed answers" : "Short answers"}</>
                  : <>Read-only chat · {project.responseMode === "detailed" ? "Detailed answers" : "Short answers"}</>}
                {(project.instructions || "").trim() && <> · <span style={{ color: C.accent }}>Custom role on</span></>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Google Sheet / Excel link dialog */}
      <Dialog open={linkDialogOpen} onClose={closeLinkDialog} PaperProps={{ sx: { backgroundColor: C.card, color: C.text, minWidth: 460, maxWidth: 560, border: `1px solid ${C.border}` } }}>
        <DialogTitle sx={{ fontFamily: font, fontSize: "1rem", display: "flex", alignItems: "center", gap: 1 }}>
          <LinkIcon sx={{ fontSize: 18, color: C.accent }} />
          Add a sheet link (Google Sheets or Excel)
        </DialogTitle>
        <DialogContent>
          <p style={{ color: C.mutedLight, fontSize: "0.82rem", lineHeight: 1.55, marginTop: 0, marginBottom: 14 }}>
            Paste a share link from Google Sheets, OneDrive, or SharePoint. We'll import every tab as a source — it's a one-time snapshot, so re-add the link if the sheet changes.
          </p>
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={(e) => { setLinkUrl(e.target.value); if (linkError) setLinkError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !linkLoading) handleAddLink(); }}
            placeholder="https://docs.google.com/spreadsheets/... or https://1drv.ms/x/..."
            disabled={linkLoading}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, backgroundColor: C.bg, color: C.text, border: `1px solid ${linkError ? C.error : C.border}`, fontFamily: font, fontSize: "0.85rem", outline: "none" }}
          />
          {linkError && <div style={{ color: C.error, fontSize: "0.78rem", marginTop: 8, lineHeight: 1.5 }}>{linkError}</div>}
          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.text, fontSize: "0.76rem", fontWeight: 600, marginBottom: 6 }}>Google Sheets — make it shareable</div>
            <ol style={{ color: C.mutedLight, fontSize: "0.76rem", lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
              <li>Click <strong style={{ color: C.text }}>Share</strong> (top right).</li>
              <li>Under <strong style={{ color: C.text }}>General access</strong>, choose <strong style={{ color: C.text }}>Anyone with the link</strong>.</li>
              <li>Set the role to <strong style={{ color: C.text }}>Viewer</strong>, copy the link, paste it above.</li>
            </ol>
          </div>
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
            <div style={{ color: C.text, fontSize: "0.76rem", fontWeight: 600, marginBottom: 6 }}>Excel (OneDrive / SharePoint) — make it shareable</div>
            <ol style={{ color: C.mutedLight, fontSize: "0.76rem", lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
              <li>Open the file in Excel or OneDrive and click <strong style={{ color: C.text }}>Share</strong>.</li>
              <li>Change access to <strong style={{ color: C.text }}>Anyone with the link</strong> with <strong style={{ color: C.text }}>Can view</strong>.</li>
              <li>Click <strong style={{ color: C.text }}>Copy link</strong> and paste it above.</li>
            </ol>
          </div>
        </DialogContent>
        <DialogActions sx={{ padding: "8px 24px 18px" }}>
          <Button onClick={closeLinkDialog} disabled={linkLoading} sx={{ color: C.mutedLight, fontFamily: font, textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddLink}
            disabled={linkLoading || !linkUrl.trim()}
            variant="contained"
            sx={{ backgroundColor: C.accent, color: "#fff", fontFamily: font, textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: C.accentHover, boxShadow: "none" }, "&.Mui-disabled": { backgroundColor: C.accentDim, color: C.muted } }}
          >
            {linkLoading ? "Importing…" : "Add sheet"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} PaperProps={{ sx: { backgroundColor: C.card, color: C.text, minWidth: 420, maxWidth: 520 } }}>
        <DialogTitle sx={{ fontFamily: font, fontSize: "1rem" }}>Project settings</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: C.mutedLight, fontSize: "0.78rem", marginBottom: 6, fontWeight: 600 }}>Custom rules &amp; instructions for the AI</div>
            <textarea
              value={instructionsDraft}
              onChange={(e) => setInstructionsDraft(e.target.value.slice(0, 4000))}
              onBlur={() => { if (instructionsDraft !== (project.instructions || "")) handleSaveSettings({ instructions: instructionsDraft }); }}
              placeholder={"Add any rules, role, or guidance for this project's AI. One rule per line works well.\n\nExamples:\n- You are a recruiter reviewing CVs. List name, years of experience, and key skills.\n- Always ask before adding a row.\n- Never write phone numbers starting with + into number columns.\n- When confirming a booking, also include the location.\n- Reply in British English."}
              rows={8}
              style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontFamily: font, fontSize: "0.82rem", lineHeight: 1.5, resize: "vertical", outline: "none" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <p style={{ color: C.muted, fontSize: "0.7rem", margin: 0 }}>Saved automatically when you click outside the box. Applies only to this project. The built-in safety rules (one row per request, no test rows, etc.) always remain active.</p>
              <span style={{ color: C.muted, fontSize: "0.68rem" }}>{instructionsDraft.length}/4000</span>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.mutedLight, fontSize: "0.78rem", marginBottom: 8, fontWeight: 600 }}>Response style</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ k: "short", l: "Short" }, { k: "detailed", l: "Detailed" }].map((opt) => (
                <button key={opt.k}
                  onClick={() => handleSaveSettings({ responseMode: opt.k })}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${project.responseMode === opt.k ? C.accent : C.border}`, backgroundColor: project.responseMode === opt.k ? C.accentDim : "transparent", color: project.responseMode === opt.k ? C.accentText : C.mutedLight, cursor: "pointer", fontFamily: font, fontSize: "0.8rem", fontWeight: 600 }}
                >{opt.l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ color: C.mutedLight, fontSize: "0.78rem", marginBottom: 8, fontWeight: 600 }}>Response speed</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ k: "fast", l: "Fast" }, { k: "medium", l: "Medium" }, { k: "deep", l: "Deep" }].map((opt) => (
                <button key={opt.k}
                  onClick={() => handleSaveSettings({ responseSpeed: opt.k })}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${project.responseSpeed === opt.k ? C.accent : C.border}`, backgroundColor: project.responseSpeed === opt.k ? C.accentDim : "transparent", color: project.responseSpeed === opt.k ? C.accentText : C.mutedLight, cursor: "pointer", fontFamily: font, fontSize: "0.8rem", fontWeight: 600 }}
                >{opt.l}</button>
              ))}
            </div>
            <p style={{ color: C.muted, fontSize: "0.7rem", margin: "8px 0 0" }}>
              Deeper modes include more rows in the AI's context for richer answers on larger sheets.
            </p>
          </div>
          {/* Booking-mode panel */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
            <div style={{ color: C.mutedLight, fontSize: "0.78rem", marginBottom: 8, fontWeight: 600 }}>Project mode</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[{ k: "chat", l: "Chat (source-only)" }, { k: "booking", l: "Sheet assistant" }].map((opt) => {
                const active = (project.mode || "chat") === opt.k;
                const disabled = opt.k === "booking" && !project.bookingSheet;
                return (
                  <button key={opt.k}
                    onClick={() => handleModeChange(opt.k)}
                    disabled={disabled}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${active ? C.accent : C.border}`, backgroundColor: active ? C.accentDim : "transparent", color: disabled ? C.muted : (active ? C.accentText : C.mutedLight), cursor: disabled ? "not-allowed" : "pointer", fontFamily: font, fontSize: "0.8rem", fontWeight: 600, opacity: disabled ? 0.6 : 1 }}
                  >{opt.l}</button>
                );
              })}
            </div>

            {bookingInfo?.configError && (
              <div style={{ color: C.error, fontSize: "0.76rem", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.error}`, backgroundColor: "rgba(248,113,113,0.08)", marginBottom: 12, lineHeight: 1.5 }}>
                {bookingInfo.configError}
              </div>
            )}

            {!project.bookingSheet ? (
              <div style={{ padding: "12px", borderRadius: 8, border: `1px dashed ${C.border}`, backgroundColor: C.bg }}>
                <div style={{ color: C.text, fontSize: "0.82rem", fontWeight: 600, marginBottom: 6 }}>Link a Google Sheet</div>
                <ol style={{ color: C.mutedLight, fontSize: "0.74rem", lineHeight: 1.6, margin: "0 0 10px", paddingLeft: 18 }}>
                  <li>
                    Use <strong style={{ color: C.text }}>any</strong> Google Sheet — bookings, CRM, leads, tasks, inventory, notes, anything. There is no required structure. The assistant reads your tabs and column headers live on every turn and adapts to whatever it finds.
                  </li>
                  <li>
                    Optional: add a tab whose name contains "<strong style={{ color: C.text }}>Settings</strong>" with two columns (key, value). Use it as a live instruction layer — write keys like <code style={{ color: C.accentText, fontSize: "0.7rem" }}>system_prompt</code>, tone, response templates, business rules, etc. The assistant reads it fresh on every chat turn so you can change behaviour without redeploying.
                  </li>
                  {bookingInfo?.serviceAccountEmail ? (
                    <li>
                      Click <strong style={{ color: C.text }}>Share</strong> and add this email as <strong style={{ color: C.text }}>Editor</strong>:
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <code style={{ color: C.accentText, backgroundColor: C.surface, padding: "4px 8px", borderRadius: 4, fontSize: "0.72rem", flex: 1, overflow: "auto", whiteSpace: "nowrap" }}>{bookingInfo.serviceAccountEmail}</code>
                        <button onClick={() => copyToClipboard(bookingInfo.serviceAccountEmail)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.mutedLight, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontFamily: font, fontSize: "0.7rem" }}>Copy</button>
                      </div>
                    </li>
                  ) : (
                    <li>
                      Server is missing Google service account credentials.
                      {user?.isAdmin ? (
                        <>
                          {" "}Open{" "}
                          <button type="button" onClick={() => { setSettingsOpen(false); navigate("/admin"); }}
                            style={{ background: "none", border: "none", padding: 0, color: C.accentText, cursor: "pointer", fontFamily: font, fontSize: "inherit", textDecoration: "underline" }}>
                            Admin panel → Google Sheets integration
                          </button>
                          {" "}to paste or upload your JSON key.
                        </>
                      ) : (
                        <> Ask the admin to set it in <code style={{ color: C.accentText }}>Admin panel → Google Sheets integration</code>.</>
                      )}
                    </li>
                  )}
                  <li>Paste the sheet link below and click <strong style={{ color: C.text }}>Link sheet</strong>. Tip: you can include <code style={{ color: C.accentText, fontSize: "0.7rem" }}>#gid=...</code> in the URL to point to a specific tab.</li>
                </ol>
                <input
                  type="url"
                  value={bookingUrl}
                  onChange={(e) => { setBookingUrl(e.target.value); if (bookingError) setBookingError(""); }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  disabled={bookingBusy}
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 6, backgroundColor: C.surface, color: C.text, border: `1px solid ${bookingError ? C.error : C.border}`, fontFamily: font, fontSize: "0.8rem", outline: "none" }}
                />
                {bookingError && <div style={{ color: C.error, fontSize: "0.74rem", marginTop: 6, lineHeight: 1.5 }}>{bookingError}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleLinkBookingSheet()}
                    disabled={bookingBusy || !bookingUrl.trim()}
                    style={{ padding: "8px 14px", borderRadius: 6, border: "none", backgroundColor: bookingBusy ? C.accentDim : C.accent, color: "#fff", fontFamily: font, fontSize: "0.8rem", fontWeight: 600, cursor: bookingBusy ? "default" : "pointer" }}
                  >
                    {bookingBusy ? "Linking…" : "Link sheet"}
                  </button>
                  {bookingCanProvision && (
                    <button
                      onClick={() => handleLinkBookingSheet({ autoProvision: true })}
                      disabled={bookingBusy || !bookingUrl.trim()}
                      style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${C.accent}`, backgroundColor: "transparent", color: C.accentText, fontFamily: font, fontSize: "0.8rem", fontWeight: 600, cursor: bookingBusy ? "default" : "pointer" }}
                      title="We'll add the missing columns to your tab and create a Settings tab with default values."
                    >
                      Auto-create columns &amp; Settings
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: "12px", borderRadius: 8, border: `1px solid ${C.border}`, backgroundColor: C.bg }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <TableChart sx={{ fontSize: 18, color: "#34a853" }} />
                  <div style={{ flex: 1, color: C.text, fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {project.bookingSheet.sheetTitle || "Linked sheet"}
                  </div>
                  {project.bookingSheet.sheetUrl && (
                    <a href={project.bookingSheet.sheetUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.mutedLight, display: "flex", textDecoration: "none" }}>
                      <OpenInNew sx={{ fontSize: 16 }} />
                    </a>
                  )}
                </div>
                <div style={{ color: C.mutedLight, fontSize: "0.75rem", marginBottom: 8, lineHeight: 1.5 }}>
                  Sheet assistant mode is live. The AI reads your tabs and headers fresh on every chat turn and can list, add, or update rows in any tab. Edit your sheet (rename columns, add tabs, change the Settings tab) and the assistant adapts on the next message.
                </div>
                {bookingProvisionedNote && (
                  <div style={{ color: "#34a853", fontSize: "0.72rem", marginBottom: 8, padding: "6px 8px", borderRadius: 4, backgroundColor: "rgba(52,168,83,0.08)", border: `1px solid rgba(52,168,83,0.3)`, lineHeight: 1.5 }}>
                    {bookingProvisionedNote}
                  </div>
                )}
                {project.bookingSheet.columnMap && Object.keys(project.bookingSheet.columnMap).length > 0 && (
                  <div style={{ color: C.muted, fontSize: "0.7rem", marginBottom: 10, lineHeight: 1.5 }}>
                    Detected: {Object.keys(project.bookingSheet.columnMap).map((f) => (
                      <span key={f} style={{ marginRight: 8 }}>
                        <strong style={{ color: C.mutedLight }}>{f}</strong>
                        <span style={{ color: C.muted }}> → </span>
                        <code style={{ color: C.accentText, fontSize: "0.7rem" }}>{project.bookingSheet.headers?.[project.bookingSheet.columnMap[f]] || "?"}</code>
                      </span>
                    ))}
                    {project.bookingSheet.settingsTabName && (
                      <div style={{ marginTop: 4 }}>
                        Settings tab: <code style={{ color: C.accentText, fontSize: "0.7rem" }}>{project.bookingSheet.settingsTabName}</code>
                      </div>
                    )}
                  </div>
                )}
                {bookingError && <div style={{ color: C.error, fontSize: "0.74rem", marginBottom: 8, lineHeight: 1.5 }}>{bookingError}</div>}
                <button
                  onClick={handleUnlinkBookingSheet}
                  disabled={bookingBusy}
                  style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.error}`, backgroundColor: "transparent", color: C.error, fontFamily: font, fontSize: "0.78rem", cursor: bookingBusy ? "default" : "pointer" }}
                >
                  {bookingBusy ? "Working…" : "Unlink sheet"}
                </button>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)} sx={{ color: C.accent }}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Bookings dialog */}
      <Dialog
        open={bookingsOpen}
        onClose={() => setBookingsOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { backgroundColor: C.card, color: C.text, border: `1px solid ${C.border}` } }}
      >
        <DialogTitle sx={{ fontFamily: font, fontSize: "1rem", display: "flex", alignItems: "center", gap: 1 }}>
          <EventNote sx={{ fontSize: 18, color: C.accent }} />
          Bookings
          {bookingsData?.tabName && (
            <span style={{ color: C.muted, fontSize: "0.78rem", fontWeight: 400, marginLeft: 6 }}>
              · tab "{bookingsData.tabName}"
            </span>
          )}
          <div style={{ flex: 1 }} />
          {bookingsData?.sheetUrl && (
            <Tooltip title="Open sheet">
              <a href={bookingsData.sheetUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", padding: 4, color: C.muted, textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
              >
                <OpenInNew sx={{ fontSize: 16 }} />
              </a>
            </Tooltip>
          )}
          <Tooltip title="Refresh">
            <button onClick={loadBookingRows} disabled={bookingsLoading}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px", color: bookingsLoading ? C.muted : C.text, cursor: bookingsLoading ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: font, fontSize: "0.78rem" }}>
              <Refresh sx={{ fontSize: 14 }} />
              {bookingsLoading ? "Loading…" : "Refresh"}
            </button>
          </Tooltip>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: C.border }}>
          {/* Counts */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            {[
              { l: "Total slots", v: bookingsData?.counts?.total ?? "—", color: C.text },
              { l: "Free", v: bookingsData?.counts?.free ?? "—", color: C.ok },
              { l: "Booked", v: bookingsData?.counts?.booked ?? "—", color: C.accentText },
            ].map((s) => (
              <div key={s.l} style={{ flex: "1 1 140px", padding: "10px 14px", borderRadius: 8, backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{s.l}</div>
                <div style={{ color: s.color, fontSize: "1.4rem", fontWeight: 700, marginTop: 2 }}>{s.v}</div>
              </div>
            ))}
          </div>

          {bookingsError && (
            <div style={{ color: C.error, fontSize: "0.8rem", padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.error}`, backgroundColor: "rgba(248,113,113,0.08)", marginBottom: 12 }}>
              {bookingsError}
            </div>
          )}

          {bookingsLoading && !bookingsData ? (
            <div style={{ color: C.muted, fontSize: "0.85rem", padding: "30px 0", textAlign: "center" }}>Loading bookings…</div>
          ) : bookingsData && bookingsData.rows.length === 0 ? (
            <div style={{ color: C.muted, fontSize: "0.85rem", padding: "30px 0", textAlign: "center" }}>No rows found in this tab yet.</div>
          ) : bookingsData ? (
            <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font, fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ backgroundColor: C.surface }}>
                    {["Status", "Date", "Time", "Location", "Name", "Phone", "Created"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "9px 12px", color: C.mutedLight, fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookingsData.rows.map((r) => {
                    const free = r.isFree;
                    const badgeColor = free ? C.ok : C.accentText;
                    const badgeBg = free ? "rgba(5,150,105,0.10)" : C.accentDim;
                    const label = r.status || (free ? "Available" : "Booked");
                    return (
                      <tr key={r.rowNumber} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, backgroundColor: badgeBg, color: badgeColor, fontSize: "0.7rem", fontWeight: 600, border: `1px solid ${badgeColor}33` }}>
                            {label}
                          </span>
                        </td>
                        <td style={{ padding: "9px 12px", color: C.text }}>{r.date || "—"}</td>
                        <td style={{ padding: "9px 12px", color: C.text }}>{r.time || "—"}</td>
                        <td style={{ padding: "9px 12px", color: C.mutedLight }}>{r.location || "—"}</td>
                        <td style={{ padding: "9px 12px", color: C.text }}>{r.name || "—"}</td>
                        <td style={{ padding: "9px 12px", color: C.mutedLight }}>{r.phone || "—"}</td>
                        <td style={{ padding: "9px 12px", color: C.muted, fontSize: "0.76rem" }}>{formatDateTime(r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {bookingsData && (
            <div style={{ color: C.muted, fontSize: "0.72rem", marginTop: 10, textAlign: "right" }}>
              Showing the {bookingsData.returned} most recent {bookingsData.returned === 1 ? "row" : "rows"}
              {bookingsData.counts?.total > bookingsData.returned ? ` of ${bookingsData.counts.total}` : ""}.
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingsOpen(false)} sx={{ color: C.accent }}>Close</Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
};

export default ProjectDetail;
