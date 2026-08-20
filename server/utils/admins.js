const User = require('../models/User');

// Always-on bootstrap admins. Extra addresses can be added with ADMIN_EMAILS
// (comma/space separated) without a code change.
const BOOTSTRAP_ADMIN_EMAILS = [
  'piyushmodi170@gmail.com',
];

function adminEmailList() {
  const extra = String(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([
    ...BOOTSTRAP_ADMIN_EMAILS.map((e) => e.toLowerCase()),
    ...extra,
  ])];
}

function isBootstrapAdmin(email) {
  if (!email) return false;
  return adminEmailList().includes(String(email).trim().toLowerCase());
}

async function ensureAdmins() {
  const emails = adminEmailList();
  if (!emails.length) return;
  const result = await User.updateMany(
    { email: { $in: emails } },
    { $set: { isAdmin: true } },
  );
  console.log(
    `[admin] Bootstrap admins ${emails.join(', ')} — matched ${result.matchedCount}, promoted ${result.modifiedCount}.`,
  );
}

async function promoteIfNeeded(user) {
  if (!user || user.isAdmin) return user;
  if (!isBootstrapAdmin(user.email)) return user;
  await User.updateOne({ _id: user._id }, { $set: { isAdmin: true } });
  user.isAdmin = true;
  return user;
}

module.exports = {
  adminEmailList,
  isBootstrapAdmin,
  ensureAdmins,
  promoteIfNeeded,
};
