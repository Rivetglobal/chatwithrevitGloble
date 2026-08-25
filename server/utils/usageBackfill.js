const Chat = require("../models/Chat");
const Conversation = require("../models/Conversation");
const Project = require("../models/Project");
const { TOOLS } = require("../models/UsageDaily");

const SECONDS_PER_CHAT = 60;
const SECONDS_PER_VOICE = 120;
const SECONDS_PER_PROJECT_MSG = 90;

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function buildTimestampMatch(fromDate, toDateExclusive) {
  const match = {};
  if (fromDate || toDateExclusive) {
    match.timestamp = {};
    if (fromDate) match.timestamp.$gte = new Date(`${fromDate}T00:00:00.000Z`);
    if (toDateExclusive) match.timestamp.$lt = new Date(`${toDateExclusive}T00:00:00.000Z`);
  }
  return match;
}

/**
 * Estimate time spent from stored chat messages before live heartbeats existed.
 * Excludes today (UTC) so heartbeat totals for the current day are not doubled.
 */
async function aggregateChatUsage(fromDate, toDateExclusive) {
  const match = buildTimestampMatch(fromDate, toDateExclusive);
  const rows = await Chat.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "conversations",
        localField: "conversationId",
        foreignField: "_id",
        as: "conv",
      },
    },
    { $unwind: { path: "$conv", preserveNullAndEmptyArrays: true } },
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
              $cond: [{ $ifNull: ["$conv.projectId", false] }, "projects", "chat"],
            },
          ],
        },
        msgSeconds: {
          $cond: [
            { $eq: ["$metadata.source", "voice"] },
            SECONDS_PER_VOICE,
            {
              $cond: [
                { $ifNull: ["$conv.projectId", false] },
                SECONDS_PER_PROJECT_MSG,
                SECONDS_PER_CHAT,
              ],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: { userId: "$userId", date: "$dateKey", tool: "$tool" },
        seconds: { $sum: "$msgSeconds" },
        lastSeenAt: { $max: "$timestamp" },
      },
    },
  ]);

  return rows.map((row) => ({
    userId: row._id.userId,
    date: row._id.date,
    tool: row._id.tool,
    seconds: row.seconds,
    lastSeenAt: row.lastSeenAt,
  }));
}

/** Latest activity timestamp per user from chats, conversations, and projects. */
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

/**
 * @param {{ fromDate: string|null, allTime: boolean }} range
 * @returns {Promise<Array<{ userId, date, tool, seconds, lastSeenAt }>>}
 */
async function getHistoricalUsageRows({ fromDate, allTime }) {
  const today = utcDateKey();
  const effectiveFrom = allTime ? null : fromDate;
  return aggregateChatUsage(effectiveFrom, today);
}

function mergeHistoricalRow(into, row) {
  const uid = String(row.userId);
  let entry = into.get(uid);
  if (!entry) {
    entry = { seconds: 0, lastSeenAt: null, byTool: Object.fromEntries(TOOLS.map((t) => [t, 0])) };
    into.set(uid, entry);
  }
  if (!TOOLS.includes(row.tool)) return;
  const secs = Number(row.seconds) || 0;
  entry.byTool[row.tool] += secs;
  entry.seconds += secs;
  const seen = row.lastSeenAt ? new Date(row.lastSeenAt) : null;
  if (seen && (!entry.lastSeenAt || seen > entry.lastSeenAt)) entry.lastSeenAt = seen;
}

module.exports = {
  utcDateKey,
  getHistoricalUsageRows,
  aggregateLastSeenByUser,
  mergeHistoricalRow,
};
