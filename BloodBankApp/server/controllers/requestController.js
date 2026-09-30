const { query, queryOne, pool } = require("../config/db");
const { ok, fail } = require("../utils/http");
const { isBloodGroup, isLat, isLng, isPositiveInt } = require("../utils/validators");
const { findNearbyDonors } = require("../services/matchingService");
const { notifyDonorsOfNewRequest, notifyRecipientStatusChange } = require("../services/notificationService");

const REQ_SELECT = `
  SELECT br.*, r.user_id AS recipient_user_id, u.name AS recipient_name, u.phone AS recipient_phone
    FROM blood_requests br
    JOIN recipients r ON r.id=br.recipient_id
    JOIN users u ON u.id=r.user_id`;

// POST /api/requests
async function create(req, res) {
  const b = req.body || {};
  if (!isBloodGroup(b.blood_group)) return fail(res, "Invalid blood_group");
  if (!isPositiveInt(b.units_required || 1, 20)) return fail(res, "Invalid units_required");
  if (!b.hospital_name) return fail(res, "hospital_name is required");
  if (b.latitude !== undefined && b.latitude !== null && !isLat(b.latitude)) return fail(res, "Invalid latitude");
  if (b.longitude !== undefined && b.longitude !== null && !isLng(b.longitude)) return fail(res, "Invalid longitude");

  // Must be recipient (or admin acting)
  let recipient;
  if (req.user.role === "recipient") {
    recipient = await queryOne(`SELECT * FROM recipients WHERE user_id=?`, [req.user.id]);
    if (!recipient) return fail(res, "Recipient profile missing", 400);
  } else if (req.user.role === "admin" && b.recipient_id) {
    recipient = await queryOne(`SELECT * FROM recipients WHERE id=?`, [b.recipient_id]);
    if (!recipient) return fail(res, "Recipient not found", 404);
  } else {
    return fail(res, "Only recipients can create blood requests", 403);
  }

  const [result] = await pool.execute(
    `INSERT INTO blood_requests (recipient_id,blood_group,units_required,hospital_name,hospital_address,latitude,longitude,urgency,additional_message,status)
     VALUES (?,?,?,?,?,?,?,?,?, 'pending')`,
    [
      recipient.id,
      b.blood_group,
      Number(b.units_required) || 1,
      b.hospital_name,
      b.hospital_address || null,
      b.latitude || null,
      b.longitude || null,
      b.urgency || "urgent",
      b.additional_message || null,
    ]
  );
  const bloodRequestId = result.insertId;

  // Match donors and create donor_requests + notifications
  const { donors } = await findNearbyDonors({
    blood_group: b.blood_group,
    latitude: b.latitude,
    longitude: b.longitude,
    radius_km: 100,
    available_only: true,
    verified_only: false,
  });
  for (const d of donors) {
    await pool.execute(
      `INSERT IGNORE INTO donor_requests (donor_id,blood_request_id,response_status) VALUES (?,?, 'pending')`,
      [d.id, bloodRequestId]
    );
  }
  if (donors.length) {
    await pool.execute(`UPDATE blood_requests SET status='matched' WHERE id=?`, [bloodRequestId]);
    await notifyDonorsOfNewRequest(
      { id: bloodRequestId, blood_group: b.blood_group, units_required: b.units_required || 1, hospital_name: b.hospital_name },
      donors
    );
  }

  const created = await queryOne(`${REQ_SELECT} WHERE br.id=?`, [bloodRequestId]);
  return ok(res, { data: created, matched_donors: donors.length }, 201);
}

// GET /api/requests
async function list(req, res) {
  const { status, blood_group } = req.query;
  const clauses = [];
  const params = [];
  if (req.user.role === "recipient") {
    const recipient = await queryOne(`SELECT id FROM recipients WHERE user_id=?`, [req.user.id]);
    if (!recipient) return ok(res, { data: [] });
    clauses.push(`br.recipient_id=?`); params.push(recipient.id);
  }
  if (status) { clauses.push(`br.status=?`); params.push(status); }
  if (blood_group) { clauses.push(`br.blood_group=?`); params.push(blood_group); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query(`${REQ_SELECT} ${where} ORDER BY br.created_at DESC`, params);
  return ok(res, { data: rows });
}

// GET /api/requests/:id
async function getById(req, res) {
  const row = await queryOne(`${REQ_SELECT} WHERE br.id=?`, [req.params.id]);
  if (!row) return fail(res, "Blood request not found", 404);
  const donorMatches = await query(
    `SELECT dr.*, d.blood_group, u.name AS donor_name, u.phone AS donor_phone
       FROM donor_requests dr
       JOIN donors d ON d.id=dr.donor_id
       JOIN users u ON u.id=d.user_id
      WHERE dr.blood_request_id=?
      ORDER BY dr.responded_at DESC, dr.created_at DESC`,
    [row.id]
  );
  return ok(res, { data: row, matches: donorMatches });
}

// PATCH /api/requests/:id/status
async function updateStatus(req, res) {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const allowed = ["pending", "matched", "accepted", "fulfilled", "cancelled"];
  if (!allowed.includes(status)) return fail(res, "Invalid status");
  const existing = await queryOne(`${REQ_SELECT} WHERE br.id=?`, [id]);
  if (!existing) return fail(res, "Blood request not found", 404);
  if (req.user.role !== "admin" && existing.recipient_user_id !== req.user.id) {
    return fail(res, "Forbidden", 403);
  }
  await pool.execute(`UPDATE blood_requests SET status=? WHERE id=?`, [status, id]);
  await notifyRecipientStatusChange(existing.recipient_user_id, id, status);
  const updated = await queryOne(`${REQ_SELECT} WHERE br.id=?`, [id]);
  return ok(res, { data: updated });
}

// DELETE /api/requests/:id
async function remove(req, res) {
  const id = Number(req.params.id);
  const existing = await queryOne(`${REQ_SELECT} WHERE br.id=?`, [id]);
  if (!existing) return fail(res, "Blood request not found", 404);
  if (req.user.role !== "admin" && existing.recipient_user_id !== req.user.id) {
    return fail(res, "Forbidden", 403);
  }
  await pool.execute(`DELETE FROM blood_requests WHERE id=?`, [id]);
  return ok(res, { deleted: true });
}

module.exports = { create, list, getById, updateStatus, remove };
