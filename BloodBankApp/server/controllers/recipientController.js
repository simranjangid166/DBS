const { queryOne, pool } = require("../config/db");
const { ok, fail } = require("../utils/http");
const { isBloodGroup, isLat, isLng } = require("../utils/validators");

const SELECT = `
  SELECT r.*, u.name, u.email, u.phone
    FROM recipients r
    JOIN users u ON u.id=r.user_id`;

async function getById(req, res) {
  const id = Number(req.params.id);
  const row = await queryOne(`${SELECT} WHERE r.id=? OR r.user_id=? LIMIT 1`, [id, id]);
  if (!row) return fail(res, "Recipient not found", 404);
  return ok(res, { data: row });
}

async function update(req, res) {
  const id = Number(req.params.id);
  const existing = await queryOne(`SELECT * FROM recipients WHERE id=? OR user_id=? LIMIT 1`, [id, id]);
  if (!existing) return fail(res, "Recipient not found", 404);
  if (req.user.role !== "admin" && existing.user_id !== req.user.id) {
    return fail(res, "Forbidden", 403);
  }
  const body = req.body || {};
  if (body.blood_group && !isBloodGroup(body.blood_group)) return fail(res, "Invalid blood_group");
  if (body.latitude !== undefined && body.latitude !== null && !isLat(body.latitude)) return fail(res, "Invalid latitude");
  if (body.longitude !== undefined && body.longitude !== null && !isLng(body.longitude)) return fail(res, "Invalid longitude");

  const fields = ["blood_group", "address", "city", "latitude", "longitude"];
  const updates = []; const params = [];
  for (const f of fields) if (body[f] !== undefined) { updates.push(`${f}=?`); params.push(body[f]); }
  if (updates.length) {
    params.push(existing.id);
    await pool.execute(`UPDATE recipients SET ${updates.join(", ")} WHERE id=?`, params);
  }
  const updated = await queryOne(`${SELECT} WHERE r.id=?`, [existing.id]);
  return ok(res, { data: updated });
}

module.exports = { getById, update };
