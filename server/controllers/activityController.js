const UsageDaily = require("../models/UsageDaily");
const User = require("../models/User");
const { TOOLS } = UsageDaily;
const {
  getHistoricalUsageRows,
  getUserActivityStats,
  aggregateLastSeenByUser,
  getDatabaseTotals,
  USAGE_BACKFILL_VERSION,
  MESSAGE_TOOLS,
} = require("../utils/usageBackfill");

const TOOL_LABELS = {
  chat: "Chat",
  voice: "Voice",
  projects: "Projects",
  profile: "Profile",
  admin: "Admin",
};

const HEARTBEAT_ONLY_TOOLS = new Set(["profile", "admin"]);

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function daysAgoKey(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return utcDateKey(d);
}

function emptyByTool() {
  return Object.fromEntries(TOOLS.map((t) => [t, 0]));
}

function emptyMessageByTool() {
  return Object.fromEntries(TOOLS.map((t) => [t, 0]));
}

exports.heartbeat = async (req, res) => {
  try {
    const tool = String(req.body?.tool || "").toLowerCase();
    let seconds = Number(req.body?.seconds);
    if (!TOOLS.includes(tool)) {
      return res.status(400).json({ error: "Unknown tool." });
    }
    if (!Number.isFinite(seconds) || seconds < 1) {
      return res.json({ ok: true, ignored: true });
    }
    seconds = Math.min(Math.round(seconds), 120);

    try {
      await UsageDaily.findOneAndUpdate(
        { userId: req.user._id, date: utcDateKey(), tool },
        { $inc: { seconds }, $set: { lastSeenAt: new Date() } },
        { upsert: true },
      );
    } catch (dup) {
      if (dup?.code !== 11000) throw dup;
      await UsageDaily.findOneAndUpdate(
        { userId: req.user._id, date: utcDateKey(), tool },
        { $inc: { seconds }, $set: { lastSeenAt: new Date() } },
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("activity heartbeat:", err);
    res.status(500).json({ error: "Failed to record activity." });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const rawDays = String(req.query?.days || "30");
    const allTime = rawDays === "all";
    const days = allTime ? 0 : Math.min(Math.max(parseInt(rawDays, 10) || 30, 1), 365);

    const match = {};
    if (!allTime) match.date = { $gte: daysAgoKey(days) };

    const fromDate = allTime ? null : daysAgoKey(days);
    const rangeOpts = { fromDate, allTime };

    const [rows, people, historicalRows, activityStats, lastSeenByUser, dataSource] = await Promise.all([
      UsageDaily.find(match).lean(),
      User.find().select("name username email picture isAdmin createdAt").lean(),
      getHistoricalUsageRows(rangeOpts),
      getUserActivityStats(rangeOpts),
      aggregateLastSeenByUser(),
      getDatabaseTotals(),
    ]);

    const byUser = new Map();
    for (const person of people) {
      byUser.set(String(person._id), {
        id: person._id,
        name: person.name || "",
        username: person.username,
        email: person.email,
        picture: person.picture || null,
        isAdmin: !!person.isAdmin,
        createdAt: person.createdAt,
        totalSeconds: 0,
        lastSeenAt: null,
        byTool: emptyByTool(),
        messagesByTool: emptyMessageByTool(),
        totalMessages: 0,
        conversations: 0,
        projects: 0,
      });
    }

    const toolTotals = emptyByTool();
    const messageTotals = emptyMessageByTool();
    let grandSeconds = 0;
    let grandMessages = 0;
    let lastActivityAt = null;

    const applyUsageRow = (row) => {
      const uid = String(row.userId);
      let entry = byUser.get(uid);
      if (!entry) {
        entry = {
          id: row.userId,
          name: "",
          username: "unknown",
          email: "",
          picture: null,
          isAdmin: false,
          createdAt: null,
          totalSeconds: 0,
          lastSeenAt: null,
          byTool: emptyByTool(),
          messagesByTool: emptyMessageByTool(),
          totalMessages: 0,
          conversations: 0,
          projects: 0,
        };
        byUser.set(uid, entry);
      }
      const secs = Number(row.seconds) || 0;
      if (!TOOLS.includes(row.tool)) return;
      entry.byTool[row.tool] += secs;
      entry.totalSeconds += secs;
      toolTotals[row.tool] += secs;
      grandSeconds += secs;
      const seen = row.lastSeenAt ? new Date(row.lastSeenAt) : null;
      if (seen && (!entry.lastSeenAt || seen > entry.lastSeenAt)) entry.lastSeenAt = seen;
      if (seen && (!lastActivityAt || seen > lastActivityAt)) lastActivityAt = seen;
    };

    for (const row of rows) {
      if (HEARTBEAT_ONLY_TOOLS.has(row.tool)) applyUsageRow(row);
    }
    for (const row of historicalRows) applyUsageRow(row);

    for (const [uid, stats] of activityStats.entries()) {
      const entry = byUser.get(uid);
      if (!entry) continue;
      entry.conversations = stats.conversations || 0;
      entry.projects = stats.projects || 0;
      entry.totalMessages = stats.messages?.total || 0;
      for (const tool of MESSAGE_TOOLS) {
        entry.messagesByTool[tool] = stats.messages?.[tool] || 0;
        messageTotals[tool] += stats.messages?.[tool] || 0;
      }
      grandMessages += entry.totalMessages;
      const seen = stats.lastSeenAt ? new Date(stats.lastSeenAt) : null;
      if (seen && (!entry.lastSeenAt || seen > entry.lastSeenAt)) entry.lastSeenAt = seen;
      if (seen && (!lastActivityAt || seen > lastActivityAt)) lastActivityAt = seen;
    }

    for (const [uid, seen] of lastSeenByUser.entries()) {
      const entry = byUser.get(uid);
      if (!entry) continue;
      if (seen && (!entry.lastSeenAt || seen > entry.lastSeenAt)) entry.lastSeenAt = seen;
      if (seen && (!lastActivityAt || seen > lastActivityAt)) lastActivityAt = seen;
    }

    const users = Array.from(byUser.values()).sort((a, b) => {
      if (b.totalSeconds !== a.totalSeconds) return b.totalSeconds - a.totalSeconds;
      return b.totalMessages - a.totalMessages;
    });
    users.forEach((u, i) => { u.rank = i + 1; });

    const toolRanking = TOOLS
      .map((tool) => ({
        tool,
        label: TOOL_LABELS[tool],
        seconds: toolTotals[tool],
        messages: messageTotals[tool] || 0,
        share: grandSeconds ? toolTotals[tool] / grandSeconds : 0,
      }))
      .sort((a, b) => b.seconds - a.seconds)
      .map((row, i) => ({ ...row, rank: i + 1 }));

    const activeUsers = users.filter((u) => u.totalSeconds > 0 || u.totalMessages > 0).length;

    res.json({
      backfillVersion: USAGE_BACKFILL_VERSION,
      dataSource: {
        ...dataSource,
        backfillVersion: USAGE_BACKFILL_VERSION,
      },
      range: {
        days: allTime ? null : days,
        allTime,
        from: allTime ? null : daysAgoKey(days),
        to: utcDateKey(),
      },
      totals: {
        seconds: grandSeconds,
        messages: grandMessages,
        users: people.length,
        activeUsers,
        lastActivityAt,
      },
      tools: toolRanking,
      mostUsed: toolRanking[0] || null,
      leastUsed: [...toolRanking].reverse()[0] || null,
      users,
    });
  } catch (err) {
    console.error("activity dashboard:", err);
    res.status(500).json({ error: "Failed to load usage dashboard." });
  }
};
