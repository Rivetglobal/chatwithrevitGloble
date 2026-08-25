const UsageDaily = require("../models/UsageDaily");
const User = require("../models/User");
const { TOOLS } = UsageDaily;

const TOOL_LABELS = {
  chat: "Chat",
  voice: "Voice",
  projects: "Projects",
  profile: "Profile",
  admin: "Admin",
};

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

    const [rows, people] = await Promise.all([
      UsageDaily.find(match).lean(),
      User.find().select("name username email picture isAdmin createdAt").lean(),
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
      });
    }

    const toolTotals = emptyByTool();
    let grandSeconds = 0;
    let lastActivityAt = null;

    for (const row of rows) {
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
        };
        byUser.set(uid, entry);
      }
      const secs = Number(row.seconds) || 0;
      if (!TOOLS.includes(row.tool)) continue;
      entry.byTool[row.tool] += secs;
      entry.totalSeconds += secs;
      toolTotals[row.tool] += secs;
      grandSeconds += secs;
      const seen = row.lastSeenAt ? new Date(row.lastSeenAt) : null;
      if (seen && (!entry.lastSeenAt || seen > entry.lastSeenAt)) entry.lastSeenAt = seen;
      if (seen && (!lastActivityAt || seen > lastActivityAt)) lastActivityAt = seen;
    }

    const users = Array.from(byUser.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
    users.forEach((u, i) => { u.rank = i + 1; });

    const toolRanking = TOOLS
      .map((tool) => ({
        tool,
        label: TOOL_LABELS[tool],
        seconds: toolTotals[tool],
        share: grandSeconds ? toolTotals[tool] / grandSeconds : 0,
      }))
      .sort((a, b) => b.seconds - a.seconds)
      .map((row, i) => ({ ...row, rank: i + 1 }));

    const activeUsers = users.filter((u) => u.totalSeconds > 0).length;

    res.json({
      range: {
        days: allTime ? null : days,
        allTime,
        from: allTime ? null : daysAgoKey(days),
        to: utcDateKey(),
      },
      totals: {
        seconds: grandSeconds,
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
