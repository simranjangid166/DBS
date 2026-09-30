const { query, queryOne, pool } = require("../config/db");
const { ok, fail } = require("../utils/http");
const { isLat, isLng } = require("../utils/validators");

// GET /api/blood-banks
async function list(req, res) {
  const { city, blood_group } = req.query;
  const clauses = []; const params = [];
  if (city) { clauses.push(`city LIKE ?`); params.push(`%${city}%`); }
  if (blood_group) { clauses.push(`FIND_IN_SET(?, available_blood_groups)`); params.push(blood_group); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query(`SELECT * FROM blood_banks ${where} ORDER BY name ASC`, params);
  return ok(res, { data: rows });
}
async function getById(req, res) {
  const row = await queryOne(`SELECT * FROM blood_banks WHERE id=?`, [req.params.id]);
  if (!row) return fail(res, "Blood bank not found", 404);
  return ok(res, { data: row });
}

async function create(req, res) {
  const b = req.body || {};
  if (!b.name) return fail(res, "name is required");
  if (b.latitude !== undefined && b.latitude !== null && !isLat(b.latitude)) return fail(res, "Invalid latitude");
  if (b.longitude !== undefined && b.longitude !== null && !isLng(b.longitude)) return fail(res, "Invalid longitude");
  const [ins] = await pool.execute(
    `INSERT INTO blood_banks (name,address,city,phone,email,latitude,longitude,available_blood_groups)
     VALUES (?,?,?,?,?,?,?,?)`,
    [b.name, b.address || null, b.city || null, b.phone || null, b.email || null, b.latitude || null, b.longitude || null, b.available_blood_groups || null]
  );
  const row = await queryOne(`SELECT * FROM blood_banks WHERE id=?`, [ins.insertId]);
  return ok(res, { data: row }, 201);
}

async function update(req, res) {
  const id = Number(req.params.id);
  const existing = await queryOne(`SELECT * FROM blood_banks WHERE id=?`, [id]);
  if (!existing) return fail(res, "Blood bank not found", 404);
  const b = req.body || {};
  const fields = ["name","address","city","phone","email","latitude","longitude","available_blood_groups"];
  const updates = []; const params = [];
  for (const f of fields) if (b[f] !== undefined) { updates.push(`${f}=?`); params.push(b[f]); }
  if (updates.length) {
    params.push(id);
    await pool.execute(`UPDATE blood_banks SET ${updates.join(", ")} WHERE id=?`, params);
  }
  const row = await queryOne(`SELECT * FROM blood_banks WHERE id=?`, [id]);
  return ok(res, { data: row });
}

async function remove(req, res) {
  await pool.execute(`DELETE FROM blood_banks WHERE id=?`, [req.params.id]);
  return ok(res, { deleted: true });
}

module.exports = { list, getById, create, update, remove };
