const { query } = require("../config/db");
const { ok, fail } = require("../utils/http");
const {
  compatibleDonorsFor, canDonateTo, isValidGroup, ALL_GROUPS,
} = require("../services/compatibilityService");
const env = require("../config/env");
const { getFcmConfigInfo } = require("../services/notificationService");

// GET /api/system/compatibility?blood_group=X
function compatibility(req, res) {
  const g = req.query.blood_group;
  if (!isValidGroup(g)) return fail(res, "Invalid blood_group");
  return ok(res, {
    data: {
      blood_group: g,
      can_receive_from: compatibleDonorsFor(g),
      can_donate_to: canDonateTo(g),
      all_groups: ALL_GROUPS,
    },
  });
}

// GET /api/system/config
function config(_req, res) {
  return ok(res, {
    data: {
      google_maps: {
        configured: !!env.googleMapsApiKey,
        api_key_public: env.googleMapsApiKey || null,
        fallback: "Leaflet + OpenStreetMap",
      },
      fcm: getFcmConfigInfo(),
      backend: { stack: "Node.js + Express + MySQL", version: "1.0.0" },
    },
  });
}

// GET /api/system/recent-requests  (public, safe fields only)
async function recentRequests(req, res) {
  const limit = Math.min(Number(req.query.limit) || 6, 20);
  const rows = await query(
    `SELECT br.id, br.blood_group, br.units_required, br.hospital_name, br.hospital_address,
            br.urgency, br.status, br.additional_message, br.created_at
       FROM blood_requests br
      WHERE br.status IN ('pending','matched','accepted')
      ORDER BY br.created_at DESC
      LIMIT ${limit}`
  );
  return ok(res, { data: rows });
}

module.exports = { compatibility, config, recentRequests };
