const { verifyToken } = require("../utils/security");
const { queryOne } = require("../config/db");
const { fail } = require("../utils/http");

async function attachUser(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await queryOne(
      `SELECT id, name, email, phone, role, status FROM users WHERE id=?`,
      [payload.user_id]
    );
    if (user && user.status === "active") {
      req.user = user;
    }
  } catch (_e) {
    // ignore invalid tokens on public routes
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return fail(res, "Not authenticated", 401);
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, "Not authenticated", 401);
    if (!roles.includes(req.user.role)) return fail(res, "Forbidden", 403);
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };
