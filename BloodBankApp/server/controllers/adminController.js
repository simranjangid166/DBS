const { query, queryOne, pool } = require("../config/db");
const { ok, fail } = require("../utils/http");
const { init: dbInit } = require("../database/init");

// GET /api/admin/dashboard
async function dashboard(_req, res) {
  const [users, donors, recipients, verifiedDonors, active, pending, fulfilled, donations, banks] = await Promise.all([
    queryOne(`SELECT COUNT(*) AS c FROM users`),
    queryOne(`SELECT COUNT(*) AS c FROM donors`),
    queryOne(`SELECT COUNT(*) AS c FROM recipients`),
    queryOne(`SELECT COUNT(*) AS c FROM donors WHERE verification_status='verified'`),
    queryOne(`SELECT COUNT(*) AS c FROM blood_requests WHERE status IN ('pending','matched','accepted')`),
    queryOne(`SELECT COUNT(*) AS c FROM blood_requests WHERE status='pending'`),
    queryOne(`SELECT COUNT(*) AS c FROM blood_requests WHERE status='fulfilled'`),
    queryOne(`SELECT COUNT(*) AS c FROM donation_history`),
    queryOne(`SELECT COUNT(*) AS c FROM blood_banks`),
  ]);
  const bgBreakdown = await query(
    `SELECT blood_group, COUNT(*) AS c FROM donors GROUP BY blood_group`
  );
  const recentRequests = await query(
    `SELECT br.id, br.blood_group, br.urgency, br.status, br.hospital_name, br.created_at
       FROM blood_requests br ORDER BY br.created_at DESC LIMIT 8`
  );
  // Aggregate blood-bank inventory presence by group (# of banks that carry each group)
  const bbAll = await query(`SELECT available_blood_groups FROM blood_banks`);
  const inventoryTotals = { "O-":0,"O+":0,"A-":0,"A+":0,"B-":0,"B+":0,"AB-":0,"AB+":0 };
  for (const row of bbAll) {
    (row.available_blood_groups || "").split(",").forEach((g) => {
      const key = g.trim();
      if (key in inventoryTotals) inventoryTotals[key] += 1;
    });
  }
  const bgMap = { "O-":0,"O+":0,"A-":0,"A+":0,"B-":0,"B+":0,"AB-":0,"AB+":0 };
  for (const r of bgBreakdown) bgMap[r.blood_group] = r.c;

  return ok(res, {
    data: {
      // New nested shape
      totals: {
        users: users.c,
        donors: donors.c,
        recipients: recipients.c,
        verified_donors: verifiedDonors.c,
        active_requests: active.c,
        pending_requests: pending.c,
        fulfilled_requests: fulfilled.c,
        donations: donations.c,
        blood_banks: banks.c,
      },
      // Legacy flat aliases so older UI code continues to work
      total_users: users.c,
      total_donors: donors.c,
      total_recipients: recipients.c,
      verified_donors: verifiedDonors.c,
      active_requests: active.c,
      pending_requests: pending.c,
      fulfilled_requests: fulfilled.c,
      total_donations: donations.c,
      total_blood_banks: banks.c,
      donor_bg_distribution: bgMap,
      inventory_totals: inventoryTotals,
      blood_group_breakdown: bgBreakdown,
      recent_requests: recentRequests,
    },
  });
}

// GET /api/admin/users
async function listUsers(_req, res) {
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at,
            d.blood_group AS donor_blood_group, d.verification_status,
            r.blood_group AS recipient_blood_group
       FROM users u
       LEFT JOIN donors d ON d.user_id=u.id
       LEFT JOIN recipients r ON r.user_id=u.id
      ORDER BY u.created_at DESC`
  );
  return ok(res, { data: rows });
}

// PATCH /api/admin/users/:id/status
async function updateUserStatus(req, res) {
  const { status } = req.body || {};
  if (!["active", "inactive", "pending"].includes(status)) return fail(res, "Invalid status");
  const [r] = await pool.execute(`UPDATE users SET status=? WHERE id=?`, [status, req.params.id]);
  if (r.affectedRows === 0) return fail(res, "User not found", 404);
  return ok(res, { updated: true, status });
}

// PATCH /api/admin/donors/:id/verify
async function verifyDonor(req, res) {
  const { verification_status } = req.body || {};
  if (!["pending", "verified", "rejected"].includes(verification_status)) return fail(res, "Invalid verification_status");
  const [r] = await pool.execute(`UPDATE donors SET verification_status=? WHERE id=?`, [verification_status, req.params.id]);
  if (r.affectedRows === 0) return fail(res, "Donor not found", 404);
  return ok(res, { updated: true, verification_status });
}

// GET /api/admin/requests
async function listRequests(_req, res) {
  const rows = await query(
    `SELECT br.*, u.name AS recipient_name
       FROM blood_requests br
       JOIN recipients r ON r.id=br.recipient_id
       JOIN users u ON u.id=r.user_id
      ORDER BY br.created_at DESC`
  );
  return ok(res, { data: rows });
}

// GET /api/admin/donations
async function listDonations(_req, res) {
  const rows = await query(
    `SELECT dh.*, u.name AS donor_name, d.blood_group
       FROM donation_history dh
       JOIN donors d ON d.id=dh.donor_id
       JOIN users u ON u.id=d.user_id
      ORDER BY dh.donation_date DESC`
  );
  return ok(res, { data: rows });
}

// POST /api/admin/seed-reset  (dev convenience)
async function seedReset(_req, res) {
  const summary = await dbInit({ force: true });
  return ok(res, { seeded: summary });
}

module.exports = {
  dashboard, listUsers, updateUserStatus, verifyDonor, listRequests, listDonations, seedReset,
};
