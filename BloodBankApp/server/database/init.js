/**
 * Database bootstrap: applies schema.sql then seeds demo data.
 * Run automatically on server startup so the app is instantly usable.
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const env = require("../config/env");

const SCHEMA_FILE = path.join(__dirname, "schema.sql");

async function getRootConnection() {
  return mysql.createConnection({
    host: env.mysql.host,
    port: env.mysql.port,
    user: env.mysql.user,
    password: env.mysql.password,
    multipleStatements: true,
  });
}

async function ensureDatabase(conn) {
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.mysql.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${env.mysql.database}\``);
}

async function applySchema(conn) {
  const sql = fs.readFileSync(SCHEMA_FILE, "utf8");
  await conn.query(sql);
}

async function alreadySeeded(conn) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS c FROM users WHERE role='admin'`
  );
  return rows[0].c > 0;
}

// ---- Demo dataset ----
const DEMO_ADMIN = {
  name: "Dr. Aditi Verma",
  email: "admin@redpulse.dev",
  phone: "+1 212-555-9001",
  password: "admin@123",
};

const DEMO_DONORS = [
  { name: "John Anderson", email: "donor.john@redpulse.dev", phone: "+1 212-555-0101", bg: "O-", age: 29, gender: "Male", city: "Manhattan, NY", lat: 40.7589, lon: -73.9851, verified: "verified", available: 1, last: "2025-11-14", total: 8 },
  { name: "Priya Sharma", email: "donor.priya@redpulse.dev", phone: "+1 212-555-0102", bg: "B+", age: 26, gender: "Female", city: "Brooklyn, NY", lat: 40.6782, lon: -73.9442, verified: "verified", available: 1, last: "2025-12-04", total: 5 },
  { name: "Marcus Lee", email: "donor.marcus@redpulse.dev", phone: "+1 212-555-0103", bg: "A+", age: 33, gender: "Male", city: "Queens, NY", lat: 40.7282, lon: -73.7949, verified: "verified", available: 1, last: "2025-10-22", total: 12 },
  { name: "Sofia Rossi", email: "donor.sofia@redpulse.dev", phone: "+1 212-555-0104", bg: "AB+", age: 24, gender: "Female", city: "Bronx, NY", lat: 40.8448, lon: -73.8648, verified: "verified", available: 1, last: "2026-01-05", total: 3 },
  { name: "Kwame Osei", email: "donor.kwame@redpulse.dev", phone: "+1 212-555-0105", bg: "B-", age: 41, gender: "Male", city: "Manhattan, NY", lat: 40.7527, lon: -73.9772, verified: "verified", available: 1, last: "2025-09-11", total: 9 },
  { name: "Emily Chen", email: "donor.emily@redpulse.dev", phone: "+1 212-555-0106", bg: "O+", age: 27, gender: "Female", city: "Jersey City, NJ", lat: 40.7178, lon: -74.0431, verified: "verified", available: 1, last: "2025-12-19", total: 6 },
  { name: "Ravi Kapoor", email: "donor.ravi@redpulse.dev", phone: "+1 212-555-0107", bg: "A-", age: 35, gender: "Male", city: "Brooklyn, NY", lat: 40.6892, lon: -73.9822, verified: "pending", available: 1, last: null, total: 0 },
  { name: "Hannah Miller", email: "donor.hannah@redpulse.dev", phone: "+1 212-555-0108", bg: "AB-", age: 30, gender: "Female", city: "Manhattan, NY", lat: 40.7831, lon: -73.9712, verified: "verified", available: 0, last: "2025-11-30", total: 4 },
];

const DEMO_RECIPIENTS = [
  { name: "Mount Sinai Coordinator", email: "recipient.msh@redpulse.dev", phone: "+1 212-555-0201", bg: "B+", city: "Manhattan, NY", lat: 40.7899, lon: -73.9527, address: "1468 Madison Ave, New York, NY" },
  { name: "NY Presbyterian Desk", email: "recipient.nyp@redpulse.dev", phone: "+1 212-555-0202", bg: "O+", city: "Manhattan, NY", lat: 40.7649, lon: -73.9540, address: "525 E 68th St, New York, NY" },
];

const DEMO_BLOOD_BANKS = [
  { name: "New York Blood Center", address: "310 E 67th St, New York, NY", city: "Manhattan, NY", phone: "+1 800-933-2566", email: "info@nybc.org", lat: 40.7658, lon: -73.9601, groups: "O-,O+,A-,A+,B-,B+,AB-,AB+" },
  { name: "Mount Sinai Blood Bank", address: "1 Gustave L. Levy Pl, New York, NY", city: "Manhattan, NY", phone: "+1 212-241-6500", email: "bloodbank@mountsinai.org", lat: 40.7899, lon: -73.9527, groups: "O+,A+,B+,AB+" },
  { name: "Brooklyn Community Blood Center", address: "2005 Ralph Ave, Brooklyn, NY", city: "Brooklyn, NY", phone: "+1 718-338-3000", email: "brooklyn@bcbc.org", lat: 40.6293, lon: -73.9137, groups: "O-,O+,B+,AB+" },
  { name: "Queens Blood Services", address: "56-45 Main St, Queens, NY", city: "Queens, NY", phone: "+1 718-670-2000", email: "queens@blood.ny", lat: 40.7375, lon: -73.8210, groups: "O+,A-,A+,B+" },
  { name: "Bronx Regional Blood Center", address: "234 E 149th St, Bronx, NY", city: "Bronx, NY", phone: "+1 718-579-5000", email: "bronx@blood.ny", lat: 40.8163, lon: -73.9264, groups: "O+,A+,B-,AB+" },
];

const DEMO_REQUESTS = [
  { recipientIdx: 0, blood_group: "B+", units: 2, hospital: "Mount Sinai Hospital", address: "1468 Madison Ave, New York, NY", lat: 40.7899, lon: -73.9527, urgency: "critical", msg: "Post-operative ICU patient needs urgent B+ transfusion.", status: "matched" },
  { recipientIdx: 1, blood_group: "O+", units: 1, hospital: "NY Presbyterian", address: "525 E 68th St, New York, NY", lat: 40.7649, lon: -73.9540, urgency: "urgent", msg: "Accident trauma patient in ER-3.", status: "pending" },
  { recipientIdx: 0, blood_group: "AB+", units: 1, hospital: "Mount Sinai Hospital", address: "1468 Madison Ave, New York, NY", lat: 40.7899, lon: -73.9527, urgency: "urgent", msg: "Chemotherapy patient scheduled tomorrow.", status: "pending" },
  { recipientIdx: 1, blood_group: "A+", units: 2, hospital: "NY Presbyterian", address: "525 E 68th St, New York, NY", lat: 40.7649, lon: -73.9540, urgency: "normal", msg: "Scheduled surgery next week.", status: "fulfilled" },
];

async function seedDemoData(conn) {
  const rounds = env.bcryptRounds;
  const commonHash = await bcrypt.hash("password123", rounds);
  const adminHash = await bcrypt.hash(DEMO_ADMIN.password, rounds);

  // Admin
  const [adminRes] = await conn.query(
    `INSERT INTO users (name,email,phone,password_hash,role,status) VALUES (?,?,?,?,?,?)`,
    [DEMO_ADMIN.name, DEMO_ADMIN.email, DEMO_ADMIN.phone, adminHash, "admin", "active"]
  );

  // Donors
  const donorIds = [];
  for (const d of DEMO_DONORS) {
    const [u] = await conn.query(
      `INSERT INTO users (name,email,phone,password_hash,role,status) VALUES (?,?,?,?,?,?)`,
      [d.name, d.email, d.phone, commonHash, "donor", "active"]
    );
    const [dr] = await conn.query(
      `INSERT INTO donors (user_id,blood_group,age,gender,address,city,latitude,longitude,availability_status,last_donation_date,verification_status,total_donations)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [u.insertId, d.bg, d.age, d.gender, d.city, d.city, d.lat, d.lon, d.available, d.last, d.verified, d.total]
    );
    donorIds.push(dr.insertId);
  }

  // Recipients
  const recipientIds = [];
  for (const r of DEMO_RECIPIENTS) {
    const [u] = await conn.query(
      `INSERT INTO users (name,email,phone,password_hash,role,status) VALUES (?,?,?,?,?,?)`,
      [r.name, r.email, r.phone, commonHash, "recipient", "active"]
    );
    const [rc] = await conn.query(
      `INSERT INTO recipients (user_id,blood_group,address,city,latitude,longitude) VALUES (?,?,?,?,?,?)`,
      [u.insertId, r.bg, r.address, r.city, r.lat, r.lon]
    );
    recipientIds.push(rc.insertId);
  }

  // Blood banks
  for (const b of DEMO_BLOOD_BANKS) {
    await conn.query(
      `INSERT INTO blood_banks (name,address,city,phone,email,latitude,longitude,available_blood_groups)
       VALUES (?,?,?,?,?,?,?,?)`,
      [b.name, b.address, b.city, b.phone, b.email, b.lat, b.lon, b.groups]
    );
  }

  // Blood requests
  const requestIds = [];
  for (const rq of DEMO_REQUESTS) {
    const [r] = await conn.query(
      `INSERT INTO blood_requests (recipient_id,blood_group,units_required,hospital_name,hospital_address,latitude,longitude,urgency,additional_message,status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [recipientIds[rq.recipientIdx], rq.blood_group, rq.units, rq.hospital, rq.address, rq.lat, rq.lon, rq.urgency, rq.msg, rq.status]
    );
    requestIds.push(r.insertId);
  }

  // Donor <-> request matches for the first two requests (compatibility-based)
  // Request 0 is B+ -> compatible donors: O-, O+, B-, B+
  const compatibleForBPos = donorIds.filter((_, i) => ["O-", "O+", "B-", "B+"].includes(DEMO_DONORS[i].bg));
  for (const dId of compatibleForBPos) {
    await conn.query(
      `INSERT IGNORE INTO donor_requests (donor_id,blood_request_id,response_status) VALUES (?,?, 'pending')`,
      [dId, requestIds[0]]
    );
  }
  // Accept one donor for a nicely populated demo
  await conn.query(
    `UPDATE donor_requests SET response_status='accepted', responded_at=NOW()
     WHERE blood_request_id=? AND donor_id=? LIMIT 1`,
    [requestIds[0], compatibleForBPos[0]]
  );

  // Donation history sample
  await conn.query(
    `INSERT INTO donation_history (donor_id, blood_request_id, donation_date, units_donated, hospital_name, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [donorIds[0], requestIds[3], "2025-10-04", 1, "NY Presbyterian", "Whole blood donation - all screening passed."]
  );
  await conn.query(
    `INSERT INTO donation_history (donor_id, blood_request_id, donation_date, units_donated, hospital_name, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [donorIds[2], null, "2025-08-15", 1, "New York Blood Center", "Routine donation drive."]
  );

  // Sample notifications
  for (const dId of compatibleForBPos.slice(0, 3)) {
    const [uRow] = await conn.query(
      `SELECT user_id FROM donors WHERE id=?`, [dId]
    );
    await conn.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES (?, 'new_request', 'Urgent B+ blood requested nearby',
               'Mount Sinai Hospital needs 2 units of B+ blood. Tap to view and respond.')`,
      [uRow[0].user_id]
    );
  }

  return {
    admin_id: adminRes.insertId,
    donors: donorIds.length,
    recipients: recipientIds.length,
    requests: requestIds.length,
  };
}

async function init({ force = false } = {}) {
  const conn = await getRootConnection();
  try {
    await ensureDatabase(conn);
    if (force) {
      await applySchema(conn);
      const summary = await seedDemoData(conn);
      console.log("[db] Force-seeded database:", summary);
      return summary;
    }

    // Non-destructive path: only apply schema if users table missing.
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM information_schema.tables
       WHERE table_schema=? AND table_name='users'`,
      [env.mysql.database]
    );
    if (rows[0].c === 0) {
      console.log("[db] Fresh database - applying schema...");
      await applySchema(conn);
    }
    if (!(await alreadySeeded(conn))) {
      const summary = await seedDemoData(conn);
      console.log("[db] Seeded demo data:", summary);
      return summary;
    }
    console.log("[db] Database already seeded, skipping.");
    return { skipped: true };
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  const force = process.argv.includes("--force") || process.argv.includes("--seed");
  init({ force })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[db] init failed:", err);
      process.exit(1);
    });
}

module.exports = { init };
