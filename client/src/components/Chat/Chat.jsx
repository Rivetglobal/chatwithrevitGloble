import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField,
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
  ContentCopy,
  Add,
  Edit as EditIcon,
  Delete,
  Refresh,
  Check,
  DeleteForever,
  Chat as ChatBubbleIcon,
  MenuBook,
  FindInPage,
  VerifiedUser,
  ArrowForward,
  GraphicEq,
  ChatBubbleOutline,
} from "@mui/icons-material";
import { motion as Motion, AnimatePresence } from "framer-motion";
import authService from "../../services/authService";
import chatService from "../../services/chatService";
import conversationService from "../../services/conversationService";
import rivetLogo from "../../assets/rivetGlobalpng.png";
import AppShell from "../Layout/AppShell";
import VoiceMode from "./VoiceMode";
import { C, font, dialogPaperSx } from "../../theme";

const TypingIndicator = () => (
  <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "4px 0" }}>
    {[0, 1, 2].map((i) => (
      <Motion.div
        key={i}
        style={{ width: 6, height: 6, backgroundColor: C.accent, borderRadius: "50%", opacity: 0.7 }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
      />
    ))}
  </div>
);

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [mode, setMode] = useState("chat");

  const messagesEndRef = useRef(null);
  const conversationIdRef = useRef(null);
  const inputRef = useRef(null);
  const [hoveredPath, setHoveredPath] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!authService.isAuthenticated()) { navigate("/login"); return; }
        const userData = await authService.getProfile();
        setUser(userData);
      } catch (err) {
        console.error("Auth/profile load failed:", err);
        navigate("/login");
        return;
      }
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
    conversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

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
    setMessages([]);
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

  const handleVoiceTurn = useCallback(async (text, convId) => {
    const response = await chatService.sendMessage(text, convId || conversationIdRef.current, { source: "voice" });
    const newChat = {
      _id: response.chatId,
      conversationId: response.conversationId,
      message: text,
      response: response.message,
      timestamp: new Date().toISOString(),
      metadata: { model: "rivet-voice", tokens: response.tokens, source: "voice" },
    };
    setCurrentConversationId(response.conversationId);
    conversationIdRef.current = response.conversationId;
    setMessages((prev) => [...prev, newChat]);
    try {
      const convData = await conversationService.getConversations();
      setConversations(convData.conversations || []);
    } catch { /* sidebar refresh is best-effort */ }
    return response.message;
  }, []);

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

  const currentTitle = conversations.find((c) => c._id === currentConversationId)?.title;

  const sidebarExtra = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 6px 8px" }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.sidebarMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Threads
        </span>
        <Tooltip title="New conversation">
          <button
            type="button"
            onClick={handleNewConversation}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.sidebarMuted, display: "flex", borderRadius: 4, padding: 2 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#5EEAD4")}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.sidebarMuted)}
          >
            <Add sx={{ fontSize: 16 }} />
          </button>
        </Tooltip>
      </div>

      {conversations.length === 0 && (
        <div style={{ padding: "14px 8px", color: C.sidebarMuted, fontSize: "0.78rem", textAlign: "center", lineHeight: 1.5 }}>
          No conversations yet.
          <div style={{ marginTop: 6, fontSize: "0.72rem", opacity: 0.85 }}>
            Send a message to start one.
          </div>
        </div>
      )}

      {conversations.map((conv) => (
        <div
          key={conv._id}
          onClick={() => handleSelectConversation(conv._id)}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            marginBottom: 2,
            cursor: "pointer",
            backgroundColor: currentConversationId === conv._id ? "rgba(13,148,136,0.16)" : "transparent",
            borderLeft: currentConversationId === conv._id ? "2px solid #5EEAD4" : "2px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => { if (currentConversationId !== conv._id) e.currentTarget.style.backgroundColor = C.sidebarHover; }}
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
              InputProps={{ disableUnderline: false, style: { color: C.sidebarText, fontSize: "0.8rem", fontFamily: font } }}
              sx={{ flex: 1, "& .MuiInput-underline:after": { borderBottomColor: "#5EEAD4" } }}
            />
          ) : (
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: "0.8rem", color: currentConversationId === conv._id ? C.sidebarText : C.sidebarMuted, fontWeight: currentConversationId === conv._id ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {conv.title || "Untitled"}
              </span>
              {conv.updatedAt && (
                <span style={{ fontSize: "0.65rem", color: C.sidebarMuted, opacity: 0.85 }}>
                  {new Date(conv.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 2, flexShrink: 0, opacity: 0 }} className="conv-actions">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditingConvId(conv._id); setEditTitle(conv.title); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.sidebarMuted, display: "flex", padding: 2, borderRadius: 3 }}
            >
              <EditIcon sx={{ fontSize: 12 }} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConversationToDelete(conv._id); setDeleteDialogOpen(true); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.sidebarMuted, display: "flex", padding: 2, borderRadius: 3 }}
            >
              <Delete sx={{ fontSize: 12 }} />
            </button>
          </div>
        </div>
      ))}
    </>
  );

  const sidebarFooter = (
    <button
      type="button"
      onClick={handleClearHistory}
      style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "#FCA5A5", fontFamily: font, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 8, opacity: 0.85 }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.85)}
    >
      <DeleteForever sx={{ fontSize: 16 }} />
      Clear all history
    </button>
  );

  const modeToggle = (
    <div
      role="tablist"
      aria-label="Conversation mode"
      style={{
        display: "flex",
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {[
        { id: "chat", label: "Chat", icon: <ChatBubbleOutline sx={{ fontSize: 15 }} /> },
        { id: "voice", label: "Voice", icon: <GraphicEq sx={{ fontSize: 15 }} /> },
      ].map((opt) => {
        const selected = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setMode(opt.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: font,
              fontSize: "0.78rem",
              fontWeight: 650,
              background: selected ? C.surface : "transparent",
              color: selected ? C.text : C.muted,
              boxShadow: selected ? "0 1px 2px rgba(15,23,42,0.08)" : "none",
            }}
          >
            {opt.icon} {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <AppShell
      user={user}
      active="chat"
      title={mode === "voice" ? "Voice" : (currentTitle || "Conversations")}
      subtitle={mode === "voice" ? "Talk with Rivet" : "NHS compliance assistant"}
      loading={loading}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      sidebarExtra={sidebarExtra}
      sidebarFooter={sidebarFooter}
      topBarRight={modeToggle}
    >
      {mode === "voice" ? (
        <VoiceMode
          conversationId={currentConversationId}
          user={user}
          onTurn={handleVoiceTurn}
        />
      ) : (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="rv-scroll" style={{
          flex: 1, overflowY: "auto", padding: "24px 28px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {messages.length === 0 && !isTyping && currentConversationId && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: C.muted, fontFamily: font, gap: 8, textAlign: "center", padding: "2rem 1rem" }}>
              <ChatBubbleIcon sx={{ fontSize: 36, opacity: 0.35 }} />
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: C.text }}>This conversation has no messages yet.</div>
              <div style={{ fontSize: "0.82rem" }}>Type a message below to get started.</div>
            </div>
          )}

          {messages.length === 0 && !isTyping && !newMessage.trim() && !currentConversationId && (
            <Motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "2rem 1.5rem" }}
            >
              <div style={{ width: "100%", maxWidth: 1040, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
                  <p style={{ margin: "0 0 10px", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.accent }}>
                    Compliance House
                  </p>
                  <h1 style={{
                    fontSize: "clamp(1.6rem, 3vw, 2.15rem)",
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                    color: C.text,
                    margin: "0 0 0.6rem",
                    lineHeight: 1.15,
                  }}>
                    How can I help today?
                  </h1>
                  <p style={{ fontSize: "1rem", color: C.muted, margin: 0, lineHeight: 1.55, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
                    Choose a guided path, or ask anything about NHS regulations, inspections, and policy.
                  </p>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: "1rem",
                  width: "100%",
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
                          padding: "1.35rem 1.25rem",
                          borderRadius: 14,
                          backgroundColor: C.card,
                          border: `1px solid ${isHover ? C.accent : C.border}`,
                          transform: isHover ? "translateY(-2px)" : "translateY(0)",
                          boxShadow: isHover ? C.shadow : "0 1px 2px rgba(15,23,42,0.04)",
                          transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                          cursor: "pointer",
                          fontFamily: font,
                          outline: "none",
                          minHeight: 196,
                        }}
                      >
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          marginBottom: "1rem",
                          backgroundColor: isHover ? C.accentDim : C.bg,
                          color: isHover ? C.accent : C.muted,
                        }}>
                          {path.icon}
                        </div>
                        <h3 style={{ fontSize: "1rem", fontWeight: 650, color: C.text, margin: "0 0 0.4rem", letterSpacing: "-0.015em" }}>
                          {path.title}
                        </h3>
                        <p style={{ fontSize: "0.83rem", color: C.muted, lineHeight: 1.55, margin: "0 0 1.2rem", flex: 1 }}>
                          {path.description}
                        </p>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: isHover ? C.accent : C.muted,
                          marginTop: "auto",
                        }}>
                          Start path <ArrowForward sx={{ fontSize: 15 }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Motion.div>
          )}

          <AnimatePresence>
            {messages.map((msg, idx) => (
              <React.Fragment key={msg._id || idx}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      backgroundColor: C.userBubble,
                      border: `1px solid ${C.userBubbleBorder}`,
                      borderRadius: "12px 12px 3px 12px",
                      padding: "10px 14px",
                      maxWidth: "72%",
                      color: C.userBubbleText,
                      fontSize: "0.9rem",
                      lineHeight: 1.55,
                      wordBreak: "break-word",
                      boxShadow: "0 1px 2px rgba(11,37,69,0.12)",
                    }}
                  >
                    <div>{msg.message}</div>
                    <div style={{ fontSize: "0.65rem", color: "rgba(248,250,252,0.55)", textAlign: "right", marginTop: 4 }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </Motion.div>
                </div>

                {msg.response && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "80%" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <img src={rivetLogo} alt="" style={{ width: 28, height: 28, borderRadius: 7, objectFit: "cover", flexShrink: 0, marginTop: 2, border: `1px solid ${C.border}` }} />
                      <Motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: 0.05 }}
                        style={{
                          backgroundColor: C.aiBubble,
                          border: `1px solid ${C.aiBubbleBorder}`,
                          borderRadius: "3px 12px 12px 12px",
                          padding: "12px 16px",
                          color: C.text,
                          fontSize: "0.9rem",
                          lineHeight: 1.65,
                          wordBreak: "break-word",
                          whiteSpace: "pre-line",
                          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                        }}
                      >
                        {msg.response}
                        <div style={{ fontSize: "0.65rem", color: C.muted, marginTop: 8 }}>
                          Rivet Agent · {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </Motion.div>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginLeft: 38 }}>
                      <Tooltip title={copiedId === msg.response ? "Copied!" : "Copy"}>
                        <button type="button" onClick={() => handleCopyMessage(msg.response)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 4, borderRadius: 4 }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = C.accent)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                        >
                          {copiedId === msg.response ? <Check sx={{ fontSize: 13 }} /> : <ContentCopy sx={{ fontSize: 13 }} />}
                        </button>
                      </Tooltip>
                      <Tooltip title="Regenerate">
                        <button type="button" onClick={() => handleRegenerateResponse(msg._id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 4, borderRadius: 4 }}
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
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <img src={rivetLogo} alt="" style={{ width: 28, height: 28, borderRadius: 7, objectFit: "cover", flexShrink: 0, border: `1px solid ${C.border}` }} />
              <div style={{ backgroundColor: C.aiBubble, border: `1px solid ${C.aiBubbleBorder}`, borderRadius: "3px 12px 12px 12px", padding: "10px 14px" }}>
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div style={{
          padding: "14px 24px 18px",
          borderTop: `1px solid ${C.border}`,
          backgroundColor: C.surface,
          flexShrink: 0,
        }}>
          <form
            onSubmit={handleSendMessage}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "6px 8px 6px 16px",
              maxWidth: 920,
              margin: "0 auto",
            }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = C.border)}
          >
            <TextField
              fullWidth
              placeholder="Ask about NHS compliance, CQC, or policy…"
              multiline
              maxRows={4}
              variant="standard"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
              }}
              InputProps={{ disableUnderline: true, style: { color: C.text, fontFamily: font, fontSize: "0.92rem" } }}
              inputRef={inputRef}
              sx={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isTyping}
              aria-label="Send message"
              style={{
                flexShrink: 0,
                width: 38,
                height: 38,
                backgroundColor: newMessage.trim() && !isTyping ? C.accent : "transparent",
                color: newMessage.trim() && !isTyping ? "#fff" : C.muted,
                border: `1px solid ${newMessage.trim() && !isTyping ? C.accent : C.border}`,
                borderRadius: 9,
                cursor: newMessage.trim() && !isTyping ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send sx={{ fontSize: 16 }} />
            </button>
          </form>
        </div>
      </div>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: dialogPaperSx }}
      >
        <DialogTitle sx={{ fontFamily: font, fontSize: "1.05rem", fontWeight: 700 }}>Delete conversation?</DialogTitle>
        <DialogContent>
          <p style={{ color: C.muted, fontSize: "0.875rem", margin: 0, lineHeight: 1.55 }}>This permanently deletes the conversation and all of its messages.</p>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ fontFamily: font, color: C.muted, fontSize: "0.875rem" }}>Cancel</Button>
          <Button onClick={handleDeleteConversation} sx={{ fontFamily: font, color: C.error, fontSize: "0.875rem" }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <style>{`
        textarea::placeholder { color: #94a3b8 !important; }
        .conv-actions { opacity: 0; }
        div:hover > .conv-actions { opacity: 1 !important; }
      `}</style>
    </AppShell>
  );
};

export default Chat;
