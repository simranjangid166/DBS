const { query, queryOne, pool } = require("../config/db");
const { ok, fail } = require("../utils/http");
const { isBloodGroup, isLat, isLng } = require("../utils/validators");
const { findNearbyDonors } = require("../services/matchingService");
const { compatibleDonorsFor } = require("../services/compatibilityService");

// Full donor projection includes user fields
const DONOR_SELECT = `
  SELECT d.id, d.user_id, d.blood_group, d.age, d.gender, d.city, d.address,
         d.latitude, d.longitude, d.availability_status, d.verification_status,
         d.last_donation_date, d.total_donations, d.created_at, d.updated_at,
         u.name, u.email, u.phone
    FROM donors d
    JOIN users u ON u.id = d.user_id
`;

// GET /api/donors
async function list(req, res) {
  const { blood_group, city, verified_only, available_only } = req.query;
  const clauses = [`u.status='active'`];
  const params = [];
  if (blood_group) {
    if (!isBloodGroup(blood_group)) return fail(res, "Invalid blood_group");
    clauses.push(`d.blood_group=?`);
    params.push(blood_group);
  }
  if (city) { clauses.push(`d.city LIKE ?`); params.push(`%${city}%`); }
  if (verified_only === "true") clauses.push(`d.verification_status='verified'`);
  if (available_only === "true") clauses.push(`d.availability_status=1`);

  const rows = await query(`${DONOR_SELECT} WHERE ${clauses.join(" AND ")} ORDER BY d.total_donations DESC`, params);
  return ok(res, { data: rows });
}

// GET /api/donors/nearby
async function nearby(req, res) {
  const { latitude, longitude, blood_group, radius_km, verified_only, available_only } = req.query;
  if (!isBloodGroup(blood_group)) return fail(res, "Valid blood_group is required");
  if (latitude && !isLat(latitude)) return fail(res, "Invalid latitude");
  if (longitude && !isLng(longitude)) return fail(res, "Invalid longitude");

  const { donors, compatible_groups } = await findNearbyDonors({
    blood_group,
    latitude: latitude !== undefined ? Number(latitude) : undefined,
    longitude: longitude !== undefined ? Number(longitude) : undefined,
    radius_km: radius_km ? Number(radius_km) : 50,
    verified_only: verified_only === "true",
    available_only: available_only !== "false",
  });
  return ok(res, { data: donors, compatible_groups });
}

// GET /api/donors/:id  (supports user id or donor id)
async function getById(req, res) {
  const id = Number(req.params.id);
  const row = await queryOne(
    `${DONOR_SELECT} WHERE d.id=? OR d.user_id=? LIMIT 1`,
    [id, id]
  );
  if (!row) return fail(res, "Donor not found", 404);
  return ok(res, { data: row });
}

// PUT /api/donors/:id
async function update(req, res) {
  const id = Number(req.params.id);
  const existing = await queryOne(`SELECT * FROM donors WHERE id=? OR user_id=? LIMIT 1`, [id, id]);
  if (!existing) return fail(res, "Donor not found", 404);
  if (req.user.role !== "admin" && existing.user_id !== req.user.id) {
    return fail(res, "Forbidden", 403);
  }
  const body = req.body || {};
  if (body.blood_group && !isBloodGroup(body.blood_group)) return fail(res, "Invalid blood_group");
  if (body.latitude !== undefined && body.latitude !== null && !isLat(body.latitude)) return fail(res, "Invalid latitude");
  if (body.longitude !== undefined && body.longitude !== null && !isLng(body.longitude)) return fail(res, "Invalid longitude");

  const fields = ["blood_group", "age", "gender", "address", "city", "latitude", "longitude", "availability_status", "last_donation_date"];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f}=?`);
      params.push(body[f]);
    }
  }
  if (updates.length === 0) return ok(res, { data: existing });
  params.push(existing.id);
  await pool.execute(`UPDATE donors SET ${updates.join(", ")} WHERE id=?`, params);

  // Also update phone/name on users if provided
  const userUpdates = [];
  const userParams = [];
  if (body.name) { userUpdates.push("name=?"); userParams.push(body.name); }
  if (body.phone) { userUpdates.push("phone=?"); userParams.push(body.phone); }
  if (userUpdates.length) {
    userParams.push(existing.user_id);
    await pool.execute(`UPDATE users SET ${userUpdates.join(", ")} WHERE id=?`, userParams);
  }

  const updated = await queryOne(`${DONOR_SELECT} WHERE d.id=?`, [existing.id]);
  return ok(res, { data: updated });
}

// PATCH /api/donors/:id/availability
async function toggleAvailability(req, res) {
  const id = Number(req.params.id);
  const existing = await queryOne(`SELECT * FROM donors WHERE id=? OR user_id=? LIMIT 1`, [id, id]);
  if (!existing) return fail(res, "Donor not found", 404);
  if (req.user.role !== "admin" && existing.user_id !== req.user.id) {
    return fail(res, "Forbidden", 403);
  }
  const status = req.body?.availability_status;
  const val = status === true || status === 1 || status === "true" ? 1 : 0;
  await pool.execute(`UPDATE donors SET availability_status=? WHERE id=?`, [val, existing.id]);
  const updated = await queryOne(`${DONOR_SELECT} WHERE d.id=?`, [existing.id]);
  return ok(res, { data: updated });
}

// DELETE /api/donors/:id
async function remove(req, res) {
  const id = Number(req.params.id);
  const existing = await queryOne(`SELECT * FROM donors WHERE id=? OR user_id=? LIMIT 1`, [id, id]);
  if (!existing) return fail(res, "Donor not found", 404);
  if (req.user.role !== "admin" && existing.user_id !== req.user.id) {
    return fail(res, "Forbidden", 403);
  }
  await pool.execute(`DELETE FROM donors WHERE id=?`, [existing.id]);
  return ok(res, { deleted: true });
}

module.exports = { list, nearby, getById, update, toggleAvailability, remove };
