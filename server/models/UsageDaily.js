const mongoose = require("mongoose");

const TOOLS = ["chat", "voice", "projects", "profile", "admin"];

const usageDailySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date: { type: String, required: true, index: true },
  tool: { type: String, required: true, enum: TOOLS },
  seconds: { type: Number, default: 0, min: 0 },
  lastSeenAt: { type: Date, default: Date.now },
});

usageDailySchema.index({ userId: 1, date: 1, tool: 1 }, { unique: true });

module.exports = mongoose.model("UsageDaily", usageDailySchema);
module.exports.TOOLS = TOOLS;
