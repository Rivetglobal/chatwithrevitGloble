const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { isBootstrapAdmin, promoteIfNeeded } = require("../utils/admins");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId, rememberMe = true) => {
  const expiresIn = rememberMe
    ? (process.env.JWT_REMEMBER_EXPIRES || "30d")
    : (process.env.JWT_EXPIRES || "1d");
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name || "",
    username: user.username,
    email: user.email,
    organisation: user.organisation || "",
    jobTitle: user.jobTitle || "",
    phone: user.phone || "",
    picture: user.picture || null,
    authProvider: user.authProvider || "local",
    isAdmin: !!user.isAdmin,
    createdAt: user.createdAt,
    hasPassword: !!user.password,
  };
}

function cleanText(value, max = 120) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

exports.register = async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 80);
    const username = cleanText(req.body?.username, 32);
    const email = cleanText(req.body?.email, 120).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const organisation = cleanText(req.body?.organisation, 120);

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: "Name, username, email, and password are required" });
    }
    if (name.length < 2) {
      return res.status(400).json({ error: "Full name must be at least 2 characters" });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: "Username must be 3–32 letters, numbers, dots, hyphens, or underscores" });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const userCount = await User.countDocuments();
    const user = User({
      name,
      username,
      email,
      password,
      organisation,
      isAdmin: userCount === 0 || isBootstrapAdmin(email),
    });
    await user.save();

    const rememberMe = req.body?.rememberMe !== false;
    const token = generateToken(user._id, rememberMe);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Server error during registration",
      details: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const rememberMe = req.body?.rememberMe !== false;
    await promoteIfNeeded(user);
    const token = generateToken(user._id, rememberMe);

    res.json({
      message: "Login successful",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: "Server error during login" });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Google credential is required" });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "Google OAuth is not configured on this server" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        user.authProvider = "google";
        user.picture = picture;
        if (!user.name && name) user.name = name;
        await user.save();
      } else {
        const baseUsername = (name || email.split("@")[0])
          .replace(/[^a-zA-Z0-9._-]/g, "")
          .toLowerCase()
          .slice(0, 28) || "user";
        let username = baseUsername;
        let suffix = 1;
        while (await User.findOne({ username })) {
          username = `${baseUsername}${suffix++}`;
        }
        user = new User({
          name: name || "",
          username,
          email,
          googleId,
          authProvider: "google",
          picture,
          password: null,
        });
        await user.save();
      }
    } else if (picture && user.picture !== picture) {
      user.picture = picture;
      if (!user.name && name) user.name = name;
      await user.save();
    }

    const rememberMe = req.body?.rememberMe !== false;
    await promoteIfNeeded(user);
    const token = generateToken(user._id, rememberMe);
    res.json({
      message: "Google login successful",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({ error: "Invalid Google credential" });
  }
};

exports.logout = async (req, res) => {
  try {
    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ error: "Server error during logout" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    await promoteIfNeeded(req.user);
    res.json({ user: toPublicUser(req.user) });
  } catch (error) {
    res.status(500).json({ error: "Server error fetching profile" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const name = cleanText(req.body?.name, 80);
    const username = cleanText(req.body?.username, 32);
    const email = cleanText(req.body?.email, 120).toLowerCase();
    const organisation = cleanText(req.body?.organisation, 120);
    const jobTitle = cleanText(req.body?.jobTitle, 80);
    const phone = cleanText(req.body?.phone, 40);

    if (!name || name.length < 2) {
      return res.status(400).json({ error: "Full name is required" });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: "Username must be 3–32 letters, numbers, dots, hyphens, or underscores" });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    if (username !== user.username) {
      const taken = await User.findOne({ username, _id: { $ne: user._id } });
      if (taken) return res.status(400).json({ error: "That username is already taken" });
      user.username = username;
    }

    const googleAccount = user.authProvider === "google" || !!user.googleId;
    if (email !== user.email) {
      if (googleAccount) {
        return res.status(400).json({ error: "Email is managed by Google for this account" });
      }
      const taken = await User.findOne({ email, _id: { $ne: user._id } });
      if (taken) return res.status(400).json({ error: "That email is already in use" });
      user.email = email;
    }

    user.name = name;
    user.organisation = organisation;
    user.jobTitle = jobTitle;
    user.phone = phone;

    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    if (newPassword) {
      if (googleAccount && !user.password) {
        return res.status(400).json({ error: "This account signs in with Google and has no password to change." });
      }
      if (!currentPassword) {
        return res.status(400).json({ error: "Enter your current password to set a new one" });
      }
      const ok = await user.comparePassword(currentPassword);
      if (!ok) return res.status(400).json({ error: "Current password is incorrect" });
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      user.password = newPassword;
      user.authProvider = "local";
    }

    await user.save();
    await promoteIfNeeded(user);
    res.json({ ok: true, user: toPublicUser(user) });
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({ error: "Server error updating profile" });
  }
};
