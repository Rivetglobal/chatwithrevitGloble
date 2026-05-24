const crypto = require("crypto");
const User = require("../models/User");
const { sendMail, buildResetEmail } = require("../utils/mailer");

const RESET_TTL_MS = 60 * 60 * 1000;
const GENERIC_RESPONSE = {
  message: "If an account with that email exists, a reset link has been sent.",
};

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function resolveAppUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const origin = req.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.get("host");
  return `${proto}://${host}`;
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || user.authProvider !== "local") {
      return res.json(GENERIC_RESPONSE);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    const resetUrl = `${resolveAppUrl(req)}/reset-password?token=${rawToken}`;
    const { html, text } = buildResetEmail({ name: user.username, resetUrl });

    try {
      await sendMail({
        to: user.email,
        toName: user.username,
        subject: "Reset your Rivet AI password",
        html,
        text,
      });
    } catch (mailErr) {
      console.error("Password reset email failed for", user.email, "-", mailErr?.message || mailErr);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
    }

    return res.json(GENERIC_RESPONSE);
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Reset link is invalid or has expired" });
    }

    user.password = password;
    user.authProvider = "local";
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false });
    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });
    res.json({ valid: !!user });
  } catch (err) {
    res.status(500).json({ valid: false });
  }
};
