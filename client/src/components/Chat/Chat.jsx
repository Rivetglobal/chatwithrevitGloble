import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Send,
  Logout, AdminPanelSettings,
  ContentCopy,
  Add,
  Edit as EditIcon,
  Delete,
  Refresh,
  Check,
  Menu as MenuIcon,
  Close,
  DeleteForever,
  Chat as ChatBubbleIcon,
  BarChart,
  Folder,
  MenuBook,
  FindInPage,
  VerifiedUser,
  ArrowForward,
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import authService from "../../services/authService";
import chatService from "../../services/chatService";
import conversationService from "../../services/conversationService";
import rivetLogo from "../../assets/rivetGlobalpng.png";

const C = {
  bg: "#0c1117",
  sidebar: "#111827",
  surface: "#131929",
  card: "#1a2234",
  cardHover: "#1f2a40",
  border: "#1e2d45",
  accent: "#5b8dee",
  accentDim: "rgba(91,141,238,0.12)",
  accentText: "#93c5fd",
  text: "#f1f5f9",
  muted: "#64748b",
  mutedLight: "#94a3b8",
  error: "#f87171",
  userBubble: "#1e3a6e",
  userBubbleBorder: "#2563eb",
  aiBubble: "#131929",
  aiBubbleBorder: "#1e2d45",
};

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const NAV_ITEMS = [
  { icon: <ChatBubbleIcon sx={{ fontSize: 18 }} />, label: "Conversations", id: "chat", path: "/chat" },
  { icon: <Folder sx={{ fontSize: 18 }} />, label: "Projects", id: "projects", path: "/projects" },
];

const TypingIndicator = () => (
  <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "4px 0" }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        style={{ width: 6, height: 6, backgroundColor: C.accent, borderRadius: "50%", opacity: 0.7 }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
      />
    ))}
  </div>
);

const StatCard = ({ label, value }) => (
  <div style={{
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: "10px",
    padding: "14px 18px",
    flex: 1,
    minWidth: 0,
  }}>
    <div style={{ color: C.text, fontWeight: 700, fontSize: "1.4rem", lineHeight: 1 }}>{value}</div>
    <div style={{ color: C.muted, fontSize: "0.75rem", marginTop: "4px" }}>{label}</div>
  </div>
);

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [hoveredPath, setHoveredPath] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/login"); return; }
        const userData = await authService.getProfile();
        setUser(userData);
      } catch (err) {
        console.error("Auth/profile load failed:", err);
        navigate("/login");
        return;
      }
      // Conversation + history loads are best-effort: failures here should NOT
      // bounce the user back to /login. Just log and surface an empty state.
      try {
        const convData = await conversationService.getConversations();
        const convs = convData.conversations || [];
        setConversations(convs);
        if (convs.length > 0) {
          const firstConv = convs[0];
          setCurrentConversationId(firstConv._id);
          try {
            const chatHistory = await chatService.getChatHistory(firstConv._id);
            setMessages(chatHistory.chats || []);
          } catch (histErr) {
            console.error("Failed to load chat history for", firstConv._id, histErr);
            setMessages([]);
          }
        }
      } catch (err) {
        console.error("Failed to load conversations list:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const tempMessage = newMessage;
    setNewMessage("");
    const tempUserMsg = { _id: Date.now().toString(), message: tempMessage, timestamp: new Date().toISOString(), sender: "user" };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsTyping(true);
    try {
      const response = await chatService.sendMessage(tempMessage, currentConversationId);
      const newChat = {
        _id: response.chatId, conversationId: response.conversationId, userId: user._id,
        message: tempMessage, response: response.message, timestamp: new Date().toISOString(),
        metadata: { model: "compliance-house-agent", tokens: response.tokens },
      };
      if (!currentConversationId) {
        setCurrentConversationId(response.conversationId);
        const convData = await conversationService.getConversations();
        setConversations(convData.conversations || []);
      }
      setMessages((prev) => [...prev.filter((m) => m._id !== tempUserMsg._id), newChat]);
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await conversationService.createConversation("New Conversation");
      setConversations((prev) => [newConv.conversation, ...prev]);
      setCurrentConversationId(newConv.conversation._id);
      setMessages([]);
    } catch { /* ignore */ }
  };

  const handleSelectConversation = async (convId) => {
    setCurrentConversationId(convId);
    setMessages([]); // clear stale messages while loading
    try {
      const chatHistory = await chatService.getChatHistory(convId);
      setMessages(chatHistory.chats || []);
      if (isMobile) setSidebarOpen(false);
    } catch (err) {
      console.error("Failed to load conversation messages:", convId, err);
    }
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerateResponse = async (chatId) => {
    try {
      setIsTyping(true);
      const response = await chatService.regenerateResponse(chatId);
      setMessages((prev) => prev.map((m) => m._id === chatId ? { ...m, response: response.message } : m));
    } catch { /* ignore */ }
    finally { setIsTyping(false); }
  };

  const handleEditConversationTitle = async (convId) => {
    if (!editTitle.trim()) return;
    try {
      await conversationService.updateConversationTitle(convId, editTitle);
      setConversations((prev) => prev.map((c) => c._id === convId ? { ...c, title: editTitle } : c));
      setEditingConvId(null); setEditTitle("");
    } catch { /* ignore */ }
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    try {
      await conversationService.deleteConversation(conversationToDelete);
      setConversations((prev) => prev.filter((c) => c._id !== conversationToDelete));
      if (currentConversationId === conversationToDelete) { setCurrentConversationId(null); setMessages([]); }
      setDeleteDialogOpen(false); setConversationToDelete(null);
    } catch { /* ignore */ }
  };

  const handleClearHistory = async () => {
    try {
      await chatService.clearChatHistory();
      setMessages([]); setConversations([]); setCurrentConversationId(null);
    } catch { /* ignore */ }
  };

  const handleLogout = async () => { await authService.logout(); navigate("/login"); };

  const focusInput = () => {
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleStartPath = (path) => {
    if (path.route) {
      navigate(path.route);
      return;
    }
    if (path.seed) {
      setNewMessage(path.seed);
    }
    focusInput();
  };

  const TRIAGE_PATHS = [
    {
      id: "decode",
      icon: <MenuBook sx={{ fontSize: 22 }} />,
      title: "Decode a regulation",
      description: "Ask about specific NICE guidelines, CQC KLOEs, or complex frameworks like DoLS.",
      seed: "Help me decode a regulation. Specifically, I want to understand: ",
    },
    {
      id: "audit",
      icon: <FindInPage sx={{ fontSize: 22 }} />,
      title: "Audit a document or policy",
      description: "Upload care plans, risk assessments, or audit reports for a compliance review.",
      route: "/projects",
    },
    {
      id: "inspect",
      icon: <VerifiedUser sx={{ fontSize: 22 }} />,
      title: "Prep for an inspection",
      description: "Generate checklists and mock questions based on the latest CQC inspection framework.",
      seed: "I need to prep for a CQC inspection. Please generate a checklist covering ",
    },
  ];

  if (loading) return (
    <div style={{ height: "100vh", backgroundColor: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontFamily: font, fontSize: "0.9rem" }}>
      Loading...
    </div>
  );

  const totalMessages = messages.length;
  const totalConversations = conversations.length;

  const Sidebar = () => (
    <div style={{
      width: 220,
      minWidth: 220,
      backgroundColor: C.sidebar,
      borderRight: `1px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
      fontFamily: font,
    }}>
      {/* Brand */}
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
        <img src={rivetLogo} alt="Rivet AI" style={{ width: 28, height: 28, borderRadius: "6px", objectFit: "cover" }} />
        <span style={{ color: C.text, fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}>Rivet AI</span>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 0 }}>
            <Close sx={{ fontSize: 18 }} />
          </button>
        )}
      </div>

      {/* Nav */}
      <div style={{ padding: "12px 8px 8px" }}>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.id}
            onClick={() => { if (item.path) navigate(item.path); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "9px 10px",
              borderRadius: "8px",
              marginBottom: "2px",
              cursor: item.soon ? "default" : "pointer",
              backgroundColor: item.id === "chat" ? C.accentDim : "transparent",
              color: item.id === "chat" ? C.accentText : C.muted,
              transition: "background-color 0.15s",
              userSelect: "none",
            }}
            onMouseEnter={(e) => { if (item.id !== "chat" && !item.soon) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={(e) => { if (item.id !== "chat") e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            {item.icon}
            <span style={{ fontSize: "0.875rem", fontWeight: item.id === "chat" ? 600 : 400 }}>{item.label}</span>
            {item.soon && (
              <span style={{ marginLeft: "auto", fontSize: "0.6rem", fontWeight: 600, backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b", padding: "2px 6px", borderRadius: "4px", letterSpacing: "0.05em" }}>
                SOON
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Conversations */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px", scrollbarWidth: "thin", scrollbarColor: `${C.border} transparent` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 4px 6px" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Conversations</span>
          <Tooltip title="New conversation">
            <button
              onClick={handleNewConversation}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", borderRadius: "4px", padding: "2px" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
            >
              <Add sx={{ fontSize: 16 }} />
            </button>
          </Tooltip>
        </div>

        {conversations.length === 0 && (
          <div style={{ padding: "16px 8px", color: C.muted, fontSize: "0.78rem", textAlign: "center", lineHeight: 1.5 }}>
            No previous conversations found.
            <div style={{ marginTop: 6, color: C.mutedLight, fontSize: "0.72rem" }}>
              Send a message to start one.
            </div>
          </div>
        )}

        {conversations.map((conv) => (
          <div
            key={conv._id}
            onClick={() => handleSelectConversation(conv._id)}
            style={{
              padding: "7px 8px",
              borderRadius: "6px",
              marginBottom: "1px",
              cursor: "pointer",
              backgroundColor: currentConversationId === conv._id ? C.accentDim : "transparent",
              borderLeft: currentConversationId === conv._id ? `2px solid ${C.accent}` : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "background-color 0.1s",
            }}
            onMouseEnter={(e) => { if (currentConversationId !== conv._id) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={(e) => { if (currentConversationId !== conv._id) e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            {editingConvId === conv._id ? (
              <TextField
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleEditConversationTitle(conv._id)}
                onKeyPress={(e) => { if (e.key === "Enter") handleEditConversationTitle(conv._id); }}
                variant="standard"
                size="small"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                InputProps={{ disableUnderline: false, style: { color: C.text, fontSize: "0.8rem", fontFamily: font } }}
                sx={{ flex: 1, "& .MuiInput-underline:after": { borderBottomColor: C.accent } }}
              />
            ) : (
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: "0.8rem", color: currentConversationId === conv._id ? C.text : C.mutedLight, fontWeight: currentConversationId === conv._id ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {conv.title || "Untitled"}
                </span>
                {conv.updatedAt && (
                  <span style={{ fontSize: "0.65rem", color: C.muted }}>
                    {new Date(conv.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: "2px", flexShrink: 0, opacity: 0 }} className="conv-actions">
              <button
                onClick={(e) => { e.stopPropagation(); setEditingConvId(conv._id); setEditTitle(conv.title); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: "2px", borderRadius: "3px" }}
              >
                <EditIcon sx={{ fontSize: 12 }} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConversationToDelete(conv._id); setDeleteDialogOpen(true); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: "2px", borderRadius: "3px" }}
              >
                <Delete sx={{ fontSize: 12 }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div style={{ padding: "12px 8px", borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={handleClearHistory}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: C.error, fontFamily: font, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", borderRadius: "6px", opacity: 0.7 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
        >
          <DeleteForever sx={{ fontSize: 16 }} />
          Clear all history
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100vh", backgroundColor: C.bg, display: "flex", flexDirection: "column", fontFamily: font, overflow: "hidden", position: "fixed", inset: 0 }}>

      {/* ── TOP BAR ── */}
      <div style={{
        height: 52,
        backgroundColor: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: "12px",
        flexShrink: 0,
        zIndex: 10,
      }}>
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

        {/* User info (matching reference: name + plan on right) */}
        <button
          onClick={(e) => setAnchorEl(e.currentTarget)}
          style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "8px", cursor: "pointer", color: C.text, fontFamily: font, display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px 6px 8px" }}
        >
          <Avatar sx={{ width: 26, height: 26, backgroundColor: C.accent, fontSize: "0.75rem", fontWeight: 700 }}>
            {user?.username?.[0]?.toUpperCase()}
          </Avatar>
          {!isMobile && (
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{user?.username?.toUpperCase()}</div>
              <div style={{ fontSize: "0.65rem", color: C.muted }}>Free Plan</div>
            </div>
          )}
        </button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text, minWidth: 180, fontFamily: font } }}
        >
          {user?.isAdmin && (
            <MenuItem
              onClick={() => { setAnchorEl(null); navigate("/admin"); }}
              sx={{ fontFamily: font, fontSize: "0.875rem", gap: 1, color: C.mutedLight, "&:hover": { backgroundColor: "rgba(255,255,255,0.05)", color: C.text } }}
            >
              <AdminPanelSettings sx={{ fontSize: 16 }} /> Admin panel
            </MenuItem>
          )}
          <MenuItem
            onClick={handleLogout}
            sx={{ fontFamily: font, fontSize: "0.875rem", gap: 1, color: C.mutedLight, "&:hover": { backgroundColor: "rgba(255,255,255,0.05)", color: C.text } }}
          >
            <Logout sx={{ fontSize: 16 }} /> Logout
          </MenuItem>
        </Menu>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

        {/* Mobile overlay sidebar */}
        {isMobile && sidebarOpen && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex" }}>
            <div style={{ flex: "0 0 240px" }}><Sidebar /></div>
            <div style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Desktop sidebar */}
        {!isMobile && <Sidebar />}

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Chat area */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "20px 24px",
            display: "flex", flexDirection: "column", gap: "16px",
            scrollbarWidth: "thin", scrollbarColor: `${C.border} transparent`,
          }}>
            {messages.length === 0 && !isTyping && currentConversationId && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: C.muted, fontFamily: font, gap: 8, textAlign: "center", padding: "2rem 1rem" }}>
                <ChatBubbleIcon sx={{ fontSize: 36, opacity: 0.4 }} />
                <div style={{ fontSize: "0.95rem", fontWeight: 500, color: C.mutedLight }}>This conversation has no messages yet.</div>
                <div style={{ fontSize: "0.82rem" }}>Type a message below to get started.</div>
              </div>
            )}

            {messages.length === 0 && !isTyping && !newMessage.trim() && !currentConversationId && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "2rem 1.5rem",
                }}
              >
                <div style={{ width: "100%", maxWidth: 1040, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {/* Headline */}
                  <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                    <h1 style={{
                      fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: C.text,
                      margin: "0 0 0.6rem",
                      lineHeight: 1.15,
                    }}>
                      What can I help with today?
                    </h1>
                    <p style={{
                      fontSize: "clamp(0.95rem, 1.2vw, 1.05rem)",
                      color: C.mutedLight,
                      margin: 0,
                      lineHeight: 1.5,
                    }}>
                      Choose a path below to start a guided intake, tailored for NHS compliance.
                    </p>
                  </div>

                  {/* Path cards */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                    gap: "1.1rem",
                    width: "100%",
                    marginBottom: "2rem",
                  }}>
                    {TRIAGE_PATHS.map((path) => {
                      const isHover = hoveredPath === path.id;
                      return (
                        <button
                          key={path.id}
                          type="button"
                          onClick={() => handleStartPath(path)}
                          onMouseEnter={() => setHoveredPath(path.id)}
                          onMouseLeave={() => setHoveredPath(null)}
                          onFocus={() => setHoveredPath(path.id)}
                          onBlur={() => setHoveredPath(null)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            textAlign: "left",
                            padding: "1.4rem 1.3rem",
                            borderRadius: "14px",
                            backgroundColor: isHover ? C.cardHover : C.card,
                            border: `1px solid ${isHover ? C.accent : C.border}`,
                            transform: isHover ? "translateY(-3px)" : "translateY(0)",
                            boxShadow: isHover ? "0 12px 28px -12px rgba(0,0,0,0.55)" : "none",
                            transition: "background-color 0.25s, border-color 0.25s, transform 0.25s, box-shadow 0.25s",
                            cursor: "pointer",
                            fontFamily: font,
                            outline: "none",
                            minHeight: 200,
                          }}
                        >
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 44,
                            height: 44,
                            borderRadius: "10px",
                            marginBottom: "1rem",
                            backgroundColor: isHover ? C.accentDim : C.surface,
                            color: isHover ? C.accentText : C.mutedLight,
                            transition: "background-color 0.25s, color 0.25s",
                          }}>
                            {path.icon}
                          </div>
                          <h3 style={{
                            fontSize: "1.02rem",
                            fontWeight: 600,
                            color: C.text,
                            margin: "0 0 0.45rem",
                            letterSpacing: "-0.01em",
                          }}>
                            {path.title}
                          </h3>
                          <p style={{
                            fontSize: "0.83rem",
                            color: C.muted,
                            lineHeight: 1.55,
                            margin: "0 0 1.4rem",
                            flex: 1,
                          }}>
                            {path.description}
                          </p>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.82rem",
                            fontWeight: 500,
                            color: isHover ? C.accent : C.muted,
                            transform: isHover ? "translateX(4px)" : "translateX(0)",
                            transition: "color 0.25s, transform 0.25s",
                            marginTop: "auto",
                          }}>
                            Start path <ArrowForward sx={{ fontSize: 15 }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((msg, idx) => (
                <React.Fragment key={msg._id || idx}>
                  {/* USER */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        backgroundColor: C.userBubble,
                        border: `1px solid ${C.userBubbleBorder}`,
                        borderRadius: "12px 12px 2px 12px",
                        padding: "10px 14px",
                        maxWidth: "72%",
                        color: C.text,
                        fontSize: "0.9rem",
                        lineHeight: 1.55,
                        wordBreak: "break-word",
                      }}
                    >
                      <div>{msg.message}</div>
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", textAlign: "right", marginTop: "4px" }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </motion.div>
                  </div>

                  {/* AI */}
                  {msg.response && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "80%" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <img src={rivetLogo} alt="AI" style={{ width: 24, height: 24, borderRadius: "6px", objectFit: "cover", flexShrink: 0, marginTop: "2px" }} />
                        <motion.div
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: 0.05 }}
                          style={{
                            backgroundColor: C.aiBubble,
                            border: `1px solid ${C.aiBubbleBorder}`,
                            borderRadius: "2px 12px 12px 12px",
                            padding: "10px 14px",
                            color: C.text,
                            fontSize: "0.9rem",
                            lineHeight: 1.65,
                            wordBreak: "break-word",
                            whiteSpace: "pre-line",
                          }}
                        >
                          {msg.response}
                          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "6px" }}>
                            Rivet Agent · {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </motion.div>
                      </div>
                      <div style={{ display: "flex", gap: "4px", marginLeft: "34px" }}>
                        <Tooltip title={copiedId === msg.response ? "Copied!" : "Copy"}>
                          <button onClick={() => handleCopyMessage(msg.response)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: "4px", borderRadius: "4px" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                          >
                            {copiedId === msg.response ? <Check sx={{ fontSize: 13 }} /> : <ContentCopy sx={{ fontSize: 13 }} />}
                          </button>
                        </Tooltip>
                        <Tooltip title="Regenerate">
                          <button onClick={() => handleRegenerateResponse(msg._id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: "4px", borderRadius: "4px" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                          >
                            <Refresh sx={{ fontSize: 13 }} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </AnimatePresence>

            {isTyping && (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <img src={rivetLogo} alt="AI" style={{ width: 24, height: 24, borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                <div style={{ backgroundColor: C.aiBubble, border: `1px solid ${C.aiBubbleBorder}`, borderRadius: "2px 12px 12px 12px", padding: "10px 14px" }}>
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── INPUT BAR ── */}
          <div style={{
            padding: "14px 24px 16px",
            borderTop: `1px solid ${C.border}`,
            backgroundColor: C.surface,
            flexShrink: 0,
          }}>
            <form
              onSubmit={handleSendMessage}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: "10px",
                padding: "4px 8px 4px 14px",
                transition: "border-color 0.2s",
              }}
              onFocusCapture={(e) => (e.currentTarget.style.borderColor = C.accent)}
              onBlurCapture={(e) => (e.currentTarget.style.borderColor = C.border)}
            >
              <TextField
                fullWidth
                placeholder="Ask anything about NHS compliance..."
                multiline
                maxRows={4}
                variant="standard"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
                }}
                InputProps={{ disableUnderline: true, style: { color: C.text, fontFamily: font, fontSize: "0.9rem" } }}
                inputRef={inputRef}
                sx={{ flex: 1 }}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isTyping}
                style={{
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  backgroundColor: newMessage.trim() && !isTyping ? C.accent : "transparent",
                  color: newMessage.trim() && !isTyping ? "#fff" : C.muted,
                  border: `1px solid ${newMessage.trim() && !isTyping ? C.accent : C.border}`,
                  borderRadius: "6px",
                  cursor: newMessage.trim() && !isTyping ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (newMessage.trim() && !isTyping) e.currentTarget.style.backgroundColor = "#4a7de0"; }}
                onMouseLeave={(e) => { if (newMessage.trim() && !isTyping) e.currentTarget.style.backgroundColor = C.accent; }}
              >
                <Send sx={{ fontSize: 16 }} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── DELETE DIALOG ── */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", color: C.text, fontFamily: font } }}
      >
        <DialogTitle sx={{ fontFamily: font, fontSize: "1rem", fontWeight: 700 }}>Delete Conversation?</DialogTitle>
        <DialogContent>
          <p style={{ color: C.muted, fontSize: "0.875rem", margin: 0 }}>This will permanently delete this conversation and all its messages.</p>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ fontFamily: font, color: C.muted, textTransform: "none", fontSize: "0.875rem" }}>Cancel</Button>
          <Button onClick={handleDeleteConversation} sx={{ fontFamily: font, color: C.error, textTransform: "none", fontSize: "0.875rem" }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <style>{`
        textarea::placeholder { color: #374151 !important; }
        .conv-actions { opacity: 0; }
        div:hover > .conv-actions { opacity: 1 !important; }
      `}</style>
    </div>
  );
};

export default Chat;
