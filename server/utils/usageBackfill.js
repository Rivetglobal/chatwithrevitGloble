const Chat = require("../models/Chat");
const Conversation = require("../models/Conversation");
const Project = require("../models/Project");
const { TOOLS } = require("../models/UsageDaily");

/** Bump when backfill logic changes — visible on GET /api/health */
const USAGE_BACKFILL_VERSION = 3;

const SECONDS_PER_CHAT = 60;
const SECONDS_PER_VOICE = 120;
const SECONDS_PER_PROJECT_MSG = 90;
const SECONDS_PER_CONVERSATION = 45;

/** Chat/voice/projects come from message history; profile/admin from live heartbeats. */
const MESSAGE_TOOLS = new Set(["chat", "voice", "projects"]);

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function buildTimestampMatch(fromDate, toDateInclusive) {
  const match = {};
  if (fromDate || toDateInclusive) {
    match.timestamp = {};
    if (fromDate) match.timestamp.$gte = new Date(`${fromDate}T00:00:00.000Z`);
    if (toDateInclusive) {
      const end = new Date(`${toDateInclusive}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      match.timestamp.$lt = end;
    }
  }
  return match;
}

function buildDateMatch(fromDate, toDateInclusive, field = "updatedAt") {
  const match = {};
  if (fromDate || toDateInclusive) {
    match[field] = {};
    if (fromDate) match[field].$gte = new Date(`${fromDate}T00:00:00.000Z`);
    if (toDateInclusive) {
      const end = new Date(`${toDateInclusive}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      match[field].$lt = end;
    }
  }
  return match;
}

function emptyMessageCounts() {
  return { chat: 0, voice: 0, projects: 0, total: 0 };
}

async function loadProjectConversationIds() {
  const rows = await Conversation.find({ projectId: { $ne: null } }).select("_id").lean();
  return rows.map((row) => row._id);
}

/**
 * Real usage from stored chat messages (all dates, including today).
 * Uses $in against project conversation ids — no cross-collection $lookup.
 */
async function aggregateChatUsage(fromDate, toDateInclusive) {
  const match = buildTimestampMatch(fromDate, toDateInclusive);
  const projectConvIds = await loadProjectConversationIds();

  const rows = await Chat.aggregate([
    { $match: match },
    {
      $addFields: {
        dateKey: {
          $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "UTC" },
        },
        tool: {
          $cond: [
            { $eq: ["$metadata.source", "voice"] },
            "voice",
            {
              $cond: [
                projectConvIds.length
                  ? { $in: ["$conversationId", projectConvIds] }
                  : false,
                "projects",
                "chat",
              ],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        msgSeconds: {
          $switch: {
            branches: [
              { case: { $eq: ["$tool", "voice"] }, then: SECONDS_PER_VOICE },
              { case: { $eq: ["$tool", "projects"] }, then: SECONDS_PER_PROJECT_MSG },
            ],
            default: SECONDS_PER_CHAT,
          },
        },
      },
    },
    {
      $group: {
        _id: { userId: "$userId", date: "$dateKey", tool: "$tool" },
        seconds: { $sum: "$msgSeconds" },
        messages: { $sum: 1 },
        lastSeenAt: { $max: "$timestamp" },
      },
    },
  ]);

  return rows.map((row) => ({
    userId: row._id.userId,
    date: row._id.date,
    tool: row._id.tool,
    seconds: row.seconds,
    messages: row.messages,
    lastSeenAt: row.lastSeenAt,
  }));
}

/** Credit time for conversations that exist but have zero stored messages yet. */
async function aggregateConversationUsage(fromDate, toDateInclusive) {
  const match = buildDateMatch(fromDate, toDateInclusive, "updatedAt");
  match.projectId = null;

  const rows = await Conversation.aggregate([
    { $match: match },
    {
      $lookup: {
        from: Chat.collection.name,
        localField: "_id",
        foreignField: "conversationId",
        as: "msgs",
      },
    },
    { $match: { msgs: { $size: 0 } } },
    {
      $addFields: {
        dateKey: {
          $dateToString: { format: "%Y-%m-%d", date: "$updatedAt", timezone: "UTC" },
        },
      },
    },
    {
      $group: {
        _id: { userId: "$userId", date: "$dateKey" },
        seconds: { $sum: SECONDS_PER_CONVERSATION },
        lastSeenAt: { $max: "$updatedAt" },
      },
    },
  ]);

  return rows.map((row) => ({
    userId: row._id.userId,
    date: row._id.date,
    tool: "chat",
    seconds: row.seconds,
    messages: 0,
    lastSeenAt: row.lastSeenAt,
  }));
}

/** Per-user message counts and conversation/project totals for the selected range. */
async function aggregateUserActivityStats(fromDate, toDateInclusive) {
  const chatMatch = buildTimestampMatch(fromDate, toDateInclusive);
  const convMatch = buildDateMatch(fromDate, toDateInclusive, "updatedAt");
  const projectMatch = buildDateMatch(fromDate, toDateInclusive, "updatedAt");
  const projectConvIds = await loadProjectConversationIds();

  const [messageRows, conversationRows, projectRows] = await Promise.all([
    Chat.aggregate([
      { $match: chatMatch },
      {
        $addFields: {
          tool: {
            $cond: [
              { $eq: ["$metadata.source", "voice"] },
              "voice",
              {
                $cond: [
                  projectConvIds.length
                    ? { $in: ["$conversationId", projectConvIds] }
                    : false,
                  "projects",
                  "chat",
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: { userId: "$userId", tool: "$tool" },
          count: { $sum: 1 },
          lastSeenAt: { $max: "$timestamp" },
        },
      },
    ]),
    Conversation.aggregate([
      { $match: convMatch },
      {
        $group: {
          _id: "$userId",
          conversations: { $sum: 1 },
          lastSeenAt: { $max: "$updatedAt" },
        },
      },
    ]),
    Project.aggregate([
      { $match: projectMatch },
      {
        $group: {
          _id: "$userId",
          projects: { $sum: 1 },
          lastSeenAt: { $max: "$updatedAt" },
        },
      },
    ]),
  ]);

  const byUser = new Map();

  const ensure = (userId) => {
    const uid = String(userId);
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        messages: emptyMessageCounts(),
        conversations: 0,
        projects: 0,
        lastSeenAt: null,
      });
    }
    return byUser.get(uid);
  };

  for (const row of messageRows) {
    const entry = ensure(row._id.userId);
    const tool = row._id.tool;
    if (MESSAGE_TOOLS.has(tool)) {
      entry.messages[tool] += row.count;
      entry.messages.total += row.count;
    }
    const seen = row.lastSeenAt ? new Date(row.lastSeenAt) : null;
    if (seen && (!entry.lastSeenAt || seen > entry.lastSeenAt)) entry.lastSeenAt = seen;
  }

  for (const row of conversationRows) {
    const entry = ensure(row._id);
    entry.conversations = row.conversations;
    const seen = row.lastSeenAt ? new Date(row.lastSeenAt) : null;
    if (seen && (!entry.lastSeenAt || seen > entry.lastSeenAt)) entry.lastSeenAt = seen;
  }

  for (const row of projectRows) {
    const entry = ensure(row._id);
    entry.projects = row.projects;
    const seen = row.lastSeenAt ? new Date(row.lastSeenAt) : null;
    if (seen && (!entry.lastSeenAt || seen > entry.lastSeenAt)) entry.lastSeenAt = seen;
  }

  return byUser;
}

/** Latest activity timestamp per user from all stored records (always all-time). */
async function aggregateLastSeenByUser() {
  const [fromChats, fromConversations, fromProjects] = await Promise.all([
    Chat.aggregate([
      { $group: { _id: "$userId", lastSeenAt: { $max: "$timestamp" } } },
    ]),
    Conversation.aggregate([
      { $group: { _id: "$userId", lastSeenAt: { $max: "$updatedAt" } } },
    ]),
    Project.aggregate([
      { $group: { _id: "$userId", lastSeenAt: { $max: "$updatedAt" } } },
    ]),
  ]);

  const byUser = new Map();
  for (const batch of [fromChats, fromConversations, fromProjects]) {
    for (const row of batch) {
      const uid = String(row._id);
      const seen = row.lastSeenAt ? new Date(row.lastSeenAt) : null;
      if (!seen) continue;
      const prev = byUser.get(uid);
      if (!prev || seen > prev) byUser.set(uid, seen);
    }
  }
  return byUser;
}

async function getDatabaseTotals() {
  const [chats, conversations, projects, usersWithChats, oldestChat, newestChat] = await Promise.all([
    Chat.countDocuments(),
    Conversation.countDocuments(),
    Project.countDocuments(),
    Chat.distinct("userId"),
    Chat.findOne().sort({ timestamp: 1 }).select("timestamp").lean(),
    Chat.findOne().sort({ timestamp: -1 }).select("timestamp").lean(),
  ]);

  return {
    chats,
    conversations,
    projects,
    usersWithChats: usersWithChats.length,
    oldestChatAt: oldestChat?.timestamp || null,
    newestChatAt: newestChat?.timestamp || null,
  };
}

/**
 * @param {{ fromDate: string|null, allTime: boolean }} range
 */
async function getHistoricalUsageRows({ fromDate, allTime }) {
  const effectiveFrom = allTime ? null : fromDate;
  const toDateInclusive = utcDateKey();
  const [fromMessages, fromEmptyConversations] = await Promise.all([
    aggregateChatUsage(effectiveFrom, toDateInclusive),
    aggregateConversationUsage(effectiveFrom, toDateInclusive),
  ]);
  return [...fromMessages, ...fromEmptyConversations];
}

async function getUserActivityStats({ fromDate, allTime }) {
  const effectiveFrom = allTime ? null : fromDate;
  const toDateInclusive = utcDateKey();
  return aggregateUserActivityStats(effectiveFrom, toDateInclusive);
}

module.exports = {
  USAGE_BACKFILL_VERSION,
  utcDateKey,
  MESSAGE_TOOLS,
  getHistoricalUsageRows,
  getUserActivityStats,
  aggregateLastSeenByUser,
  getDatabaseTotals,
};
