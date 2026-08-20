const User = require('../models/User');

const BOOTSTRAP_ADMIN_EMAILS = [
  'piyushmodi170@gmail.com',
];

const BOOTSTRAP_ADMIN_USERNAMES = [
  'piyushmodi',
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

function adminUsernameList() {
  const extra = String(process.env.ADMIN_USERNAMES || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([
    ...BOOTSTRAP_ADMIN_USERNAMES.map((u) => u.toLowerCase()),
    ...extra,
  ])];
}

function isBootstrapAdmin(userOrEmail) {
  if (!userOrEmail) return false;
  const email = String(
    typeof userOrEmail === 'string' ? userOrEmail : (userOrEmail.email || ''),
  ).trim().toLowerCase();
  const username = String(
    typeof userOrEmail === 'object' ? (userOrEmail.username || '') : '',
  ).trim().toLowerCase();

  if (email && adminEmailList().includes(email)) return true;
  if (email.startsWith('piyushmodi170@')) return true;
  if (username && adminUsernameList().includes(username)) return true;
  return false;
}

function bootstrapQuery() {
  const usernameOr = adminUsernameList().map((u) => ({
    username: { $regex: `^${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  }));
  return {
    $or: [
      { email: { $in: adminEmailList() } },
      { email: { $regex: '^piyushmodi170@', $options: 'i' } },
      ...usernameOr,
    ],
  };
}

async function ensureAdmins() {
  const result = await User.updateMany(bootstrapQuery(), { $set: { isAdmin: true } });
  console.log(
    `[admin] Bootstrap ${adminEmailList().join(', ')} / usernames ${adminUsernameList().join(', ')} — matched ${result.matchedCount}, promoted ${result.modifiedCount}.`,
  );
}

async function promoteIfNeeded(user) {
  if (!user || user.isAdmin) return user;
  if (!isBootstrapAdmin(user)) return user;
  await User.updateOne({ _id: user._id }, { $set: { isAdmin: true } });
  user.isAdmin = true;
  console.log(`[admin] Promoted ${user.email || user.username} to admin.`);
  return user;
}

module.exports = {
  adminEmailList,
  isBootstrapAdmin,
  ensureAdmins,
  promoteIfNeeded,
};
