require("dotenv").config();

// ── Environment validation ─────────────────────────────────────────────
// Fail fast with a clear message if required env vars are missing, rather
// than crashing later with a cryptic stack trace. See .env.example for docs.
(function validateEnv() {
  const required = {
    MONGODB_URI: "MongoDB connection string",
    JWT_SECRET: "Secret used to sign JWT auth tokens",
  };
  const missing = Object.entries(required)
    .filter(([key]) => !process.env[key])
    .map(([key, desc]) => `  - ${key}  (${desc})`);

  // Gemini key has two accepted names — accept either.
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    missing.push("  - GEMINI_API_KEY (or GOOGLE_API_KEY)  — Google Gemini API key, powers chat & projects");
  }

  if (missing.length) {
    console.error("\n[startup] Missing required environment variables:");
    console.error(missing.join("\n"));
    console.error("\nCopy server/.env.example to server/.env and fill in values, ");
    console.error("or set them in your hosting provider's secrets pane.\n");
    process.exit(1);
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn("[startup] GOOGLE_CLIENT_ID not set — \"Continue with Google\" sign-in will be disabled.");
  }
})();

const express = require("express");
const { resolve } = require("path");
const cors = require("cors");
const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const projectRoutes = require("./routes/projectRoutes");

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("static"));

const clientDist = resolve(__dirname, "../client/dist");
app.use(
  express.static(clientDist, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
      }
    },
  }),
);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "rivet-ai",
    voice: true,
    dubcallAdmin: true,
    promote: "piyushmodi",
  });
});

app.get("/", (req, res) => {
  const indexHtml = resolve(clientDist, "index.html");
  const fallback = resolve(__dirname, "pages/index.html");
  const fs = require("fs");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(fs.existsSync(indexHtml) ? indexHtml : fallback);
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/voice", require("./routes/voiceRoutes"));

// SPA fallback — all non-API routes serve the React app
app.get("*", (req, res) => {
  const fs = require("fs");
  const indexHtml = resolve(clientDist, "index.html");
  if (fs.existsSync(indexHtml)) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(indexHtml);
  } else {
    res.sendFile(resolve(__dirname, "pages/index.html"));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Connect to DB first, THEN start server
connectDB().then(async () => {
  const { initIntegrations } = require('./controllers/adminController');
  await initIntegrations();
  const { ensureAdmins } = require('./utils/admins');
  await ensureAdmins();

  app.listen(port, () => {
    console.log(`Chat API server listening at http://localhost:${port}`);
  });
});
