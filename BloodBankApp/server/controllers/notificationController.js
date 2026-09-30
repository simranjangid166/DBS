const { query, queryOne, pool } = require("../config/db");
const { ok, fail } = require("../utils/http");
const { getFcmConfigInfo } = require("../services/notificationService");

// GET /api/notifications
async function list(req, res) {
  const rows = await query(
    `SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  );
  return ok(res, { data: rows });
}

// PATCH /api/notifications/:id/read
async function markRead(req, res) {
  const [r] = await pool.execute(
    `UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?`,
    [req.params.id, req.user.id]
  );
  if (r.affectedRows === 0) return fail(res, "Notification not found", 404);
  return ok(res, { updated: true });
}

// POST /api/notifications/mark-all-read
async function markAllRead(req, res) {
  await pool.execute(`UPDATE notifications SET is_read=1 WHERE user_id=?`, [req.user.id]);
  return ok(res, { updated: true });
}

// POST /api/notifications/fcm-token  (mock)
async function registerFcmToken(_req, res) {
  return ok(res, { registered: true, mode: getFcmConfigInfo().mode });
}

// GET /api/notifications/fcm-config
async function fcmConfig(_req, res) {
  return ok(res, { data: getFcmConfigInfo() });
}

module.exports = { list, markRead, markAllRead, registerFcmToken, fcmConfig };
