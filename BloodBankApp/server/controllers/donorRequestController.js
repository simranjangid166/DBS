const { query, queryOne, pool } = require("../config/db");
const { ok, fail } = require("../utils/http");
const { notifyRecipientOfDonorResponse } = require("../services/notificationService");

// GET /api/donor-requests
// - donor: returns items addressed to me
// - recipient: returns responses on my requests
async function list(req, res) {
  if (req.user.role === "donor") {
    const donor = await queryOne(`SELECT id FROM donors WHERE user_id=?`, [req.user.id]);
    if (!donor) return ok(res, { data: [] });
    const rows = await query(
      `SELECT dr.*,
              br.blood_group, br.units_required, br.hospital_name, br.hospital_address,
              br.urgency, br.additional_message, br.status AS request_status, br.created_at AS request_created_at
         FROM donor_requests dr
         JOIN blood_requests br ON br.id=dr.blood_request_id
        WHERE dr.donor_id=?
        ORDER BY dr.created_at DESC`,
      [donor.id]
    );
    // Attach nested blood_request object shape used by frontend
    const withNested = rows.map((r) => ({
      id: r.id,
      donor_id: r.donor_id,
      blood_request_id: r.blood_request_id,
      response_status: r.response_status,
      responded_at: r.responded_at,
      created_at: r.created_at,
      blood_request: {
        id: r.blood_request_id,
        blood_group: r.blood_group,
        units_required: r.units_required,
        hospital_name: r.hospital_name,
        hospital_address: r.hospital_address,
        urgency: r.urgency,
        additional_message: r.additional_message,
        status: r.request_status,
        created_at: r.request_created_at,
      },
    }));
    return ok(res, { data: withNested });
  }
  if (req.user.role === "recipient") {
    const rows = await query(
      `SELECT dr.*, u.name AS donor_name, u.phone AS donor_phone, d.blood_group AS donor_blood_group,
              br.blood_group, br.hospital_name
         FROM donor_requests dr
         JOIN donors d ON d.id=dr.donor_id
         JOIN users u ON u.id=d.user_id
         JOIN blood_requests br ON br.id=dr.blood_request_id
         JOIN recipients r ON r.id=br.recipient_id
        WHERE r.user_id=?
        ORDER BY dr.created_at DESC`,
      [req.user.id]
    );
    return ok(res, { data: rows });
  }
  // admin
  const rows = await query(
    `SELECT dr.*, u.name AS donor_name, br.hospital_name, br.blood_group
       FROM donor_requests dr
       JOIN donors d ON d.id=dr.donor_id
       JOIN users u ON u.id=d.user_id
       JOIN blood_requests br ON br.id=dr.blood_request_id
      ORDER BY dr.created_at DESC LIMIT 500`
  );
  return ok(res, { data: rows });
}

// PATCH /api/donor-requests/:id
async function respond(req, res) {
  const id = Number(req.params.id);
  const status = req.body?.response_status;
  const allowed = ["accepted", "rejected", "pending", "completed"];
  if (!allowed.includes(status)) return fail(res, "Invalid response_status");
  const dr = await queryOne(
    `SELECT dr.*, d.user_id AS donor_user_id, br.recipient_id
       FROM donor_requests dr
       JOIN donors d ON d.id=dr.donor_id
       JOIN blood_requests br ON br.id=dr.blood_request_id
      WHERE dr.id=?`,
    [id]
  );
  if (!dr) return fail(res, "Donor request not found", 404);
  if (req.user.role !== "admin" && dr.donor_user_id !== req.user.id) {
    return fail(res, "Forbidden", 403);
  }
  await pool.execute(
    `UPDATE donor_requests SET response_status=?, responded_at=NOW() WHERE id=?`,
    [status, id]
  );

  // If accepted -> optionally move parent request to accepted
  if (status === "accepted") {
    await pool.execute(
      `UPDATE blood_requests SET status='accepted' WHERE id=? AND status IN ('pending','matched')`,
      [dr.blood_request_id]
    );
  }

  // Notify recipient
  const recipient = await queryOne(
    `SELECT r.user_id FROM recipients r WHERE r.id=?`,
    [dr.recipient_id]
  );
  const donorName = await queryOne(
    `SELECT u.name FROM donors d JOIN users u ON u.id=d.user_id WHERE d.id=?`,
    [dr.donor_id]
  );
  if (recipient) {
    await notifyRecipientOfDonorResponse(recipient.user_id, donorName?.name || "A donor", status, dr.blood_request_id);
  }
  return ok(res, { data: { id, response_status: status } });
}

module.exports = { list, respond };
