const { query, queryOne } = require("../config/db");
const { ok, fail } = require("../utils/http");
const { hashPassword, comparePassword, signToken } = require("../utils/security");
const { required, isEmail, isPhone, isBloodGroup, isRole, isLat, isLng } = require("../utils/validators");

// Helper: fetch role-profile
async function getProfile(user) {
  if (!user) return null;
  if (user.role === "donor") {
    return queryOne(`SELECT * FROM donors WHERE user_id=?`, [user.id]);
  }
  if (user.role === "recipient") {
    return queryOne(`SELECT * FROM recipients WHERE user_id=?`, [user.id]);
  }
  return null;
}

function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

// POST /api/auth/register  (fully validated + transactional)
async function register(req, res) {
  const body = req.body || {};
  const missing = required(["name", "email", "password", "role"], body);
  if (missing.length) return fail(res, `Missing fields: ${missing.join(", ")}`);
  if (!isEmail(body.email)) return fail(res, "Invalid email format");
  if (!isRole(body.role) || body.role === "admin") return fail(res, "Invalid role");
  if (body.phone && !isPhone(body.phone)) return fail(res, "Invalid phone number");
  if (body.password.length < 6) return fail(res, "Password must be at least 6 characters");
  // Role-specific validation BEFORE any DB insert so we never leave orphan users
  if (!isBloodGroup(body.blood_group)) {
    return fail(res, `Valid blood_group is required for ${body.role}`);
  }
  if (body.latitude !== undefined && body.latitude !== null && !isLat(body.latitude)) {
    return fail(res, "Invalid latitude");
  }
  if (body.longitude !== undefined && body.longitude !== null && !isLng(body.longitude)) {
    return fail(res, "Invalid longitude");
  }

  const existing = await queryOne(`SELECT id FROM users WHERE email=?`, [body.email]);
  if (existing) return fail(res, "Email already registered", 409);

  const hash = await hashPassword(body.password);
  const { pool } = require("../config/db");
  const conn = await pool.getConnection();
  let userId;
  try {
    await conn.beginTransaction();
    const [userResult] = await conn.execute(
      `INSERT INTO users (name,email,phone,password_hash,role,status) VALUES (?,?,?,?,?,?)`,
      [body.name, body.email, body.phone || null, hash, body.role, "active"]
    );
    userId = userResult.insertId;

    if (body.role === "donor") {
      await conn.execute(
        `INSERT INTO donors (user_id,blood_group,age,gender,address,city,latitude,longitude,availability_status,verification_status)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          userId,
          body.blood_group,
          Number(body.age) || 25,
          body.gender || "Male",
          body.address || null,
          body.city || null,
          body.latitude || null,
          body.longitude || null,
          1,
          "pending",
        ]
      );
    } else if (body.role === "recipient") {
      await conn.execute(
        `INSERT INTO recipients (user_id,blood_group,address,city,latitude,longitude)
         VALUES (?,?,?,?,?,?)`,
        [
          userId,
          body.blood_group,
          body.address || null,
          body.city || null,
          body.latitude || null,
          body.longitude || null,
        ]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const user = await queryOne(`SELECT id,name,email,phone,role,status,created_at FROM users WHERE id=?`, [userId]);
  const profile = await getProfile(user);
  const token = signToken({ user_id: user.id, role: user.role });
  return ok(res, { token, user: publicUser(user), profile }, 201);
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return fail(res, "Email and password required");
  const row = await queryOne(`SELECT * FROM users WHERE email=?`, [email]);
  if (!row) return fail(res, "Invalid credentials", 401);
  if (row.status !== "active") return fail(res, "Account is not active", 403);
  const okPw = await comparePassword(password, row.password_hash);
  if (!okPw) return fail(res, "Invalid credentials", 401);

  const token = signToken({ user_id: row.id, role: row.role });
  const profile = await getProfile(row);
  return ok(res, { token, user: publicUser(row), profile });
}

// POST /api/auth/demo-login
async function demoLogin(req, res) {
  const role = (req.body?.role || "").toLowerCase();
  let email;
  if (role === "donor") email = "donor.john@redpulse.dev";
  else if (role === "recipient") email = "recipient.msh@redpulse.dev";
  else if (role === "admin") email = "admin@redpulse.dev";
  else return fail(res, "Invalid demo role");

  const row = await queryOne(`SELECT * FROM users WHERE email=?`, [email]);
  if (!row) return fail(res, "Demo account not seeded", 500);
  const token = signToken({ user_id: row.id, role: row.role });
  const profile = await getProfile(row);
  return ok(res, { token, user: publicUser(row), profile });
}

// POST /api/auth/logout
async function logout(_req, res) {
  return ok(res, { message: "Logged out" });
}

// GET /api/auth/me
async function me(req, res) {
  if (!req.user) return fail(res, "Not authenticated", 401);
  const profile = await getProfile(req.user);
  return ok(res, { user: publicUser(req.user), profile });
}

module.exports = { register, login, demoLogin, logout, me };
