const { query, queryOne, pool } = require("../config/db");
const { ok, fail } = require("../utils/http");

// POST /api/donations
async function record(req, res) {
  const b = req.body || {};
  let donorId = b.donor_id;
  if (req.user.role === "donor") {
    const donor = await queryOne(`SELECT id FROM donors WHERE user_id=?`, [req.user.id]);
    if (!donor) return fail(res, "Donor profile missing", 400);
    donorId = donor.id;
  } else if (req.user.role !== "admin") {
    return fail(res, "Forbidden", 403);
  }
  if (!donorId) return fail(res, "donor_id required");
  if (!b.donation_date) return fail(res, "donation_date required");

  const [ins] = await pool.execute(
    `INSERT INTO donation_history (donor_id, blood_request_id, donation_date, units_donated, hospital_name, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [donorId, b.blood_request_id || null, b.donation_date, Number(b.units_donated) || 1, b.hospital_name || null, b.notes || null]
  );
  await pool.execute(
    `UPDATE donors SET total_donations = total_donations + 1, last_donation_date=? WHERE id=?`,
    [b.donation_date, donorId]
  );
  const row = await queryOne(`SELECT * FROM donation_history WHERE id=?`, [ins.insertId]);
  return ok(res, { data: row }, 201);
}

// GET /api/donations
async function list(req, res) {
  if (req.user.role === "donor") {
    const donor = await queryOne(`SELECT id FROM donors WHERE user_id=?`, [req.user.id]);
    if (!donor) return ok(res, { data: [] });
    const rows = await query(`SELECT * FROM donation_history WHERE donor_id=? ORDER BY donation_date DESC`, [donor.id]);
    return ok(res, { data: rows });
  }
  const rows = await query(
    `SELECT dh.*, u.name AS donor_name, d.blood_group
       FROM donation_history dh
       JOIN donors d ON d.id=dh.donor_id
       JOIN users u ON u.id=d.user_id
      ORDER BY dh.donation_date DESC LIMIT 500`
  );
  return ok(res, { data: rows });
}

// GET /api/donations/:id
async function getById(req, res) {
  const row = await queryOne(`SELECT * FROM donation_history WHERE id=?`, [req.params.id]);
  if (!row) return fail(res, "Donation not found", 404);
  return ok(res, { data: row });
}

module.exports = { record, list, getById };
